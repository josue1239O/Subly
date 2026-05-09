import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
    }

    // Devolvemos la API Key de forma segura desde el servidor.
    // El frontend nunca la tiene hardcodeada, solo la obtiene vía esta ruta.
    return NextResponse.json({ token: apiKey });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to generate token" }, { status: 500 });
  }
}
