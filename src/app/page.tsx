"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useSubly } from "@/hooks/useSubly";
import { Mic, Square, LogOut, PictureInPicture2, Loader2, Clock, FileText, Trash2, ChevronDown, ChevronUp, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface Transcription {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

const LANGUAGES = [
  { code: "auto", name: "Auto-detectar", flag: "🌐" },
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const { isRecording, transcripts, audioLevel, startCapture, stopCapture } = useSubly({ 
    userId: user?.id,
    language: selectedLang 
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (!session?.user) {
        router.push("/login");
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        router.push("/login");
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  // Cargar historial
  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("transcriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error cargando historial:", error);
    } else {
      setHistory(data || []);
    }
    setHistoryLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) loadHistory();
  }, [user, loadHistory]);

  const handleStopAndSave = async () => {
    await stopCapture();
    setTimeout(() => loadHistory(), 1500);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("transcriptions")
      .delete()
      .eq("id", id);
    
    if (error) {
      console.error("Error eliminando:", error);
    } else {
      setHistory(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const togglePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current && canvasRef.current) {
      const stream = canvasRef.current.captureStream(30);
      videoRef.current.srcObject = stream;
      
      videoRef.current.onloadedmetadata = async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.play();
            await videoRef.current.requestPictureInPicture();
          }
        } catch (err) {
          console.error("Error al activar PiP:", err);
        }
      };
    }
  };

  // PiP render loop
  useEffect(() => {
    let animationFrameId: number;
    const renderCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ffa3';
        ctx.font = 'bold 24px Montserrat, sans-serif';
        ctx.textAlign = 'center';
        
        const lineHeight = 30;
        let startY = canvas.height - (transcripts.length * lineHeight) - 10;
        
        transcripts.forEach((line) => {
          ctx.fillText(line, canvas.width / 2, startY);
          startY += lineHeight;
        });
      }
      animationFrameId = requestAnimationFrame(renderCanvas);
    };
    renderCanvas();
    return () => cancelAnimationFrame(animationFrameId);
  }, [transcripts]);

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
        {/* Barra de controles superior */}
        <div className="w-full flex flex-wrap justify-between items-center gap-4">
          <h2 className="text-xl font-display font-semibold text-white">Transmisión en Vivo</h2>
          
          <div className="flex items-center gap-3">
            {/* Selector de Idioma */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                disabled={isRecording}
                className="flex items-center gap-2 px-4 py-2 bg-surface/30 text-white border border-white/10 hover:border-primary/30 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Globe size={16} className="text-primary" />
                <span>{currentLang.flag} {currentLang.name}</span>
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

            {/* Botón PiP */}
            <button
              onClick={togglePiP}
              className="flex items-center gap-2 px-4 py-2 bg-transparent text-primary border border-primary hover:bg-primary/10 rounded-lg text-sm font-medium transition-all shadow-[0_0_10px_rgba(0,255,163,0.1)] hover:shadow-[0_0_15px_rgba(0,255,163,0.2)]"
            >
              <PictureInPicture2 size={16} /> Flotante
            </button>
          </div>
        </div>

        {/* Panel de Transcripción en Vivo */}
        <div className="flex-1 w-full bg-surface/15 backdrop-blur-[20px] rounded-[12px] border border-white/10 p-8 flex flex-col justify-end overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.2)] min-h-[400px]">
          {isRecording && (
            <>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse opacity-70"></div>
              <div className="absolute top-4 left-4 flex items-center gap-3">
                <span className="text-xs bg-surface/50 text-gray-300 px-2 py-1 rounded-md border border-white/5">
                  {currentLang.flag} {currentLang.name}
                </span>
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
            </>
          )}
          
          <AnimatePresence>
            {transcripts.map((t, i) => (
              <motion.p
                key={`${i}-${t.substring(0, 10)}`}
                initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="text-2xl md:text-4xl font-display font-semibold text-white mb-6 text-center leading-relaxed drop-shadow-md"
              >
                {t}
              </motion.p>
            ))}
          </AnimatePresence>
          
          {transcripts.length === 0 && !isRecording && (
            <div className="flex flex-col items-center justify-center h-full m-auto opacity-50">
              <Mic size={48} className="text-primary mb-4" />
              <p className="text-[#b9cbbd] font-display text-lg">Presiona iniciar para comenzar a transcribir...</p>
            </div>
          )}
          {transcripts.length === 0 && isRecording && (
            <div className="flex flex-col items-center justify-center h-full m-auto opacity-50">
              <Loader2 size={36} className="text-primary mb-4 animate-spin" />
              <p className="text-[#b9cbbd] font-display text-lg">Escuchando audio...</p>
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

        {/* Sección de Historial */}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(item.id);
                            }}
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
      <canvas ref={canvasRef} width={800} height={200} className="hidden" />
      <video ref={videoRef} autoPlay muted className="hidden" />
    </div>
  );
}
