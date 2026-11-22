# ClipIA — Creator Studio

Editor de clips gratuito y estático para GitHub Pages. No requiere cuenta, backend ni claves API. Los vídeos se procesan localmente en el navegador.

## Publicar gratis en GitHub Pages

1. Crea un repositorio público en GitHub llamado `clipia`.
2. Sube `index.html`, `style.css`, `app.js` y este `README.md` a la raíz del repositorio.
3. Entra en **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona `main` y `/ (root)` y pulsa **Save**.
6. Espera a que GitHub publique la web. La dirección será `https://TU-USUARIO.github.io/clipia/`.

No necesitas Render ni configurar variables de entorno.

## Funciones de esta primera versión

- Importar un vídeo desde el dispositivo.
- Modo automático: análisis local de energía de audio para sugerir fragmentos.
- Modo manual: definir inicio y final de cada fragmento.
- Previsualización vertical/cuadrada/horizontal.
- Texto superpuesto y zoom suave.
- Exportación WebM desde el navegador.

## Limitaciones importantes

- El modo automático detecta actividad de audio; **no entiende el contenido ni garantiza que un momento sea viral**.
- Los subtítulos son texto que escribes manualmente; no hay transcripción automática en esta versión.
- La exportación depende de `MediaRecorder`, `canvas.captureStream()` y `video.captureStream()`. Chrome/Edge de escritorio ofrecen la compatibilidad más consistente.
- El archivo exportado es WebM, no MP4. Puedes convertirlo después con una herramienta de confianza si necesitas MP4.
- El procesamiento de vídeo puede consumir bastante memoria. Usa vídeos cortos o de tamaño moderado.
- No se suben los vídeos a un servidor. La librería no utiliza APIs externas.

## Privacidad

ClipIA no tiene backend ni envía el archivo de vídeo a un servidor. GitHub Pages sirve únicamente los archivos estáticos de la web.
