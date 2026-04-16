import * as THREE from 'three';
import { chance, colorMix, rand, randInt } from '../core/utils';
import { CHARACTERS, INITIAL_ROWS_AHEAD, LANE_WIDTH, ROWS_BEHIND_KEEP, SAFE_ZONE_BASE, TILE_SIZE } from './config';
import type { CharacterDefinition } from './config';
import type { RowData, RowType } from './types';

export class ChunkManager {
  readonly group = new THREE.Group();
  readonly rows = new Map<number, RowData>();
  private maxGenerated = -1;
  private readonly laneIndices = Array.from({ length: LANE_WIDTH }, (_, i) => i - Math.floor(LANE_WIDTH / 2));

  constructor(private readonly scene: THREE.Scene) {
    this.scene.add(this.group);
  }

  reset(character: CharacterDefinition): void {
    this.maxGenerated = -1;
    this.rows.clear();
    this.group.clear();
    for (let i = -2; i <= INITIAL_ROWS_AHEAD; i += 1) {
      this.generateRow(i, character, 1);
    }
  }

  ensureRows(playerRow: number, difficulty: number, character: CharacterDefinition): void {
    const targetMax = playerRow + INITIAL_ROWS_AHEAD;
    for (let i = this.maxGenerated + 1; i <= targetMax; i += 1) {
      this.generateRow(i, character, difficulty);
    }

    const pruneBelow = playerRow - ROWS_BEHIND_KEEP;
    for (const [rowIndex, row] of this.rows.entries()) {
      if (rowIndex < pruneBelow) {
        this.group.remove(row.mesh);
        row.mesh.traverse((obj) => {
          if (obj instanceof THREE.Mesh) obj.geometry.dispose();
        });
        this.rows.delete(rowIndex);
      }
    }
  }

  private generateRow(index: number, character: CharacterDefinition, difficulty: number): void {
    const row = this.createRow(index, character, difficulty);
    this.rows.set(index, row);
    this.group.add(row.mesh);
    this.maxGenerated = index;
  }

  private createRow(index: number, character: CharacterDefinition, difficulty: number): RowData {
    const group = new THREE.Group();
    group.position.z = index * TILE_SIZE;

    const rowType = this.pickRowType(index, difficulty);
    const safe = this.isSafeRow(index, difficulty, rowType);

    let baseColor = 0x6abb4f;
    if (rowType === 'road') baseColor = 0x414141;
    if (rowType === 'water') baseColor = 0x3e9eff;
    if (rowType === 'rail') baseColor = 0x505156;

    if (character.biome === 'snow') {
      baseColor = rowType === 'road' ? 0x8a8f99 : colorMix(baseColor, 0xe4f4ff, 0.55);
    }
    if (character.biome === 'scifi') {
      baseColor = rowType === 'water' ? 0x3de2e7 : colorMix(baseColor, 0x8a5cff, 0.35);
    }

    const floorGeom = new THREE.BoxGeometry(LANE_WIDTH, 0.2, TILE_SIZE);
    const floor = new THREE.Mesh(
      floorGeom,
      new THREE.MeshLambertMaterial({ color: baseColor }),
    );
    floor.position.set(0, -0.1, 0);
    floor.receiveShadow = true;
    group.add(floor);

    if (rowType === 'road') {
      const stripeGeom = new THREE.BoxGeometry(0.5, 0.03, TILE_SIZE * 0.1);
      const stripeMat = new THREE.MeshLambertMaterial({ color: 0xf9e26f });
      for (let x = -Math.floor(LANE_WIDTH / 2); x <= Math.floor(LANE_WIDTH / 2); x += 2) {
        const stripe = new THREE.Mesh(stripeGeom, stripeMat);
        stripe.position.set(x, 0.03, 0);
        group.add(stripe);
      }
    }

    if (rowType === 'rail') {
      const railMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
      const sleeperMat = new THREE.MeshLambertMaterial({ color: 0x7b4c2a });
      for (const x of [-1.2, 1.2]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, TILE_SIZE), railMat);
        rail.position.set(x, 0.05, 0);
        group.add(rail);
      }
      for (let i = -5; i <= 5; i += 1) {
        const sleeper = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.05, 0.08), sleeperMat);
        sleeper.position.set(0, 0.02, i * 0.1);
        group.add(sleeper);
      }
    }

    if (rowType === 'grass' && !safe) {
      const treeCount = randInt(1, 4);
      const occupancy = this.emptyOccupancy();
      for (let i = 0; i < treeCount; i += 1) {
        const lane = this.pickFreeLane(occupancy);
        if (lane === null) break;
        occupancy[lane] = true;

        const x = this.laneIndices[lane];
        const trunk = new THREE.Mesh(
          new THREE.BoxGeometry(0.25, 0.35, 0.25),
          new THREE.MeshLambertMaterial({ color: 0x835b2a }),
        );
        const crown = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.6, 0.7),
          new THREE.MeshLambertMaterial({ color: character.biome === 'snow' ? 0xd9f5ff : 0x2e9d46 }),
        );
        trunk.position.set(x, 0.2, 0);
        crown.position.set(x, 0.65, 0);
        group.add(trunk, crown);
      }
      return {
        index,
        type: rowType,
        mesh: group,
        safe,
        speed: 0,
        direction: 1,
        occupancy,
      };
    }

    return {
      index,
      type: rowType,
      mesh: group,
      safe,
      speed: rand(1.4, 2.6) + difficulty * 0.12,
      direction: chance(0.5) ? 1 : -1,
      occupancy: this.emptyOccupancy(),
    };
  }

  private isSafeRow(index: number, difficulty: number, rowType: RowType): boolean {
    if (index <= 0) return true;
    const safeFrequency = Math.max(3, SAFE_ZONE_BASE - Math.floor(difficulty / 2));
    if (index % safeFrequency === 0) return true;
    return rowType === 'grass' && chance(0.3);
  }

  private pickRowType(index: number, difficulty: number): RowType {
    if (index <= 1) return 'grass';
    const roll = Math.random();
    const railWeight = Math.min(0.12 + difficulty * 0.01, 0.25);
    const waterWeight = Math.min(0.18 + difficulty * 0.015, 0.28);
    const roadWeight = Math.min(0.34 + difficulty * 0.02, 0.5);

    if (roll < railWeight) return 'rail';
    if (roll < railWeight + waterWeight) return 'water';
    if (roll < railWeight + waterWeight + roadWeight) return 'road';
    return 'grass';
  }

  private emptyOccupancy(): boolean[] {
    return Array.from({ length: LANE_WIDTH }, () => false);
  }

  private pickFreeLane(occupancy: boolean[]): number | null {
    const free = occupancy
      .map((occupied, index) => ({ occupied, index }))
      .filter((slot) => !slot.occupied)
      .map((slot) => slot.index);
    if (!free.length) return null;
    return free[randInt(0, free.length - 1)];
  }

  laneToX(lane: number): number {
    const centerOffset = Math.floor(LANE_WIDTH / 2);
    return lane - centerOffset;
  }

  xToLane(x: number): number {
    const centerOffset = Math.floor(LANE_WIDTH / 2);
    return Math.round(x + centerOffset);
  }

  getCharacterDefinition(characterId: string): CharacterDefinition {
    return CHARACTERS.find((c) => c.id === characterId) ?? CHARACTERS[0];
  }
}
