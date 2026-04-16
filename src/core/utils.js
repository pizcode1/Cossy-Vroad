import * as THREE from 'three';
export const rand = (min, max) => Math.random() * (max - min) + min;
export const randInt = (min, max) => Math.floor(rand(min, max + 1));
export const chance = (p) => Math.random() < p;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const colorMix = (a, b, t) => {
    const c1 = new THREE.Color(a);
    const c2 = new THREE.Color(b);
    c1.lerp(c2, t);
    return c1.getHex();
};
export const mod = (n, m) => ((n % m) + m) % m;
//# sourceMappingURL=utils.js.map