"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useSubly } from "@/hooks/useSubly";
import { Mic, Square, LogOut, PictureInPicture2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();

  const { isRecording, transcripts, startCapture, stopCapture } = useSubly({ userId: user?.id });

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
      videoRef.current.play();
      await videoRef.current.requestPictureInPicture();
    }
  };

  // PiP render loop
  useEffect(() => {
    let animationFrameId: number;
    const renderCanvas = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.fillStyle = '#020617'; // Midnight Blue
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#00ffa3'; // Neon Mint text for PiP
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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
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
        <div className="w-full flex justify-between items-center">
          <h2 className="text-xl font-display font-semibold text-white">Transmisión en Vivo</h2>
          <button 
            onClick={togglePiP}
            className="flex items-center gap-2 px-4 py-2 bg-transparent text-primary border border-primary hover:bg-primary/10 rounded-lg text-sm font-medium transition-all shadow-[0_0_10px_rgba(0,255,163,0.1)] hover:shadow-[0_0_15px_rgba(0,255,163,0.2)]"
          >
            <PictureInPicture2 size={16} /> Modo Flotante
          </button>
        </div>

        <div className="flex-1 w-full bg-surface/15 backdrop-blur-[20px] rounded-[12px] border border-white/10 p-8 flex flex-col justify-end overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.2)] min-h-[500px]">
          {/* Decorative gradients inside container */}
          {isRecording && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse opacity-70"></div>
          )}
          
          <AnimatePresence>
            {transcripts.map((t, i) => (
              <motion.p
                key={i}
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
        </div>

        <div className="mt-4 pb-8">
          {isRecording ? (
            <button
              onClick={stopCapture}
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
      </main>

      {/* Hidden elements for PiP */}
      <canvas ref={canvasRef} width={800} height={200} className="hidden" />
      <video ref={videoRef} autoPlay muted className="hidden" />
    </div>
  );
}
