"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useSubly } from "@/hooks/useSubly";
import { Mic, Square, LogOut, PictureInPicture2, Loader2, Clock, FileText, Trash2, ChevronDown, ChevronUp, Globe, Languages } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Transcription {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const LANGUAGES = [
  { code: "auto", name: "Sin traducción", flag: "🔤" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "Inglés", flag: "🇺🇸" },
  { code: "fr", name: "Francés", flag: "🇫🇷" },
  { code: "pt", name: "Portugués", flag: "🇧🇷" },
  { code: "de", name: "Alemán", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "ja", name: "Japonés", flag: "🇯🇵" },
  { code: "ko", name: "Coreano", flag: "🇰🇷" },
  { code: "zh", name: "Chino", flag: "🇨🇳" },
  { code: "ru", name: "Ruso", flag: "🇷🇺" },
  { code: "ar", name: "Árabe", flag: "🇸🇦" },
  { code: "hi", name: "Hindi", flag: "🇮🇳" },
];

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [history, setHistory] = useState<Transcription[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState("auto");
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const { isRecording, transcripts, audioLevel, detectedLang, startCapture, stopCapture } = useSubly({ 
    userId: user?.id,
    targetLanguage: selectedLang 
  });

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) router.push("/login");
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) router.push("/login");
    });

    return () => { authListener.subscription.unsubscribe(); };
  }, [router]);

  // Historial
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error) setHistory(data || []);
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => { if (user) loadHistory(); }, [user, loadHistory]);

  const handleStopAndSave = async () => {
    await stopCapture();
    setTimeout(() => loadHistory(), 2000);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("transcriptions").delete().eq("id", id);
    setHistory(prev => prev.filter(t => t.id !== id));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // ============================================
  // PiP: Activar automáticamente al salir de pestaña
  // ============================================
  const activatePiP = useCallback(async () => {
    if (!canvasRef.current || !videoRef.current) return;
    if (document.pictureInPictureElement) return; // Ya está activo

    try {
      const stream = canvasRef.current.captureStream(30);
      videoRef.current.srcObject = stream;
      
      await new Promise<void>((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => resolve();
          // Si ya tiene metadata, resolver
          if (videoRef.current.readyState >= 1) resolve();
        }
      });

      await videoRef.current.play();
      await videoRef.current.requestPictureInPicture();
      setIsPiPActive(true);
    } catch (err) {
      console.error("PiP error:", err);
    }
  }, []);

  // Auto-PiP cuando el usuario sale de la pestaña mientras graba
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && isRecording) {
        activatePiP();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [isRecording, activatePiP]);

  // Detectar cuando se cierra PiP
  useEffect(() => {
    const handlePiPExit = () => setIsPiPActive(false);
    
    if (videoRef.current) {
      videoRef.current.addEventListener("leavepictureinpicture", handlePiPExit);
    }
    return () => {
      videoRef.current?.removeEventListener("leavepictureinpicture", handlePiPExit);
    };
  }, []);

  // Toggle manual de PiP
  const togglePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
      setIsPiPActive(false);
    } else {
      await activatePiP();
    }
  };

  // ============================================
  // PiP Canvas render loop (subtítulos en el PiP)
  // ============================================
  useEffect(() => {
    const renderCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        // Fondo oscuro con gradiente sutil
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#020617');
        gradient.addColorStop(1, '#0a1628');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Indicadores superiores
        ctx.fillStyle = '#00ffa3';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('● SUBLY', 15, 25);

        if (isRecording) {
          ctx.fillStyle = '#ff6b6b';
          ctx.font = '12px Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText('🔴 GRABANDO', canvas.width - 15, 25);
        }

        // Idioma traducción
        const lang = LANGUAGES.find(l => l.code === selectedLang);
        if (lang && selectedLang !== "auto") {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px Inter, sans-serif';
          ctx.textAlign = 'right';
          ctx.fillText(`Traducido a: ${lang.flag} ${lang.name}`, canvas.width - 15, 45);
        }

        // Función para dividir texto en líneas que quepan en el canvas
        const maxTextWidth = canvas.width - 40;
        const wrapText = (text: string, maxWidth: number): string[] => {
          const words = text.split(' ');
          const lines: string[] = [];
          let currentLine = '';
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word;
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
              lines.push(currentLine);
              currentLine = word;
            } else {
              currentLine = testLine;
            }
          }
          if (currentLine) lines.push(currentLine);
          return lines;
        };

        // Subtítulos con word-wrap
        const lineHeight = 28;
        const visibleTranscripts = transcripts.slice(-3);
        
        // Calcular todas las líneas renderizadas
        const allRenderedLines: { text: string; isPartial: boolean }[] = [];
        visibleTranscripts.forEach((line) => {
          const isPartial = line.startsWith('⏳');
          const cleanText = line.replace('⏳ ', '');
          
          if (isPartial) {
            ctx.font = 'italic 18px Inter, sans-serif';
          } else {
            ctx.font = 'bold 20px Inter, sans-serif';
          }
          
          const wrapped = wrapText(cleanText, maxTextWidth);
          wrapped.forEach(wLine => {
            allRenderedLines.push({ text: wLine, isPartial });
          });
        });

        // Limitar a las últimas 6 líneas renderizadas para que quepan
        const maxLines = 6;
        const displayLines = allRenderedLines.slice(-maxLines);
        let startY = canvas.height - (displayLines.length * lineHeight) - 15;
        
        displayLines.forEach((item, i) => {
          if (item.isPartial) {
            ctx.fillStyle = '#64748b';
            ctx.font = 'italic 18px Inter, sans-serif';
          } else {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Inter, sans-serif';
          }
          ctx.textAlign = 'center';
          ctx.fillText(item.text, canvas.width / 2, startY + i * lineHeight);
        });

        // Barra de audio en la parte inferior
        if (isRecording) {
          const barWidth = canvas.width * Math.min(audioLevel, 1);
          const barGradient = ctx.createLinearGradient(0, 0, barWidth, 0);
          barGradient.addColorStop(0, '#00ffa3');
          barGradient.addColorStop(1, '#00cc82');
          ctx.fillStyle = barGradient;
          ctx.fillRect(0, canvas.height - 3, barWidth, 3);
        }
      }
      // Usar setInterval en lugar de requestAnimationFrame
      // porque rAF se pausa en tabs de fondo, y el PiP necesita actualizarse ahí
    };
    const intervalId = setInterval(renderCanvas, 33); // ~30fps
    renderCanvas(); // Render inmediato
    return () => clearInterval(intervalId);
  }, [transcripts, isRecording, audioLevel, selectedLang]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const currentLang = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="flex justify-between items-center p-6 border-b border-white/5 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <h1 className="text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_rgba(0,255,163,0.8)]"></div>
          Subly
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-[#b9cbbd] text-sm hidden md:inline font-medium bg-surface/30 px-3 py-1 rounded-full border border-white/5">{user.email}</span>
          <button onClick={handleLogout} className="text-gray-400 hover:text-error transition-colors p-2 hover:bg-white/5 rounded-full">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-6 max-w-5xl mx-auto w-full gap-6">
        {/* Barra de controles */}
        <div className="w-full flex flex-wrap justify-between items-center gap-4">
          <h2 className="text-xl font-display font-semibold text-white">Transmisión en Vivo</h2>
          
          <div className="flex items-center gap-3">
            {/* Selector de idioma = TRADUCIR A */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-surface/30 text-white border border-white/10 hover:border-primary/30 rounded-lg text-sm font-medium transition-all"
              >
                <Languages size={16} className="text-primary" />
                <span>Traducir: {currentLang.flag} {currentLang.name}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              
              <AnimatePresence>
                {showLangMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-[#0f1729] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[350px] overflow-y-auto custom-scrollbar"
                  >
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLang(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-primary/10 transition-colors ${
                          selectedLang === lang.code
                            ? "bg-primary/15 text-primary font-medium"
                            : "text-gray-300"
                        }`}
                      >
                        <span className="text-lg">{lang.flag}</span>
                        <span>{lang.name}</span>
                        {selectedLang === lang.code && (
                          <span className="ml-auto text-primary">✓</span>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Botón PiP manual */}
            <button
              onClick={togglePiP}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                isPiPActive 
                  ? 'bg-primary/20 text-primary border-primary shadow-[0_0_15px_rgba(0,255,163,0.3)]'
                  : 'bg-transparent text-primary border-primary hover:bg-primary/10 shadow-[0_0_10px_rgba(0,255,163,0.1)]'
              }`}
            >
              <PictureInPicture2 size={16} /> {isPiPActive ? 'PiP Activo' : 'Flotante'}
            </button>
          </div>
        </div>

        {/* Panel de Transcripción en Vivo */}
        <div className="flex-1 w-full bg-surface/15 backdrop-blur-[20px] rounded-[12px] border border-white/10 p-8 flex flex-col justify-end overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.2)] min-h-[400px]">
          {isRecording && (
            <>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse opacity-70"></div>
              <div className="absolute top-4 left-4 flex items-center gap-3">
                {/* Idioma detectado */}
                {detectedLang && (
                  <span className="text-xs bg-surface/50 text-gray-300 px-2 py-1 rounded-md border border-white/5">
                    🎤 {detectedLang.toUpperCase()}
                  </span>
                )}
                {/* Traducción activa */}
                {selectedLang !== "auto" && (
                  <span className="text-xs bg-primary/15 text-primary px-2 py-1 rounded-md border border-primary/20">
                    → {currentLang.flag} {currentLang.name}
                  </span>
                )}
                {/* Indicador de nivel de audio */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-end gap-[2px] h-4">
                    {[0.1, 0.25, 0.4, 0.55, 0.7].map((threshold, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-100 ${
                          audioLevel > threshold
                            ? audioLevel > 0.5 ? 'bg-primary' : 'bg-primary/70'
                            : 'bg-white/10'
                        }`}
                        style={{ height: `${(i + 1) * 3 + 2}px` }}
                      />
                    ))}
                  </div>
                  <span className={`text-[10px] font-medium uppercase tracking-wider ${
                    audioLevel > 0.05 ? 'text-primary' : 'text-yellow-400'
                  }`}>
                    {audioLevel > 0.05 ? 'Audio ✓' : 'Sin audio'}
                  </span>
                </div>
              </div>
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-red-400 text-xs font-medium uppercase tracking-wider">Grabando</span>
              </div>

              {/* Barra de audio inferior */}
              <div className="absolute bottom-0 left-0 w-full h-1 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-primary/30 via-primary to-primary/30 rounded-full"
                  animate={{ width: `${Math.min(audioLevel * 100, 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </>
          )}
          
          <AnimatePresence>
            {transcripts.map((t, i) => {
              const isPartial = t.startsWith('⏳');
              const displayText = t.replace('⏳ ', '');
              return (
                <motion.p
                  key={`${i}-${displayText.substring(0, 10)}`}
                  initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                  animate={{ opacity: isPartial ? 0.5 : 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(4px)" }}
                  transition={{ duration: 0.3 }}
                  className={`text-2xl md:text-4xl font-display font-semibold mb-6 text-center leading-relaxed drop-shadow-md ${
                    isPartial ? 'text-gray-400 italic text-xl md:text-2xl' : 'text-white'
                  }`}
                >
                  {displayText}
                </motion.p>
              );
            })}
          </AnimatePresence>
          
          {transcripts.length === 0 && !isRecording && (
            <div className="flex flex-col items-center justify-center h-full m-auto opacity-50">
              <Mic size={48} className="text-primary mb-4" />
              <p className="text-[#b9cbbd] font-display text-lg">Presiona iniciar para comenzar</p>
              <p className="text-gray-500 text-sm mt-2">El modo flotante se activa automáticamente al cambiar de pestaña</p>
            </div>
          )}
          {transcripts.length === 0 && isRecording && (
            <div className="flex flex-col items-center justify-center h-full m-auto opacity-50">
              <Loader2 size={36} className="text-primary mb-4 animate-spin" />
              <p className="text-[#b9cbbd] font-display text-lg">Escuchando audio...</p>
              {selectedLang !== "auto" && (
                <p className="text-primary/60 text-sm mt-2">Traduciendo a {currentLang.flag} {currentLang.name}</p>
              )}
            </div>
          )}
        </div>

        {/* Botones de control */}
        <div className="mt-2 pb-4">
          {isRecording ? (
            <button
              onClick={handleStopAndSave}
              className="flex items-center gap-3 bg-error hover:bg-[#ff8f82] text-white px-8 py-4 rounded-full font-display font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(255,180,171,0.4)]"
            >
              <Square size={20} className="fill-current" />
              DETENER Y GUARDAR
            </button>
          ) : (
            <button
              onClick={startCapture}
              className="flex items-center gap-3 bg-primary hover:bg-primary-dark text-primary-text px-8 py-4 rounded-full font-display font-bold transition-all hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(0,255,163,0.5)]"
            >
              <Mic size={20} />
              INICIAR CAPTURA
            </button>
          )}
        </div>

        {/* Historial */}
        <div className="w-full mt-4 mb-8">
          <button
            onClick={() => {
              setShowHistory(!showHistory);
              if (!showHistory) loadHistory();
            }}
            className="w-full flex items-center justify-between p-4 bg-surface/15 backdrop-blur-md rounded-xl border border-white/10 hover:border-primary/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-primary" />
              <h2 className="text-lg font-display font-semibold text-white">Historial de Traducciones</h2>
              <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-medium">
                {history.length}
              </span>
            </div>
            {showHistory ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {historyLoading && (
                    <div className="flex justify-center py-8">
                      <Loader2 className="animate-spin h-6 w-6 text-primary" />
                    </div>
                  )}
                  
                  {!historyLoading && history.length === 0 && (
                    <div className="text-center py-12 opacity-50">
                      <FileText size={40} className="mx-auto mb-3 text-gray-500" />
                      <p className="text-gray-400 font-display">No hay traducciones guardadas aún</p>
                    </div>
                  )}

                  {!historyLoading && history.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-surface/20 backdrop-blur-md rounded-xl border border-white/5 overflow-hidden hover:border-primary/20 transition-all"
                    >
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium text-sm truncate">{item.title}</h3>
                          <p className="text-gray-400 text-xs mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                          {expandedId === item.id ? (
                            <ChevronUp size={16} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={16} className="text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <AnimatePresence>
                        {expandedId === item.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 border-t border-white/5 pt-3">
                              <p className="text-[#b9cbbd] text-sm leading-relaxed whitespace-pre-wrap">
                                {item.content}
                              </p>
                              <button
                                onClick={() => navigator.clipboard.writeText(item.content)}
                                className="mt-3 text-xs text-primary hover:text-primary-dark transition-colors font-medium"
                              >
                                📋 Copiar al portapapeles
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Hidden elements for PiP */}
      <canvas ref={canvasRef} width={800} height={250} className="hidden" />
      <video ref={videoRef} autoPlay muted playsInline className="hidden" />
    </div>
  );
}
