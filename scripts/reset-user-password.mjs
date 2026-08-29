// Script administrativo ONE-TIME para restablecer la contraseña de un User EXISTENTE.
// No crea usuarios nuevos. No recibe la contraseña por argumentos de linea de comandos ni por
// variable de entorno persistida — la pide de forma interactiva y oculta.
//
// Uso:
//   npm run reset-password
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
  console.log('=== Restablecer contraseña de un usuario existente — Centro de Trabajo FFT ===')
  console.log('(Ctrl+C para cancelar. La contraseña no se muestra en pantalla ni se guarda en logs.)\n')

  const employeeNumber = await ask('Numero de empleado del usuario: ')
  if (!employeeNumber) {
    console.error('\nError: debes indicar un numero de empleado.')
    process.exit(1)
  }

  const user = await prisma.user.findUnique({ where: { employeeNumber } })
  if (!user) {
    console.error(`\nError: no existe ningun usuario con employeeNumber=${employeeNumber}. No se creo nada.`)
    process.exit(1)
  }

  console.log(`\nUsuario localizado: "${user.name}" (rol ${user.role}, activo=${user.active}). Se le va a restablecer SOLO la contraseña.\n`)

  const password = await askHidden('Nueva contraseña temporal (minimo 8 caracteres): ')
  if (!password || password.length < 8) {
    console.error('\nError: la contraseña debe tener al menos 8 caracteres.')
    process.exit(1)
  }
  const confirm = await askHidden('Confirma la nueva contraseña: ')
  if (confirm !== password) {
    console.error('\nError: las contraseñas no coinciden.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: true,
      // role, employeeNumber, username, name y active NO se tocan.
    },
  })

  console.log(`\nListo. Se restableció la contraseña de "${user.name}" (${user.employeeNumber}).`)
  console.log('mustChangePassword = true -> debera cambiarla en su proximo login.')
  await prisma.$disconnect()
}

main().catch(async (e) => {
  console.error('\nError inesperado:', e.message)
  await prisma.$disconnect()
  process.exit(1)
})
