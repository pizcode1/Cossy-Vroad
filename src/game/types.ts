import * as THREE from 'three';

export type RowType = 'grass' | 'road' | 'water' | 'rail';

export type RowData = {
  index: number;
  type: RowType;
  mesh: THREE.Group;
  safe: boolean;
  speed: number;
  direction: -1 | 1;
  occupancy: boolean[];
};

export type HazardEntity = {
  id: number;
  type: 'vehicle' | 'log' | 'train';
  rowIndex: number;
  laneX: number;
  speed: number;
  direction: -1 | 1;
  length: number;
  active: boolean;
  mesh: THREE.Mesh;
};

export type DeathReason = 'vehicle' | 'water' | 'train' | 'rear';

export type GameState = 'start' | 'playing' | 'dead';
