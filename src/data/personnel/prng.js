/* PRNG propio del modulo de personal — deliberadamente NO
   compartido con data/production (que tiene el suyo), para
   mantener el personal completamente desacoplado de la
   produccion mock (ver nota en repository.js). */
export function mulberry32(seed) {
  let t = seed >>> 0
  return function next() {
    t = (t + 0x6d2b79f5) | 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length) % arr.length]
}
