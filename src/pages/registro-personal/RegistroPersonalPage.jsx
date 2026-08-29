import { useState } from 'react'
import { cardClass, pageClass } from '@/lib/pageStyles'
import RegisterPersonnelForm from '../centro-trabajo/RegisterPersonnelForm'

/* Modulo propio, separado de Centro de Trabajo, cuyo unico contenido
   es la tarjeta de registro de personal (a peticion del usuario,
   2026-08-20) — misma logica que el dialogo de la pestaña "Personal"
   (RegisterPersonnelForm centraliza todo, para no tener dos copias
   de la validacion que se puedan desincronizar).

   Fase 6c: solo el contenedor exterior se porta a Tailwind.
   RegisterPersonnelForm.jsx sigue en MUI a proposito -- lo comparten 3
   archivos mas de Centro de Trabajo (MoveConfirmDialog/PersonalDeHoyTab/
   RegisterPersonnelDialog), fuera de alcance hasta el turno de esa
   carpeta (ultima fase, 6c final). MUI ThemeProvider/CssBaseline sigue
   montado globalmente, asi que el formulario MUI adentro de este
   contenedor Tailwind renderiza igual que siempre. */
export default function RegistroPersonalPage() {
  // Aqui no hay dialogo que cerrar: "Cancelar" limpia el formulario.
  // Forzar un remount (key) es mas simple y seguro que exponer un
  // metodo reset() desde RegisterPersonnelForm.
  const [resetKey, setResetKey] = useState(0)

  return (
    <div className={pageClass}>
      <div className={`${cardClass} mx-auto max-w-[480px]`}>
        <div className="p-6">
          <p className="mb-4 text-[18px] font-extrabold">+ Registrar personal</p>
          <RegisterPersonnelForm
            key={resetKey}
            cancelLabel="Cancelar"
            onCancel={() => setResetKey((k) => k + 1)}
          />
        </div>
      </div>
    </div>
  )
}
