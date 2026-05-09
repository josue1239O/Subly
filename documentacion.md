# 🎯 SUBLY — Subtítulos y Traducción en Tiempo Real

> **Hackathon 2026** — Accesibilidad e Inteligencia Artificial

---

## 1. Problemática

### 1.1 Contexto del Problema

En un mundo cada vez más globalizado y digital, millones de personas participan diariamente en videoconferencias, clases en línea, webinars y contenido multimedia en idiomas que no dominan. Según la UNESCO, más de **7,000 idiomas** se hablan en el mundo, pero las herramientas de comunicación digital están diseñadas predominantemente para hablantes de inglés. Esto genera una **brecha de accesibilidad lingüística** que afecta a:

- **Estudiantes internacionales** que asisten a clases virtuales en un idioma extranjero y pierden contenido crítico por no comprender al 100%.
- **Profesionales en reuniones multinacionales** (Zoom, Teams, Meet) donde se habla un idioma que no es su lengua materna, limitando su participación y productividad.
- **Personas con discapacidad auditiva** que dependen de subtítulos para seguir el contenido de audio, y que necesitan esos subtítulos en su idioma nativo.
- **Consumidores de contenido multimedia** (podcasts, streams, videos en vivo) que no cuentan con subtítulos o traducciones en tiempo real.
- **Comunidades indígenas y minorías lingüísticas** que quedan excluidas de la información digital disponible solo en idiomas mayoritarios.

### 1.2 Descripción del Problema

Las soluciones existentes de subtitulado en tiempo real presentan **limitaciones críticas**:

1. **Subtítulos sin traducción:** Herramientas como los subtítulos automáticos de Zoom o Google Meet transcriben el audio, pero **no lo traducen en tiempo real** al idioma del usuario. El hablante dice algo en inglés y el subtítulo aparece en inglés — sin utilidad para quien no entiende el idioma.

2. **Dependencia de la aplicación:** Los subtítulos nativos de cada plataforma solo funcionan dentro de esa aplicación específica. Si el usuario minimiza la ventana, cambia de pestaña o usa otra aplicación simultáneamente, **pierde los subtítulos por completo**.

3. **Costo prohibitivo:** Las pocas soluciones que ofrecen traducción en tiempo real son servicios empresariales con costos de **$20-50 USD/mes por usuario**, haciéndolas inaccesibles para estudiantes, freelancers y organizaciones pequeñas.

4. **Latencia inaceptable:** Muchas herramientas de traducción procesan el texto por lotes, generando retrasos de 5-15 segundos que desconectan al usuario del flujo natural de la conversación.

5. **Falta de persistencia:** No existe un historial consultable. Una vez que la reunión termina, las transcripciones y traducciones se pierden, sin opción de revisarlas después.

### 1.3 Pregunta de Investigación

> *¿Cómo puede la inteligencia artificial de reconocimiento de voz, combinada con tecnologías web modernas, eliminar la barrera del idioma en la comunicación digital en tiempo real, de forma accesible y sin depender de aplicaciones específicas?*

---

## 2. Solución Propuesta: Subly

**Subly** es una aplicación web que resuelve esta problemática de forma integral:

1. **Captura audio de cualquier fuente** — pestaña del navegador, audio del sistema o micrófono — sin instalar software adicional.
2. **Transcribe en tiempo real** usando IA de última generación (ElevenLabs Scribe v2 Realtime), con latencia inferior a 500ms.
3. **Traduce instantáneamente** la transcripción al idioma que el usuario elija entre 13+ opciones.
4. **Modo Flotante (Picture-in-Picture)** que mantiene los subtítulos traducidos visibles por encima de CUALQUIER aplicación, incluso al cambiar de pestaña. Se activa automáticamente al salir de la pestaña de Subly.
5. **Historial persistente** de todas las sesiones, almacenado en la nube, consultable y descargable en cualquier momento.

### 2.1 Propuesta de Valor

| Característica | Competidores | Subly |
|---|---|---|
| Transcripción en tiempo real | ✅ | ✅ |
| Traducción en tiempo real | ❌ (solo transcripción) | ✅ 13+ idiomas |
| Funciona fuera de la app (PiP) | ❌ | ✅ Automático |
| Historial de sesiones | ❌ | ✅ Con búsqueda |
| Costo | $20-50/mes | Gratuito |
| Instalación requerida | Sí (apps nativas) | No (100% web) |
| Idioma de audio soportado | 1-2 idiomas | Auto-detección |

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico

