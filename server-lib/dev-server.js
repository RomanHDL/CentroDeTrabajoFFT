// Servidor local SOLO para desarrollo. Monta exactamente los mismos handlers de /api que
// Vercel usaria en produccion/preview, sin duplicar logica. En Vercel real, cada archivo de
// /api se despliega como su propia Serverless Function con el mismo codigo.
//
// IMPORTANTE: este archivo debe ejecutarse con `node --env-file=.env.local`, NO cargar dotenv
// aqui dentro — las importaciones estaticas de mas abajo (que a su vez cargan server-lib/prisma.js
// y leen process.env.DATABASE_URL al construir el adapter) se resuelven ANTES que cualquier
// codigo de este archivo, sin importar el orden en que se escriban (hoisting de ES modules).
// Cargar dotenv aqui llegaria demasiado tarde.
import express from 'express'

import loginHandler from '../api/auth/login.js'
import logoutHandler from '../api/auth/logout.js'
import sessionHandler from '../api/auth/session.js'
import changePasswordHandler from '../api/auth/change-password.js'
import usersIndexHandler from '../api/users/index.js'
import userByIdHandler from '../api/users/[id].js'
import userDeactivateHandler from '../api/users/[id]/deactivate.js'
import userResetPasswordHandler from '../api/users/[id]/reset-password.js'

const app = express()
app.use(express.json())

// Vercel inyecta los segmentos dinamicos de ruta ([id]) dentro de req.query. Express 5 expone
// req.query como getter (sin setter, reparsea desde la URL en cada acceso), asi que no se puede
// copiar req.params ahi como en Express 4 — cada handler de ruta dinamica lee
// `req.query.id ?? req.params?.id` para funcionar igual en ambos entornos.
function withDynamicParams(handler) {
  return wrapAsync(handler)
}

function wrapAsync(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next)
}

app.post('/api/auth/login', wrapAsync(loginHandler))
app.post('/api/auth/logout', wrapAsync(logoutHandler))
app.get('/api/auth/session', wrapAsync(sessionHandler))
app.post('/api/auth/change-password', wrapAsync(changePasswordHandler))

app.get('/api/users', wrapAsync(usersIndexHandler))
app.post('/api/users', wrapAsync(usersIndexHandler))
app.patch('/api/users/:id', withDynamicParams(userByIdHandler))
app.post('/api/users/:id/deactivate', withDynamicParams(userDeactivateHandler))
app.post('/api/users/:id/reset-password', withDynamicParams(userResetPasswordHandler))

app.use((err, req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Error interno del servidor' })
})

const PORT = process.env.API_DEV_PORT || 5181
app.listen(PORT, () => {
  console.log(`[dev-api] escuchando en http://localhost:${PORT}`)
})
