import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "ELEVENLABS_API_KEY not configured" }, { status: 500 });
    }

    // Generar un token de un solo uso para el WebSocket de Scribe Realtime
    const tokenResponse = await fetch(
      "https://api.elevenlabs.io/v1/single-use-token/realtime_scribe",
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
        },
      }
    );

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("ElevenLabs token error:", tokenResponse.status, errorText);
      return NextResponse.json(
        { error: `Failed to generate token: ${tokenResponse.status} - ${errorText}` },
        { status: tokenResponse.status }
      );
    }

    const tokenData = await tokenResponse.json();
    console.log("✅ Token generado exitosamente");

    return NextResponse.json({ token: tokenData.token });
  } catch (e: any) {
    console.error("Server error:", e);
    return NextResponse.json({ error: e.message || "Failed to generate token" }, { status: 500 });
  }
}