| Capa | Tecnología | Versión | Propósito |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 15+ | Server-Side Rendering, API Routes, estructura del proyecto |
| **Lenguaje** | TypeScript | 5.x | Tipado estricto para eventos de audio, WebSockets y estados |
| **Motor de IA (STT)** | ElevenLabs Scribe v2 Realtime | SDK `@elevenlabs/client` | Transcripción de voz a texto en tiempo real vía WebSocket |
| **Traducción** | Google Translate API + MyMemory API | REST | Traducción instantánea de transcripciones (dual fallback) |
| **Autenticación** | Supabase Auth | `@supabase/supabase-js` | Login, registro, protección de rutas |
| **Base de Datos** | Supabase PostgreSQL | Cloud | Almacenamiento de transcripciones e historial por usuario |
| **Audio** | Web Audio API (`AudioWorkletNode`) | Nativa del navegador | Captura, resampling (48kHz→16kHz) y procesamiento de audio |
| **Captura de pantalla** | `getDisplayMedia` API | Nativa del navegador | Captura de audio del sistema/pestaña |
| **Estilos** | CSS personalizado (variables/tokens) | — | Tema oscuro premium, diseño responsivo |
| **Iconos** | `lucide-react` | — | Iconografía consistente y ligera |
| **Animaciones** | `framer-motion` | — | Transiciones suaves para subtítulos y paneles |
| **PiP** | Canvas API + `requestPictureInPicture()` | Nativa del navegador | Modo flotante con subtítulos renderizados |

### 3.2 Dependencias del Proyecto

```json
{
  "dependencies": {
    "@elevenlabs/client": "^1.x",
    "@supabase/supabase-js": "^2.x",
    "framer-motion": "^11.x",
    "lucide-react": "^0.x",
    "next": "15.x",
    "react": "^19.x",
    "react-dom": "^19.x"
  }
}
```

### 3.3 Variables de Entorno

```env
# .env.local (NO subir a GitHub)
ELEVENLABS_API_KEY=sk_xxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 4. Estructura del Proyecto

```
Subly/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── elevenlabs/
│   │   │   │   └── route.ts          # Generación de tokens temporales ElevenLabs
│   │   │   └── translate/
│   │   │       └── route.ts          # API de traducción (Google + MyMemory fallback)
│   │   ├── login/
│   │   │   └── page.tsx              # Pantalla de autenticación
│   │   ├── layout.tsx                # Layout raíz con metadatos SEO
│   │   ├── page.tsx                  # Dashboard principal
│   │   └── globals.css               # Sistema de diseño (tokens, variables)
│   ├── hooks/
│   │   └── useSubly.ts               # Hook principal: audio, WebSocket, transcripción, traducción
│   └── lib/
│       └── supabase.ts               # Cliente Supabase configurado
├── .env.local                         # Variables de entorno (excluido de Git)
├── .gitignore
├── documentacion.md                   # Este archivo
├── supabase_schema.sql                # Schema de la base de datos
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## 5. Implementación Detallada

### 5.1 Motor de Captura de Audio (`useSubly.ts`)

El corazón de Subly es el hook `useSubly`, que orquesta todo el pipeline:

```
[Audio Source] → [AudioWorkletNode] → [Resample 48→16kHz] → [PCM Int16 → Base64]
                                                                      ↓
[UI Display] ← [Traducción API] ← [Transcripción JSON] ← [WebSocket ElevenLabs]
```

**Flujo detallado:**

1. **Captura:** `getDisplayMedia()` obtiene el audio del sistema/pestaña. Fallback a `getUserMedia()` para micrófono.
2. **AudioContext:** Se crea con el sample rate nativo del stream (48kHz en la mayoría de sistemas).
3. **AudioWorkletNode:** Procesador inline (vía Blob URL) que:
   - Aplica **resampling con interpolación lineal** de 48kHz → 16kHz (algoritmo copiado del SDK oficial de ElevenLabs).
   - Acumula samples en un buffer de 4096 antes de enviar.
   - Convierte Float32 [-1,1] → Int16 [-32768, 32767] (formato PCM16).
