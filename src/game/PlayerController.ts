import * as THREE from 'three';
import type { CharacterDefinition } from './config';
import { clamp } from '../core/utils';

type MoveRequest = { dx: number; dz: number };

export class PlayerController {
  readonly group = new THREE.Group();
  readonly body: THREE.Mesh;
  private queue: MoveRequest[] = [];
  private moving = false;
  private moveTimer = 0;
  private moveDuration = 0.1;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private bounce = 0;

  lane = 0;
  row = 0;

  constructor(private readonly scene: THREE.Scene) {
    const material = new THREE.MeshLambertMaterial({ color: 0xffd454 });
    this.body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.8), material);
    this.body.castShadow = true;

    const beak = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.18, 0.2),
      new THREE.MeshLambertMaterial({ color: 0xf18a2e }),
    );
    beak.position.set(0, 0.1, 0.45);
    this.body.add(beak);

    this.group.add(this.body);
    this.group.position.y = 0.45;
    this.scene.add(this.group);
  }

  reset(character: CharacterDefinition): void {
    (this.body.material as THREE.MeshLambertMaterial).color.setHex(character.primaryColor);
    const beak = this.body.children[0] as THREE.Mesh;
    (beak.material as THREE.MeshLambertMaterial).color.setHex(character.accentColor);

    this.lane = 0;
    this.row = 0;
    this.group.position.set(0, 0.45, 0);
    this.queue = [];
    this.moving = false;
    this.moveDuration = character.moveCooldown;
  }

  enqueueMove(dx: number, dz: number): void {
    if (this.queue.length < 3) {
      this.queue.push({ dx, dz });
    }
  }

  update(delta: number, laneLimit: number): boolean {
    let movedForward = false;

    if (!this.moving && this.queue.length) {
      const req = this.queue.shift()!;
      const targetLane = clamp(this.lane + req.dx, -laneLimit, laneLimit);
      const targetRow = this.row + req.dz;
      if (targetLane !== this.lane || targetRow !== this.row) {
        this.moving = true;
        this.moveTimer = 0;
        this.from.copy(this.group.position);
        this.to.set(targetLane, 0.45, targetRow);
        movedForward = targetRow > this.row;
        this.lane = targetLane;
        this.row = targetRow;
      }
    }

    if (this.moving) {
      this.moveTimer += delta;
      const t = clamp(this.moveTimer / this.moveDuration, 0, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      this.group.position.lerpVectors(this.from, this.to, eased);
      this.bounce = Math.sin(Math.PI * t) * 0.17;
      if (t >= 1) {
        this.moving = false;
        this.bounce = 0;
      }
    }

    this.body.scale.set(1 + this.bounce * 0.3, 1 - this.bounce * 0.25, 1 + this.bounce * 0.3);
    return movedForward;
  }

  getPosition(): THREE.Vector3 {
    return this.group.position;
  }
}
