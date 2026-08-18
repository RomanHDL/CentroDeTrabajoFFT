/* Deterministic PRNG so mock production numbers stay stable across renders
   instead of jumping around on every re-render (no Math.random). */
export function mulberry32(seed) {
  let t = seed >>> 0
  return function next() {
    t = (t + 0x6D2B79F5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length]
}

export function randInt(rng, min, max) {
  return Math.floor(min + rng() * (max - min + 1))
}