4. **Envío:** Los chunks Int16 se codifican en Base64 y se envían como JSON:
   ```json
   {
     "message_type": "input_audio_chunk",
     "audio_base_64": "base64...",
     "commit": false,
     "sample_rate": 16000
   }
   ```
5. **Recepción:** ElevenLabs responde con `partial_transcript` (parciales) y `committed_transcript` (finales).
6. **Traducción:** Los textos recibidos se envían a `/api/translate` para traducción al idioma seleccionado.

### 5.2 Seguridad: Tokens Temporales (`/api/elevenlabs/route.ts`)

La API Key de ElevenLabs **nunca se expone al frontend**. En su lugar:
1. El frontend solicita un token a nuestra API route.
2. La API route contacta a ElevenLabs con la key privada y genera un **token de un solo uso** con scope `realtime_scribe`.
3. El frontend usa ese token temporal para autenticar la conexión WebSocket.

### 5.3 Traducción en Tiempo Real (`/api/translate/route.ts`)

Sistema de traducción con **doble fallback**:
1. **Primario:** Google Translate (endpoint `googleapis.com/translate_a/single`).
2. **Fallback:** MyMemory Translation API (sin API Key, gratuita).
3. **Último recurso:** Devuelve el texto original sin traducir.

**Idiomas soportados:**

| Código | Idioma | Bandera |
|---|---|---|
| `auto` | Sin traducción | 🔤 |
| `es` | Español | 🇪🇸 |
| `en` | Inglés | 🇺🇸 |
| `fr` | Francés | 🇫🇷 |
| `pt` | Portugués | 🇧🇷 |
| `de` | Alemán | 🇩🇪 |
| `it` | Italiano | 🇮🇹 |
| `ja` | Japonés | 🇯🇵 |
| `ko` | Coreano | 🇰🇷 |
| `zh` | Chino | 🇨🇳 |
| `ru` | Ruso | 🇷🇺 |
| `ar` | Árabe | 🇸🇦 |
| `hi` | Hindi | 🇮🇳 |

### 5.4 Modo Flotante — Picture-in-Picture (PiP)

El PiP de Subly permite ver los subtítulos traducidos **sobre cualquier ventana del sistema operativo**:

1. **Canvas oculto (800×250px):** Se renderiza con fondo oscuro, logo, indicador de grabación, idioma activo y los subtítulos con word-wrap.
2. **Video + captureStream:** El canvas se convierte en un stream de video a 30fps y se asigna a un `<video>` oculto.
3. **Activación automática:** Al detectar `visibilitychange` (usuario sale de la pestaña) y hay grabación activa, se llama automáticamente a `requestPictureInPicture()`.
4. **setInterval (no requestAnimationFrame):** El canvas se actualiza con `setInterval(33ms)` en lugar de `requestAnimationFrame`, porque los navegadores **pausan** rAF en pestañas de fondo, pero el PiP vive precisamente ahí.

### 5.5 Autenticación (`Supabase Auth`)

- **Registro** con email y contraseña.
- **Login** con credenciales.
- **Protección de ruta:** Si el usuario no está autenticado, se redirige automáticamente a `/login`.
- **Cierre de sesión** desde el dashboard.

### 5.6 Persistencia de Datos (`Supabase PostgreSQL`)

**Schema de la base de datos:**

```sql
CREATE TABLE transcriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Políticas RLS (Row Level Security)
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven solo sus transcripciones"
  ON transcriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuarios insertan sus transcripciones"
  ON transcriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios eliminan sus transcripciones"
  ON transcriptions FOR DELETE
  USING (auth.uid() = user_id);
```

**Funcionalidades:**
- Al detener la grabación, el texto completo de la sesión (traducido) se guarda automáticamente.
- El historial se muestra en un panel colapsable con fecha, hora y contenido expandible.
- Cada entrada puede eliminarse individualmente o copiarse al portapapeles.

---

## 6. Interfaz de Usuario

### 6.1 Diseño Visual

- **Tema:** Oscuro premium con acentos en verde neón (`#00ffa3`).
- **Tipografía:** Font system Inter/sans-serif.
- **Efectos:** Glassmorphism (`backdrop-blur`), gradientes sutiles, sombras con glow.
- **Animaciones:** Entrada de subtítulos con fade-in + blur (`framer-motion`), barras de audio reactivas, indicadores pulsantes.

