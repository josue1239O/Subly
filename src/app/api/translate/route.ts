import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text, targetLang, sourceLang } = await request.json();

    if (!text || !targetLang) {
      return NextResponse.json({ error: "Missing text or targetLang" }, { status: 400 });
    }

    const sl = sourceLang || "auto";

    // Intentar Google Translate primero
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const translated = data[0]?.map((item: any) => item[0]).join("") || text;
        const detectedLang = data[2] || sl;
        return NextResponse.json({ translated, detectedLang });
      }
    } catch (e) {
      console.error("Google Translate error:", e);
    }

    // Fallback: MyMemory API (gratuita, sin key)
    try {
      const langPair = `${sl}|${targetLang}`;
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langPair}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.responseStatus === 200 && data.responseData?.translatedText) {
          return NextResponse.json({ 
            translated: data.responseData.translatedText, 
            detectedLang: sl 
          });
        }
      }
    } catch (e) {
      console.error("MyMemory error:", e);
    }

    // Si todo falla, devolver el original
    return NextResponse.json({ translated: text, detectedLang: sl });

  } catch (e: any) {
    console.error("Translation route error:", e);
    return NextResponse.json({ translated: "", error: e.message }, { status: 500 });
  }
}
