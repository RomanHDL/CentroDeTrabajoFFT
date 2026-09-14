// Servidor local SOLO para desarrollo. Monta exactamente los mismos handlers de /api que
// Vercel usaria en produccion/preview (via mountApiRoutes, ver api-routes.js -- compartido
// con server-lib/prod-server.js para Coolify, nunca duplicado). En Vercel real, cada archivo
// de /api se despliega como su propia Serverless Function con el mismo codigo.
//
// IMPORTANTE: este archivo debe ejecutarse con `node --env-file=.env.local`, NO cargar dotenv
// aqui dentro — las importaciones estaticas de api-routes.js (que a su vez cargan
// server-lib/db/client.js y leen process.env.DATABASE_URL al construir el cliente) se resuelven
// ANTES que cualquier codigo de este archivo, sin importar el orden en que se escriban (hoisting
// de ES modules). Cargar dotenv aqui llegaria demasiado tarde.
import express from 'express'
import { mountApiRoutes } from './api-routes.js'

const app = express()
// Limite subido de 100kb (default de Express) a 8mb (2026-09-14, a peticion explicita del
// usuario -- subir/recortar foto del organigrama): el recorte final se manda como base64 en el
// body JSON antes de que el servidor lo optimice con sharp -- 100kb se quedaba corto incluso
// para una imagen chica ya recortada. 8mb cubre el limite real de archivo (5MB) mas el overhead
// de base64 (~33%) con margen, sin abrir la puerta a bodies arbitrariamente grandes.
app.use(express.json({ limit: '8mb' }))

mountApiRoutes(app)

const PORT = process.env.API_DEV_PORT || 5181
app.listen(PORT, () => {
  console.log(`[dev-api] escuchando en http://localhost:${PORT}`)
})