### 6.2 Componentes Principales

1. **Header:** Logo, email del usuario, botón de logout.
2. **Barra de controles:** Selector de idioma ("Traducir a:"), botón PiP manual.
3. **Panel de transcripción:** Área central con subtítulos en tiempo real (parciales en gris italic, finales en blanco bold).
4. **Indicadores en vivo:** Barras de audio, estado de grabación, idioma detectado, idioma de traducción.
5. **Controles de grabación:** Botón "INICIAR CAPTURA" / "DETENER Y GUARDAR".
6. **Panel de historial:** Colapsable, con entradas expandibles, botón de copiar y eliminar.

---

## 7. Guía de Instalación y Ejecución

### 7.1 Requisitos Previos
- Node.js 18+
- npm o yarn
- Cuenta en [Supabase](https://supabase.com) (gratuita)
- API Key de [ElevenLabs](https://elevenlabs.io) con permisos de "Scribe Realtime"

### 7.2 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/<tu-usuario>/Subly.git
cd Subly

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales

# 4. Ejecutar el schema SQL en Supabase Dashboard
# (copiar contenido de supabase_schema.sql)

# 5. Iniciar el servidor de desarrollo
npm run dev
```

### 7.3 Uso

1. Abrir `http://localhost:3000` en un navegador compatible (Chrome/Edge recomendado).
2. Registrarse o iniciar sesión.
3. Seleccionar el idioma de traducción deseado.
4. Pulsar **"INICIAR CAPTURA"** y compartir una pestaña con audio activo (marcar "Compartir audio del sistema").
5. Los subtítulos traducidos aparecerán en tiempo real.
6. Al cambiar de pestaña, la ventana flotante (PiP) se activa automáticamente.
7. Pulsar **"DETENER Y GUARDAR"** para finalizar y almacenar la transcripción.

---

## 8. Desafíos Técnicos Resueltos

| Desafío | Solución |
|---|---|
| WebSocket se cerraba inmediatamente (código 1000) | Envío de audio en formato JSON con `message_type: "input_audio_chunk"` y base64, idéntico al protocolo del SDK oficial |
| Error "Message must be a valid protocol message" | Migración de envío binario crudo a JSON estructurado con campos requeridos |
| ScriptProcessorNode deprecado | Migración a `AudioWorkletNode` con inline worklet vía Blob URL |
| Resampling incorrecto (48kHz enviado como 16kHz) | Implementación de interpolación lineal copiada del AudioWorkletProcessor oficial de ElevenLabs |
| PiP no se actualizaba en tabs de fondo | Uso de `setInterval` en lugar de `requestAnimationFrame` (que se pausa en background) |
| API Key expuesta en el frontend | Sistema de tokens temporales de un solo uso generados desde API Route del servidor |
| Traducción con un solo servicio poco confiable | Sistema dual con Google Translate (primario) + MyMemory API (fallback) |

---

## 9. Impacto y Escalabilidad

### 9.1 Impacto Social
- **Inclusión:** Permite a personas sordas o con dificultades auditivas acceder a contenido de audio en su idioma.
- **Educación:** Estudiantes pueden seguir clases en idiomas extranjeros con subtítulos traducidos en vivo.
- **Productividad:** Profesionales en reuniones internacionales mantienen contexto sin importar el idioma.

### 9.2 Escalabilidad Futura
- Soporte para más idiomas (40+ con Google Translate).
- Integración con APIs de traducción premium (DeepL, Google Cloud Translation) para mayor precisión.
- Exportación de transcripciones en formatos `.txt`, `.srt`, `.pdf`.
- Vocabulario personalizable (términos técnicos, jerga específica).
- App móvil con React Native.
- Modo colaborativo: compartir sesión de subtítulos con múltiples usuarios.

---

## 10. Equipo

| Rol | Nombre |
|---|---|
| Desarrollo Full-Stack | *(completar)* |
| Diseño UI/UX | *(completar)* |
| Investigación y documentación | *(completar)* |

---

> **Subly** — Rompiendo la barrera del idioma, una conversación a la vez. 🌍
