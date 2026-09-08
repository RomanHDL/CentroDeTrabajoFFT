/* Selector global FFT / Sorting (2026-09-08, a peticion explicita del usuario: "quiero un
   boton ahi que este para ya sea el area de FFT, y Sorting... si le doy click a sorting todo
   esos modulos ponga lo de sorting y si le doy click a FFT ponga lo que tenemos ahorita").
   Mismo patron pub/sub que ya usa src/data/personnel/store.js (notify/subscribe) --
   persistido en localStorage (por dispositivo, igual que el tema/idioma), NUNCA en el
   servidor: es una preferencia de que catalogo ver, no un dato de negocio.

   catalog.js reasigna WORK_CENTERS (y sus derivados) cuando este modulo notifica un cambio --
   ver applyActiveAreaGroup() ahi. Los ~30 archivos que ya importan WORK_CENTERS/etc. de
   catalog.js siguen funcionando sin tocarse: en ES modules un export es un binding vivo, no
   una copia -- leen el valor vigente en cada render/calculo. */

export const AREA_GROUPS = [
  { key: 'FFT', labelKey: 'areaGroupFft' },
  { key: 'SORTING', labelKey: 'areaGroupSorting' },
]

const STORAGE_KEY = 'centro-control:areaGroup'

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw === 'SORTING' ? 'SORTING' : 'FFT'
  } catch {
    return 'FFT'
  }
}

let current = readStored()
const listeners = new Set()

export function getActiveAreaGroup() {
  return current
}

export function setActiveAreaGroup(group) {
  const next = group === 'SORTING' ? 'SORTING' : 'FFT'
  if (next === current) return
  current = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // localStorage puede fallar (modo privado, cuota) -- el cambio sigue vigente en memoria
    // para esta sesion de pestaña, simplemente no sobrevive un refresh.
  }
  listeners.forEach((fn) => {
    fn()
  })
}

export function subscribeAreaGroup(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}
