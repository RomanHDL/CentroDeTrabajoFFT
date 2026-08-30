// Configuracion de PM2 para Coolify (MI Stack Reference, Fase 7). Se
// ejecuta en modo foreground de contenedor via `pm2-runtime` (ver
// package.json "start"), nunca `pm2 start` en modo daemon -- pm2-runtime
// no hace fork a background y reenvia logs a stdout/stderr, que es lo que
// espera un contenedor Docker/Coolify.
module.exports = {
  apps: [
    {
      name: 'centro-de-trabajo-fft',
      script: 'server-lib/prod-server.js',
      // .mjs/ESM explicito -- el resto del repo usa "type": "module" en
      // package.json, pero este archivo de configuracion de PM2 debe ser
      // CommonJS (.cjs) porque PM2 todavia carga los ecosystem file con
      // require(), no import.
      exec_mode: 'fork',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
