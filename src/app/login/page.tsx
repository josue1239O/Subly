"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Mail, CheckCircle } from "lucide-react";

type AuthMode = "login" | "register" | "forgot";

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      } else if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        // Optionally, inform user to check email or redirect directly if auto-confirm is enabled
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: any) {
      setError(err.message || "Error al enviar el correo de recuperación.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setResetSent(false);
  };

  const getTitle = () => {
    switch (mode) {
      case "login": return "Inicia sesión en Subly";
      case "register": return "Crea tu cuenta en Subly";
      case "forgot": return "Recupera tu contraseña";
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[var(--background)]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Subly"
            className="h-16 w-16 rounded-2xl object-contain shadow-[0_0_30px_rgba(0,255,163,0.3)]"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--foreground)] font-display tracking-tight">
          {getTitle()}
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--foreground)]/70">
          {mode === "login" && (
            <>
              ¿No tienes cuenta?{" "}
              <button
                onClick={() => switchMode("register")}
                className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
              >
                Regístrate aquí
              </button>
            </>
          )}
          {mode === "register" && (
            <>
              ¿Ya tienes cuenta?{" "}
              <button
                onClick={() => switchMode("login")}
                className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
              >
                Inicia sesión
              </button>
            </>
          )}
          {mode === "forgot" && (
            <>
              ¿Recordaste tu contraseña?{" "}
              <button
                onClick={() => switchMode("login")}
                className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-dark)] transition-colors"
              >
                Volver al login
              </button>
            </>
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--color-surface)] py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/5">

          {/* Forgot Password - Success State */}
          {mode === "forgot" && resetSent ? (
            <div className="flex flex-col items-center py-4 gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle size={36} className="text-green-400" />
              </div>
              <p className="text-green-300 font-bold text-lg text-center">¡Correo enviado!</p>
              <p className="text-gray-400 text-sm text-center leading-relaxed">
                Revisa tu bandeja de entrada en <span className="text-white font-medium">{email}</span> y sigue las instrucciones para restablecer tu contraseña.
              </p>
              <button
                onClick={() => switchMode("login")}
                className="mt-2 w-full flex justify-center py-3 px-4 rounded-xl text-sm font-medium text-white bg-white/10 hover:bg-white/20 transition-all"
              >
                Volver al inicio de sesión
              </button>
            </div>
          ) : mode === "forgot" ? (
            /* Forgot Password - Form */
            <form className="space-y-6" onSubmit={handleForgotPassword}>
              <p className="text-sm text-gray-400 leading-relaxed">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--foreground)]/90"
                >
                  Correo electrónico
                </label>
                <div className="mt-1 relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 pr-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all sm:text-sm"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
                  <h3 className="text-sm font-medium text-red-400">{error}</h3>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-[var(--color-primary-text)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  <>
                    Enviar enlace de recuperación
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Login / Register Form */
            <form className="space-y-6" onSubmit={handleAuth}>
              {mode === "register" && (
                <div>
                  <label
                    htmlFor="fullName"
                    className="block text-sm font-medium text-[var(--foreground)]/90"
                  >
                    Nombre completo
                  </label>
                  <div className="mt-1">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all sm:text-sm"
                      placeholder="Juan Pérez"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-[var(--foreground)]/90"
                >
                  Correo electrónico
                </label>
                <div className="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all sm:text-sm"
                    placeholder="tu@correo.com"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--foreground)]/90"
                >
                  Contraseña
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2.5 border border-white/10 rounded-xl bg-black/20 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Forgot password link - solo en login */}
              {mode === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-sm text-[var(--color-primary)]/70 hover:text-[var(--color-primary)] transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-500/10 p-4 border border-red-500/20">
                  <div className="flex">
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-400">{error}</h3>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-[var(--color-primary-text)] bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] focus:ring-offset-[var(--background)] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
