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
app.use(express.json())

mountApiRoutes(app)

const PORT = process.env.API_DEV_PORT || 5181
app.listen(PORT, () => {
  console.log(`[dev-api] escuchando en http://localhost:${PORT}`)
})
