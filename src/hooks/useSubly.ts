import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseSublyProps {
  userId: string | undefined;
}

export const useSubly = ({ userId }: UseSublyProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const fullSessionTextRef = useRef<string>("");

  const startCapture = async () => {
    try {
      // 1. Get audio stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      mediaStreamRef.current = stream;

      // 2. Get ElevenLabs temporary token
      const response = await fetch('/api/elevenlabs');
      const { token } = await response.json();

      if (!token) throw new Error("Could not get ElevenLabs token");

      // 3. Connect to ElevenLabs WebSocket
      // ElevenLabs Realtime STT WebSocket endpoint
      let wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text?token=${token}&model=scribe_v2_realtime`;
      // If token happens to be the real API key (fallback), some websocket APIs require it in query params if headers aren't allowed
      // ElevenLabs generally accepts ?xi-api-key= as well, but token is safer. Let's use both just in case.
      if (token.startsWith("sk_")) {
         wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text?xi-api-key=${token}&model=scribe_v2_realtime`;
      }
      
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = () => {
        setIsRecording(true);
        // Start processing audio
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            
            // Convert to 16-bit PCM
            const pcmData = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              pcmData[i] = inputData[i] * 0x7FFF;
            }
            
            // Convert PCM to base64 for ElevenLabs
            const bytes = new Uint8Array(pcmData.buffer);
            let binary = '';
            // Chunking it to avoid max call stack size
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
              binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
            }
            const base64Data = btoa(binary);

            // Send payload formatted for ElevenLabs
            socketRef.current.send(JSON.stringify({
              user_audio_chunk: base64Data
            }));
          }
        };
      };

      socketRef.current.onmessage = (message) => {
        const received = JSON.parse(message.data);
        // ElevenLabs Scribe event format typically contains 'text' or 'transcript'
        const transcript = received.text || received.transcript || (received.channel?.alternatives[0]?.transcript);
        
        if (transcript && transcript.trim() !== "") {
          setTranscripts(prev => {
            const newTranscripts = [...prev, transcript].slice(-4); // Keep last 4 lines for PIP/UI
            return newTranscripts;
          });
          // Add to full session string for saving
          fullSessionTextRef.current += transcript + " ";
        }
      };

      socketRef.current.onerror = (err) => {
        console.error("ElevenLabs WebSocket Error:", err);
      };

    } catch (err) {
      console.error("Error starting capture:", err);
    }
  };

  const stopCapture = useCallback(async () => {
    // 1. Close WebSockets & Streams
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsRecording(false);

    // 2. Save full text to Supabase database
    if (userId && fullSessionTextRef.current.trim().length > 0) {
      const textToSave = fullSessionTextRef.current.trim();
      const { error } = await supabase
        .from('transcriptions')
        .insert({
          user_id: userId,
          content: textToSave,
          title: `Sesión de Captura ${new Date().toLocaleString()}`
        });
      
      if (error) {
        console.error("Error saving transcription:", error);
      } else {
        console.log("Transcription saved successfully.");
      }
      
      // Reset full text
      fullSessionTextRef.current = "";
      setTranscripts([]);
    }
  }, [userId]);

  return { isRecording, transcripts, startCapture, stopCapture };
};
