"use client";

import { useState, useCallback } from "react";
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Heart, Wallet, CheckCircle, XCircle, Loader2, X } from "lucide-react";

// ============================================
// Dirección de donación (tu wallet de Solana)
// Cambia esto por tu wallet real
// ============================================
const DONATION_WALLET = "boivwFGy1d34KzbhV5e8AFBX6F1agy1gtqohPKfQEYj"; // ← Reemplaza con tu wallet real

const DONATION_AMOUNTS = [0.01, 0.05, 0.1, 0.5, 1];

const SOLANA_RPC = "https://api.devnet.solana.com"; // Cambia a mainnet-beta para producción

type DonationStatus = "idle" | "connecting" | "sending" | "success" | "error";

export default function DonateButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState(0.05);
  const [customAmount, setCustomAmount] = useState("");
  const [status, setStatus] = useState<DonationStatus>("idle");
  const [txSignature, setTxSignature] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const getProvider = useCallback(() => {
    if (typeof window !== "undefined" && "solana" in window) {
      const provider = (window as any).solana;
      if (provider?.isPhantom) return provider;
    }
    return null;
  }, []);

  const handleDonate = async () => {
    const provider = getProvider();
    if (!provider) {
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      setStatus("connecting");
      setErrorMsg("");

      // Conectar Phantom
      const resp = await provider.connect();
      const senderPubKey = resp.publicKey;
      setWalletAddress(senderPubKey.toString().slice(0, 4) + "..." + senderPubKey.toString().slice(-4));

      setStatus("sending");

      const finalAmount = customAmount ? parseFloat(customAmount) : amount;
      if (isNaN(finalAmount) || finalAmount <= 0) {
        throw new Error("Monto inválido");
      }

      // Crear transacción
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const recipientPubKey = new PublicKey(DONATION_WALLET);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderPubKey,
          toPubkey: recipientPubKey,
          lamports: Math.round(finalAmount * LAMPORTS_PER_SOL),
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = senderPubKey;

      // Firmar y enviar
      const signed = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature, "confirmed");

      setTxSignature(signature);
      setStatus("success");
    } catch (err: any) {
      console.error("Donation error:", err);
      setErrorMsg(err?.message || "Error al procesar la donación");
      setStatus("error");
    }
  };

  const resetState = () => {
    setStatus("idle");
    setTxSignature("");
    setErrorMsg("");
    setCustomAmount("");
  };

  return (
    <>
      {/* Botón flotante de donación */}
      <button
        onClick={() => { setIsOpen(true); resetState(); }}
        className="fixed bottom-8 right-8 z-50 group flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] hover:-translate-y-1 transition-all duration-300 border border-purple-400/30"
      >
        <Heart size={20} className="group-hover:scale-110 transition-transform fill-white/20" />
        <span className="font-semibold text-sm">Donar SOL</span>
      </button>

      {/* Modal de donación */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-[#0B0B14]/95 backdrop-blur-3xl border border-white/10 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_30px_rgba(139,92,246,0.15)] overflow-hidden">
            {/* Header glow */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400" />

            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all"
            >
              <X size={18} />
            </button>

            <div className="p-8">
              {/* Logo */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Heart size={24} className="text-white fill-white/30" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Apoya Subly</h3>
                  <p className="text-sm text-gray-400">Dona SOL vía Solana</p>
                </div>
              </div>

              {status === "idle" && (
                <>
                  {/* Montos predefinidos */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-400 mb-3">Selecciona un monto (SOL)</p>
                    <div className="grid grid-cols-5 gap-2">
                      {DONATION_AMOUNTS.map((a) => (
                        <button
                          key={a}
                          onClick={() => { setAmount(a); setCustomAmount(""); }}
                          className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${amount === a && !customAmount
                              ? "bg-purple-500/30 text-purple-300 border border-purple-400/50 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                              : "bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:border-white/20"
                            }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Monto personalizado */}
                  <div className="mb-6">
                    <input
                      type="number"
                      placeholder="O escribe un monto personalizado..."
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      step="0.01"
                      min="0.001"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-400/50 focus:ring-1 focus:ring-purple-400/20 transition-all text-sm"
                    />
                  </div>

                  {/* Botón de donar */}
                  <button
                    onClick={handleDonate}
                    className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-2xl font-bold transition-all hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Wallet size={20} />
                    Donar {customAmount || amount} SOL con Phantom
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    Se abrirá tu wallet Phantom para confirmar
                  </p>
                </>
              )}

              {status === "connecting" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <Loader2 size={40} className="text-purple-400 animate-spin" />
                  <p className="text-gray-300 font-medium">Conectando Phantom...</p>
                </div>
              )}

              {status === "sending" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <Loader2 size={40} className="text-indigo-400 animate-spin" />
                  <p className="text-gray-300 font-medium">Enviando {customAmount || amount} SOL...</p>
                  {walletAddress && (
                    <p className="text-xs text-gray-500">Desde: {walletAddress}</p>
                  )}
                </div>
              )}

              {status === "success" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle size={36} className="text-green-400" />
                  </div>
                  <p className="text-green-300 font-bold text-lg">¡Gracias por tu donación!</p>
                  <p className="text-gray-400 text-sm text-center">
                    {customAmount || amount} SOL enviados correctamente
                  </p>
                  {txSignature && (
                    <a
                      href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-purple-400 hover:text-purple-300 underline transition-colors"
                    >
                      Ver transacción en Solana Explorer ↗
                    </a>
                  )}
                  <button
                    onClick={() => { resetState(); setIsOpen(false); }}
                    className="mt-2 px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all text-sm"
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {status === "error" && (
                <div className="flex flex-col items-center py-8 gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle size={36} className="text-red-400" />
                  </div>
                  <p className="text-red-300 font-bold">Error en la donación</p>
                  <p className="text-gray-400 text-sm text-center">{errorMsg}</p>
                  <button
                    onClick={resetState}
                    className="mt-2 px-6 py-2 bg-white/10 text-white rounded-xl hover:bg-white/20 transition-all text-sm"
                  >
                    Intentar de nuevo
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between">
              <span className="text-xs text-gray-500">Powered by Solana</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-gray-500">Devnet</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
