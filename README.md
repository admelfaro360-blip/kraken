# Kraken Handyman OS

Sistema de gestión operativa y financiera para Kraken Handyman.

## Características
- Gestión de clientes y presupuestos.
- Calculadora de costos avanzada (MO, Estructura, Traslado, Materiales).
- Reportes detallados con visualización de datos.
- Modo Oscuro / Claro.
- Autenticación segura.

## Requisitos
- Node.js 18+
- npm

## Instalación
1. Clonar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar en modo desarrollo:
   ```bash
   npm run dev
   ```

## Despliegue en otro repositorio (GitHub/GitLab/Bitbucket)
1. Crea un nuevo repositorio en tu plataforma preferida.
2. Inicializa git en la carpeta del proyecto (si no está inicializado):
   ```bash
   git init
   ```
3. Añade los archivos:
   ```bash
   git add .
   ```
4. Realiza el primer commit:
   ```bash
   git commit -m "Initial commit"
   ```
5. Añade el origen remoto:
   ```bash
   git remote add origin <URL_DE_TU_NUEVO_REPOSITORIO>
   ```
6. Sube los archivos:
   ```bash
   git push -u origin main
   ```

## Despliegue gratuito (Vercel / Netlify)
Este proyecto está listo para ser desplegado en plataformas como Vercel o Netlify.
1. Conecta tu repositorio a Vercel/Netlify.
2. Configura el comando de build: `npm run build`.
3. Configura el directorio de salida: `dist`.
4. (Opcional) Si usas funciones backend, asegúrate de configurar el entorno de ejecución adecuado.

## Credenciales por defecto
- **Usuario:** admin
- **Contraseña:** admin1234
