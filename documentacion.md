# Prompt Maestro: Proyecto "Subly" (Subtítulos en Tiempo Real)

**Contexto y Rol:**
Actúa como un Expert Full-Stack Developer especializado en Next.js, Web Audio API y WebSockets. Tu objetivo es generar todo el código funcional, paso a paso, para un proyecto llamado "Subly". Entrégame todos los archivos, comandos de instalación y la estructura del proyecto listos para funcionar.

**Descripción del Proyecto:**
"Subly" es una aplicación web que captura el audio del sistema o pestaña (a través de `getDisplayMedia`), lo envía en tiempo real a una API de reconocimiento de voz (ASR, usaremos Deepgram), y renderiza los subtítulos obtenidos en una interfaz limpia y oscura. Además, cuenta con un "Modo Flotante" (Picture-in-Picture) que permite ver los subtítulos por encima de otras aplicaciones (como Zoom, Teams o Meet).

---

### 🛠️ Stack Tecnológico Requerido
*   **Framework:** Next.js 14+ (App Router).
*   **Lenguaje:** TypeScript (Tipado estricto para eventos de audio y webSockets).
*   **Estilos:** Tailwind CSS.
*   **Iconos y Animaciones:** `lucide-react`, `framer-motion` (para transiciones suaves del texto).
*   **Audio y Streaming:** Web Audio API, `getDisplayMedia`.
*   **Transcripción IA:** ElevenLabs SDK (Real-time streaming WebSocket).
*   **Backend y Base de Datos:** Supabase (Auth y PostgreSQL).

---

### 📋 Requerimientos Técnicos y Funcionales a Implementar

**1. Configuración e Interfaz Base:**
*   Proporciona el comando de instalación inicial (`npx create-next-app...` con los flags necesarios).
*   Crea una interfaz de usuario ("UI") minimalista, estilo consola oscura, enfocada únicamente en los controles de inicio/parada y la zona de lectura.

**2. Motor de Captura de Audio (El Core):**
*   Crea un custom hook (ej. `useAudioCapture`) que invoque `navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })`.
*   Aíla únicamente el `audio track` del stream obtenido.
*   Usa `AudioContext` para procesar el stream en fragmentos (chunks) y enviarlos por WebSockets.
*   *Gestión de Memoria:* Implementa el cierre de los tracks de audio y desconexión de websockets de forma limpia al detener la transcripción para evitar fugas de memoria y alto consumo de CPU.

**3. Integración con IA en Tiempo Real (ElevenLabs):**
*   Crea un Route Handler en Next.js (ej. `app/api/elevenlabs/route.ts`) que genere un Token Temporal de ElevenLabs para proteger la API Key real del frontend.
*   Implementa el cliente WebSocket en el frontend para conectarse a ElevenLabs usando ese token temporal, asegurando una latencia menor a 300ms.

**4. Visualización y "Modo Flotante" (Picture-in-Picture):**
*   **Algoritmo de limpieza:** Mantén en la pantalla principal únicamente las últimas 3-4 líneas de subtítulos activos para no saturar visualmente.
*   **El Truco del PiP:** Implementa la lógica para renderizar los subtítulos en un elemento `<canvas>` oculto, convierte ese canvas en un stream de video (`canvas.captureStream()`), asígnalo a un elemento `<video>` invisible y activa `video.requestPictureInPicture()`. Esto hará que los subtítulos floten por encima de todo el sistema operativo.

**5. Autenticación y Login:**
*   Implementa un sistema de autenticación utilizando **Supabase Auth** (Login, Registro y Cierre de Sesión).
*   Protege la ruta de transcripción para que solo usuarios logueados puedan acceder a la aplicación.

**6. Almacenamiento de Traducciones:**
*   Conecta la aplicación a **Supabase Database (PostgreSQL)**.
*   Al finalizar una sesión de captura, el texto completo de los subtítulos transcritos/traducidos debe guardarse en la base de datos (con un formato equivalente a un `.txt`, es decir, un registro de texto completo asociado al usuario) para que quede guardado el historial.

---

### 🎯 Instrucción Final para la IA (Tú)
Por favor, a partir de este momento, genera el código completo del proyecto. Necesito:
1.  La estructura de carpetas que debo seguir.
2.  Los comandos de instalación de las dependencias.
3.  El código de `app/page.tsx` (UI principal).
4.  El código del hook de captura y sockets (ej. `hooks/useSubly.ts`).
5.  El código de la API Route (`app/api/elevenlabs/route.ts`).
6.  Cualquier otro componente necesario (ej. Componente PiP).
7.  La configuración y componentes para el Login/Autenticación con Supabase.
8.  La lógica de base de datos para almacenar el texto completo (txt) de las transcripciones al finalizar cada sesión.

Escribe el código completo, sin omitir partes clave, para que solo tenga que copiar, pegar y ejecutar.
