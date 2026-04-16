import * as THREE from 'three';

export const rand = (min: number, max: number): number => Math.random() * (max - min) + min;
export const randInt = (min: number, max: number): number => Math.floor(rand(min, max + 1));
export const chance = (p: number): boolean => Math.random() < p;
export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export const colorMix = (a: number, b: number, t: number): number => {
  const c1 = new THREE.Color(a);
  const c2 = new THREE.Color(b);
  c1.lerp(c2, t);
  return c1.getHex();
};

export const mod = (n: number, m: number): number => ((n % m) + m) % m;
