// Migracion aditiva (2026-09-14, a peticion explicita del usuario -- "cambiar fotografia desde
// el propio organigrama"): tabla nueva "OrgChartPhoto", nunca toca datos existentes. El
// organigrama sigue siendo datos estaticos (orgChartData.js) -- esta tabla solo guarda, por
// persona (personId = el mismo id string que ya usa orgChartData.js, ej. 'juan-sillas'), una
// foto subida por un ADMINISTRADOR/SUPERVISOR real. Nunca filesystem (Coolify no persiste
// escrituras a /public entre deploys) -- la imagen ya optimizada (512x512 WebP) se guarda como
// texto base64, sirviendola despues via /api/organigrama/:id/photo.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { db } from '../server-lib/db/client.js'

const sql = readFileSync(
  fileURLToPath(new URL('../drizzle/0017_orgchart_photo.sql', import.meta.url)),
  'utf8',
)

const [{ exists: alreadyApplied }] = (
  await db.execute(`
    select exists (
      select 1 from information_schema.tables
      where table_name = 'OrgChartPhoto'
    ) as exists
  `)
).rows

if (alreadyApplied) {
  console.log('Ya aplicada -- la tabla OrgChartPhoto ya existe. Nada que hacer.')
  process.exit(0)
}

const statements = sql
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean)

for (const statement of statements) {
  console.log('Ejecutando:', statement.slice(0, 80).replace(/\s+/g, ' '), '...')
  await db.execute(statement)
}

console.log('Migracion 0017 aplicada correctamente.')
process.exit(0)
