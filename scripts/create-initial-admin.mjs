// Script administrativo ONE-TIME para crear el primer ADMINISTRADOR.
// No recibe la contraseña por argumentos de linea de comandos (quedaria en el historial de la
// shell) ni por variable de entorno persistida — la pide de forma interactiva y oculta.
//
// Uso:
//   npm run create-admin
// (el script npm ya invoca node con --env-file=.env.local; no cargar dotenv aqui dentro —
// las importaciones estaticas de abajo se resuelven antes que cualquier codigo de este archivo)
//
import readline from 'node:readline'
import bcrypt from 'bcryptjs'
import { prisma } from '../server-lib/prisma.js'

function ask(query) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(query, (answer) => { rl.close(); resolve(answer.trim()) }))
}

function askHidden(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const originalWrite = rl._writeToOutput.bind(rl)
    let masking = false
    rl._writeToOutput = (str) => {
      if (masking && str !== '\r\n' && str !== '\n') originalWrite('*')
      else originalWrite(str)
    }
    rl.question(query, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
    masking = true
  })
}

async function main() {
  console.log('=== Crear el primer ADMINISTRADOR de Centro de Trabajo FFT ===')
  console.log('(Ctrl+C para cancelar en cualquier momento. La contraseña no se muestra en pantalla ni se guarda en logs.)\n')

  const employeeNumber = (await ask('Numero de empleado (opcional, Enter para omitir): ')) || null
  const username = (await ask('Username (opcional, Enter para omitir): ')) || null

  if (!employeeNumber && !username) {
    console.error('\nError: debes indicar al menos numero de empleado o username para poder iniciar sesion.')
    process.exit(1)
  }

  const name = await ask('Nombre completo: ')
  if (!name) {
    console.error('\nError: el nombre es requerido.')
    process.exit(1)
  }

  const password = await askHidden('Contraseña temporal (minimo 8 caracteres): ')
  if (!password || password.length < 8) {
    console.error('\nError: la contraseña debe tener al menos 8 caracteres.')
    process.exit(1)
  }
  const confirm = await askHidden('Confirma la contraseña: ')
  if (confirm !== password) {
    console.error('\nError: las contraseñas no coinciden.')
    process.exit(1)
  }

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        employeeNumber ? { employeeNumber } : undefined,
        username ? { username } : undefined,
      ].filter(Boolean),
    },
  })
  if (existing) {
    console.error(`\nError: ya existe un usuario con ese ${existing.employeeNumber === employeeNumber ? 'numero de empleado' : 'username'}. No se creo nada.`)
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      employeeNumber,
      username,
      name,
      role: 'ADMINISTRADOR',
      passwordHash,
      active: true,
      mustChangePassword: true,
    },
  })

  console.log(`\nListo. Administrador creado: "${user.name}" (${user.username || user.employeeNumber}).`)
  console.log('mustChangePassword = true -> debera cambiar la contraseña en su primer login.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('\nError inesperado:', e.message)
  await prisma.$disconnect()
  process.exit(1)
})
