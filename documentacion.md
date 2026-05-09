SUBLY
🏗️ Arquitectura del Sistema
El flujo de datos debe ser constante y de baja latencia. No podemos esperar a que la persona termine de hablar para procesar el audio.
________________________________________
📅 Planificación del Proyecto (Roadmap)
Fase 1: Entorno y Configuración Inicial
•	Setup: Inicializar Next.js con TypeScript (altamente recomendado para manejar los tipos de los flujos de audio).
•	UI Base: Crear la interfaz de "consola". Un área oscura donde aparecerá el texto.
•	Librerías clave:
o	lucide-react (iconografía).
o	framer-motion (para que los subtítulos aparezcan con una transición suave).
Fase 2: El Motor de Captura (Web Audio API)
Esta es la parte más crítica. Debes configurar el acceso al audio del sistema.
•	Implementar getDisplayMedia: Crear un hook personalizado que solicite permiso para capturar la pantalla/pestaña y extraiga solo el track de audio.
•	Procesador de Audio: Configurar un AudioContext para convertir el stream de audio en fragmentos (chunks) de datos crudos (Raw PCM o OGG).
Fase 3: Integración con la IA (Real-Time ASR)
Para que sea "en tiempo real", no usaremos peticiones HTTP normales, sino WebSockets.
•	Elección de API: Recomiendo Deepgram o AssemblyAI por su latencia de menos de 300ms.
•	API Route en Next.js: Crear una ruta que actúe como proxy para proteger tus llaves de API y gestionar la conexión entre el navegador y el servicio de transcripción.
Fase 4: Visualización y "Modo Flotante"
•	Algoritmo de Limpieza: Implementar una lógica que mantenga solo las últimas 3-4 líneas de texto en pantalla para no saturar.
•	Picture-in-Picture (PiP): Esta es la clave del "segundo plano".
o	Truco técnico: Crea un <canvas> donde renderices el texto de los subtítulos, convierte ese canvas en un stream de video y lánzalo en un elemento <video> usando el modo PiP. Así, los subtítulos flotarán sobre Zoom.
Fase 5: Refinamiento y Traducción
•	Traducción en vuelo: Si el audio es en inglés y los quieres en español, puedes usar el mismo modelo de IA (si soporta traducción directa) o pasar el texto por un modelo rápido de traducción.
________________________________________
🛠️ Stack Tecnológico Sugerido
Componente	Tecnología
Framework	Next.js 14+ (App Router)
Lenguaje	TypeScript
Captura	Web Audio API / getDisplayMedia
Transcripción	Deepgram SDK (Streaming)
Estilos	Tailwind CSS
Despliegue	Vercel
________________________________________
⚠️ Bloqueos que debes considerar
1.	El permiso de audio: El usuario siempre tendrá que marcar manualmente el check de "Compartir audio del sistema" al iniciar. No hay forma de saltarse esto por seguridad del navegador.
2.	Aislamiento de voces: Si hay mucho ruido de fondo en la llamada, la IA puede confundirse. Es ideal usar un modelo con cancelación de ruido activa.
3.	Consumo de recursos: Mantener un stream de audio abierto y procesando en Next.js consume batería y CPU. Asegúrate de cerrar los tracks de audio cuando la sesión termine.

