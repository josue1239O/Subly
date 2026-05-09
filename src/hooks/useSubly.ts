import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseSublyProps {
  userId: string | undefined;
  targetLanguage: string;
}

// ============================================
// Traducir texto via nuestra API
// ============================================
async function translateText(text: string, targetLang: string): Promise<string> {
  try {
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang })
    });
    const data = await res.json();
    return data.translated || text;
  } catch {
    return text;
  }
}

export const useSubly = ({ userId, targetLanguage }: UseSublyProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcripts, setTranscripts] = useState<string[]>([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [detectedLang, setDetectedLang] = useState<string>("");
  
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const targetLangRef = useRef(targetLanguage);
  const fullSessionTextRef = useRef<string>("");

  // Mantener ref sincronizado
  useEffect(() => { targetLangRef.current = targetLanguage; }, [targetLanguage]);

  const startCapture = async () => {
    try {
      // 1. Obtener audio stream
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      } catch {
        console.log("📱 Usando micrófono...");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 }
        });
      }
      mediaStreamRef.current = stream;

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        alert("No se detectó audio. Marca 'Compartir audio del sistema'.");
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      console.log("✅ Audio:", audioTracks[0].label);

      setIsRecording(true);
      setTranscripts([]);
      fullSessionTextRef.current = "";

      // 2. Obtener token
      const tokenRes = await fetch('/api/elevenlabs');
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok || !tokenData.token) {
        alert("Error token: " + (tokenData.error || "vacío"));
        setIsRecording(false);
        stream.getTracks().forEach(t => t.stop());
        return;
      }

      // 3. Construir URL exactamente como el SDK
      const params = new URLSearchParams();
      params.append("model_id", "scribe_v2_realtime");
      params.append("token", tokenData.token);
      params.append("audio_format", "pcm_16000");

      const ws = new WebSocket(`wss://api.elevenlabs.io/v1/speech-to-text/realtime?${params.toString()}`);
      socketRef.current = ws;

      ws.onopen = async () => {
        console.log("✅ WebSocket conectado");

        // Crear AudioContext al sample rate nativo del stream
        const trackSettings = stream.getAudioTracks()[0]?.getSettings();
        const streamSampleRate = trackSettings?.sampleRate;
        const audioContext = new AudioContext(streamSampleRate ? { sampleRate: streamSampleRate } : {});
        audioContextRef.current = audioContext;

        const nativeRate = audioContext.sampleRate;
        const TARGET_RATE = 16000;
        console.log("🎵 Nativo:", nativeRate, "→ Target:", TARGET_RATE);

        // Registrar el AudioWorklet para procesar audio
        // (Inline worklet via Blob URL)
        const workletCode = `
          class SublyProcessor extends AudioWorkletProcessor {
            constructor() {
              super();
              this.buffer = [];
              this.bufferSize = 4096;
              this.inputSampleRate = null;
              this.outputSampleRate = null;
              this.resampleRatio = 1;
              this.lastSample = 0;
              this.resampleAccumulator = 0;
              
              this.port.onmessage = ({ data }) => {
                if (data.type === "configure") {
                  this.inputSampleRate = data.inputSampleRate;
                  this.outputSampleRate = data.outputSampleRate;
                  if (this.inputSampleRate && this.outputSampleRate) {
                    this.resampleRatio = this.inputSampleRate / this.outputSampleRate;
                  }
                }
              };
            }

            resample(inputData) {
              if (this.resampleRatio === 1 || !this.inputSampleRate) return inputData;
              const outputSamples = [];
              for (let i = 0; i < inputData.length; i++) {
                const currentSample = inputData[i];
                while (this.resampleAccumulator < 1) {
                  const interpolated = this.lastSample + (currentSample - this.lastSample) * this.resampleAccumulator;
                  outputSamples.push(interpolated);
                  this.resampleAccumulator += this.resampleRatio;
                }
                this.resampleAccumulator -= 1;
                this.lastSample = currentSample;
              }
              return new Float32Array(outputSamples);
            }

            process(inputs) {
              const input = inputs[0];
              if (input.length > 0) {
                let channelData = input[0];
                if (this.resampleRatio !== 1) {
                  channelData = this.resample(channelData);
                }
                for (let i = 0; i < channelData.length; i++) {
                  this.buffer.push(channelData[i]);
                }
                if (this.buffer.length >= this.bufferSize) {
                  const float32 = new Float32Array(this.buffer);
                  const int16 = new Int16Array(float32.length);
                  for (let i = 0; i < float32.length; i++) {
                    const s = Math.max(-1, Math.min(1, float32[i]));
                    int16[i] = s < 0 ? s * 32768 : s * 32767;
                  }
                  this.port.postMessage({ audioData: int16.buffer }, [int16.buffer]);
                  this.buffer = [];
                }
              }
              return true;
            }
          }
          registerProcessor("subly-processor", SublyProcessor);
        `;

        const blob = new Blob([workletCode], { type: 'application/javascript' });
        const workletUrl = URL.createObjectURL(blob);
        
        try {
          await audioContext.audioWorklet.addModule(workletUrl);
        } catch (e) {
          console.error("AudioWorklet failed, falling back...", e);
        }
        URL.revokeObjectURL(workletUrl);

        const source = audioContext.createMediaStreamSource(stream);

        // Analyser para nivel visual
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;
        source.connect(analyser);

        // Monitor de nivel de audio (usa setInterval para funcionar en background)
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        levelIntervalRef.current = setInterval(() => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 128);
        }, 100);

        // Crear AudioWorkletNode
        const workletNode = new AudioWorkletNode(audioContext, "subly-processor");
        workletNodeRef.current = workletNode;

        // Configurar resampling si es necesario
        if (nativeRate !== TARGET_RATE) {
          workletNode.port.postMessage({
            type: "configure",
            inputSampleRate: nativeRate,
            outputSampleRate: TARGET_RATE,
          });
        }

        // Recibir audio procesado del worklet y enviar al WebSocket
        workletNode.port.onmessage = (event) => {
          if (ws.readyState !== WebSocket.OPEN) return;

          const { audioData } = event.data;
          // Convertir ArrayBuffer a Base64 (exactamente como el SDK)
          const bytes = new Uint8Array(audioData);
          let binary = "";
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const audioBase64 = btoa(binary);

          // Enviar en formato protocolo oficial
          ws.send(JSON.stringify({
            message_type: "input_audio_chunk",
            audio_base_64: audioBase64,
            commit: false,
            sample_rate: TARGET_RATE,
          }));
        };

        // Conectar pipeline
        source.connect(workletNode);

        // Resumir si está suspendido
        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        console.log("🎤 Pipeline de audio activo");
      };

      // ============================================
      // Manejar mensajes del WebSocket
      // ============================================
      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);

          switch (msg.message_type) {
            case "session_started":
              console.log("🟢 Sesión:", msg.session_id);
              break;

            case "partial_transcript": {
              const text = msg.text?.trim();
              if (!text) break;
              
              const lang = targetLangRef.current;
              
              // Traducir parciales también para que sea en tiempo real
              if (lang && lang !== "auto") {
                translateText(text, lang).then(translated => {
                  setTranscripts(prev => {
                    const updated = [...prev];
                    // Reemplazar última entrada parcial
                    if (updated.length > 0 && updated[updated.length - 1].startsWith('⏳')) {
                      updated[updated.length - 1] = `⏳ ${translated}`;
                    } else {
                      updated.push(`⏳ ${translated}`);
                    }
                    return updated.slice(-6);
                  });
                });
              } else {
                setTranscripts(prev => {
                  const updated = [...prev];
                  if (updated.length > 0 && updated[updated.length - 1].startsWith('⏳')) {
                    updated[updated.length - 1] = `⏳ ${text}`;
                  } else {
                    updated.push(`⏳ ${text}`);
                  }
                  return updated.slice(-6);
                });
              }
              break;
            }

            case "committed_transcript":
            case "committed_transcript_with_timestamps": {
              const text = msg.text?.trim();
              if (!text) break;
              console.log("✅ Final:", text);

              if (msg.language) setDetectedLang(msg.language);

              const lang = targetLangRef.current;
              if (lang && lang !== "auto") {
                const translated = await translateText(text, lang);
                console.log("🌐 Traducido:", translated);
                setTranscripts(prev => {
                  // Reemplazar la última entrada parcial con la final traducida
                  const cleaned = prev.filter(t => !t.startsWith('⏳'));
                  return [...cleaned, translated].slice(-6);
                });
                fullSessionTextRef.current += translated + "\n";
              } else {
                setTranscripts(prev => {
                  const cleaned = prev.filter(t => !t.startsWith('⏳'));
                  return [...cleaned, text].slice(-6);
                });
                fullSessionTextRef.current += text + "\n";
              }
              break;
            }

            case "insufficient_audio_activity":
              console.warn("⚠️ Sin habla detectada");
              break;

            case "input_error":
              console.warn("⚠️", msg.error);
              break;

            default:
              console.log("📩", msg.message_type);
          }
        } catch (e) {
          console.error("Parse error:", e);
        }
      };

      ws.onerror = () => console.error("❌ WebSocket error");
      ws.onclose = (ev) => console.log(`🔴 WS cerrado: ${ev.code}`);

    } catch (err) {
      console.error("Error:", err);
      alert("Error: " + (err as Error).message);
      setIsRecording(false);
    }
  };

  const stopCapture = useCallback(async () => {
    // Limpiar nivel de audio
    if (levelIntervalRef.current) {
      clearInterval(levelIntervalRef.current);
      levelIntervalRef.current = null;
    }
    // Desconectar worklet
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    analyserRef.current = null;
    // Commit final y cerrar WS
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        message_type: "input_audio_chunk",
        audio_base_64: "",
        commit: true,
        sample_rate: 16000
      }));
      await new Promise(r => setTimeout(r, 1000));
      socketRef.current.close(1000, "User ended session");
    }
    socketRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }

    setIsRecording(false);
    setAudioLevel(0);

    // Guardar en Supabase
    const text = fullSessionTextRef.current.trim();
    if (userId && text.length > 0) {
      console.log("💾 Guardando...");
      const { error } = await supabase
        .from('transcriptions')
        .insert({ user_id: userId, content: text, title: `Sesión ${new Date().toLocaleString()}` })
        .select();
      if (error) console.error("❌", error);
      else console.log("✅ Guardado");
      fullSessionTextRef.current = "";
      setTranscripts([]);
    }
  }, [userId]);

  return { isRecording, transcripts, audioLevel, detectedLang, startCapture, stopCapture };
};
