import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseSublyProps {
  userId: string | undefined;
  language: string;
}

// Downsample de audio
function downsampleBuffer(buffer: Float32Array, inputRate: number, outputRate: number): Float32Array {
  if (inputRate === outputRate) return buffer;
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0, count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

// Float32 PCM -> Int16 PCM -> Base64
function float32ToBase64PCM(float32: Float32Array): string {
  const pcm16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  const bytes = new Uint8Array(pcm16.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const useSubly = ({ userId, language }: UseSublyProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const fullSessionTextRef = useRef<string>("");

  const startCapture = async () => {
    try {
      // 1. Obtener audio stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
      } catch {
        console.log("Pantalla cancelada, usando micrófono...");
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      mediaStreamRef.current = stream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        alert("No se detectó audio. Marca 'Compartir audio del sistema'.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      console.log("✅ Audio tracks:", audioTracks.length, audioTracks[0].label);

      setIsRecording(true);
      fullSessionTextRef.current = "";

      // 2. Obtener token
      console.log("🔑 Solicitando token...");
      const response = await fetch('/api/elevenlabs');
      const data = await response.json();

      if (!response.ok || !data.token) {
        console.error("❌ Token error:", data.error);
        alert("Error token: " + (data.error || "vacío"));
        setIsRecording(false);
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      console.log("✅ Token obtenido");

      // 3. WebSocket - construir URL con parámetros como el SDK oficial
      const params = new URLSearchParams();
      params.append("model_id", "scribe_v2_realtime");
      params.append("token", data.token);
      params.append("audio_format", "pcm_16000");
      if (language && language !== "auto") {
        params.append("language_code", language);
      }
      
      const wsUrl = `wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params.toString()}`;
      console.log("🔌 Conectando WebSocket...");
      socketRef.current = new WebSocket(wsUrl);

      socketRef.current.onopen = async () => {
        console.log("✅ WebSocket Conectado");
        
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        audioContextRef.current = audioContext;
        const nativeSampleRate = audioContext.sampleRate;
        console.log("🎵 Sample rate nativo:", nativeSampleRate);

        const source = audioContext.createMediaStreamSource(stream);
        
        // Analyser para nivel visual
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const checkLevel = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 128);
          animFrameRef.current = requestAnimationFrame(checkLevel);
        };
        checkLevel();

        // ScriptProcessor para capturar audio
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;
        source.connect(processor);
        processor.connect(audioContext.destination);

        processor.onaudioprocess = (e) => {
          if (socketRef.current?.readyState !== WebSocket.OPEN) return;
          
          const inputData = e.inputBuffer.getChannelData(0);
          
          // Downsample de 48kHz a 16kHz
          const downsampled = downsampleBuffer(inputData, nativeSampleRate, 16000);
          
          // Convertir a Base64
          const audioBase64 = float32ToBase64PCM(downsampled);

          // *** PROTOCOLO OFICIAL: JSON con message_type ***
          const message = JSON.stringify({
            message_type: "input_audio_chunk",
            audio_base_64: audioBase64,
            commit: false,
            sample_rate: 16000
          });
          
          socketRef.current.send(message);
        };

        console.log("🎤 Audio pipeline activo, enviando chunks...");
      };

      socketRef.current.onmessage = (event) => {
        try {
          const received = JSON.parse(event.data);
          
          switch (received.message_type) {
            case "session_started":
              console.log("🟢 Sesión iniciada:", received.session_id);
              break;
            
            case "partial_transcript":
              if (received.text?.trim()) {
                console.log("📝 [parcial]:", received.text);
                setTranscripts(prev => {
                  const updated = [...prev];
                  if (updated.length > 0) {
                    updated[updated.length - 1] = received.text;
                  } else {
                    updated.push(received.text);
                  }
                  return updated.slice(-6);
                });
              }
              break;
            
            case "committed_transcript":
              if (received.text?.trim()) {
                console.log("✅ [FINAL]:", received.text);
                setTranscripts(prev => [...prev, received.text].slice(-6));
                fullSessionTextRef.current += received.text + " ";
              }
              break;

            case "committed_transcript_with_timestamps":
              if (received.text?.trim()) {
                console.log("✅ [FINAL+TS]:", received.text);
                setTranscripts(prev => [...prev, received.text].slice(-6));
                fullSessionTextRef.current += received.text + " ";
              }
              break;

            case "insufficient_audio_activity":
              console.warn("⚠️ Actividad de audio insuficiente - ElevenLabs no detecta habla");
              break;
            
            case "input_error":
              console.warn("⚠️ Input error:", received.error);
              break;
            
            case "session_ended":
              console.log("🔴 Sesión terminada por ElevenLabs");
              break;

            default:
              console.log("📩", received.message_type, JSON.stringify(received).substring(0, 200));
          }
        } catch (e) {
          console.error("Parse error:", e);
        }
      };

      socketRef.current.onerror = (err) => {
        console.error("❌ WebSocket Error:", err);
      };

      socketRef.current.onclose = (event) => {
        console.log(`🔴 WS cerrado. Código: ${event.code}, Razón: ${event.reason || "N/A"}, Clean: ${event.wasClean}`);
      };

    } catch (err) {
      console.error("Error:", err);
      alert("Error: " + (err as Error).message);
      setIsRecording(false);
    }
  };

  const stopCapture = useCallback(async () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    analyserRef.current = null;
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      // Commit final antes de cerrar (protocolo oficial)
      socketRef.current.send(JSON.stringify({
        message_type: "input_audio_chunk",
        audio_base_64: "",
        commit: true,
        sample_rate: 16000
      }));
      // Dar un momento para recibir la transcripción final
      await new Promise(resolve => setTimeout(resolve, 500));
      socketRef.current.close(1000, "User ended session");
    }
    socketRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    setIsRecording(false);
    setAudioLevel(0);

    const textToSave = fullSessionTextRef.current.trim();
    if (userId && textToSave.length > 0) {
      console.log("💾 Guardando...", textToSave.substring(0, 100));
      const { data, error } = await supabase
        .from('transcriptions')
        .insert({
          user_id: userId,
          content: textToSave,
          title: `Sesión ${new Date().toLocaleString()}`
        })
        .select();
      
      if (error) {
        console.error("❌ Error guardando:", error);
        alert("Error al guardar: " + error.message);
      } else {
        console.log("✅ Guardado:", data);
      }
      
      fullSessionTextRef.current = "";
      setTranscripts([]);
    } else {
      console.log("⚠️ No hay texto para guardar");
    }
  }, [userId]);

  return { isRecording, transcripts, audioLevel, startCapture, stopCapture };
};
