Subly - Transcripción y Traducción en Tiempo Real

Aplicación web que transcribe y traduce voz en tiempo real usando IA.

Demo: https://subly1-d0akbaeet-alberto-s-projects1.vercel.app

Funcionalidades:

Reconocimiento de voz en 11 idiomas (Web Speech API)
Traducción automática entre idiomas
Subtítulos en vivo con resultados intermedios
Modo Picture-in-Picture (subtítulos flotantes)
Contador de sesión (tiempo, líneas, palabras)
Copia rápida de subtítulos individuales o texto completo
11 idiomas: español, inglés, francés, alemán, portugués, italiano, japonés, chino, coreano, árabe, ruso
Stack: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, Lucide React

Requisito: Chrome o Edge para usar el reconocimiento de voz.

Instalación local:

git clone https://github.com/tu-usuario/subly.git
cd subly
npm install
npm run dev
Scripts:

npm run dev - desarrollo
npm run build - compilar
npm run start - producción
npm run lint - eslint
npm run export - exportar estático
Estructura: src/ app/ - página principal y layout components/ - componentes de UI hooks/ - lógica de captura de audio

Despliegue:

Vercel: npm i -g vercel && vercel
