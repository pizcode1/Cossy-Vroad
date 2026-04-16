import * as THREE from 'three';
import { clamp } from '../core/utils';
export class PlayerController {
    scene;
    group = new THREE.Group();
    body;
    queue = [];
    moving = false;
    moveTimer = 0;
    moveDuration = 0.1;
    from = new THREE.Vector3();
    to = new THREE.Vector3();
    bounce = 0;
    lane = 0;
    row = 0;
    constructor(scene) {
        this.scene = scene;
        const material = new THREE.MeshLambertMaterial({ color: 0xffd454 });
        this.body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.75, 0.8), material);
        this.body.castShadow = true;
        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.2), new THREE.MeshLambertMaterial({ color: 0xf18a2e }));
        beak.position.set(0, 0.1, 0.45);
        this.body.add(beak);
        this.group.add(this.body);
        this.group.position.y = 0.45;
        this.scene.add(this.group);
    }
    reset(character) {
        this.body.material.color.setHex(character.primaryColor);
        const beak = this.body.children[0];
        beak.material.color.setHex(character.accentColor);
        this.lane = 0;
        this.row = 0;
        this.group.position.set(0, 0.45, 0);
        this.queue = [];
        this.moving = false;
        this.moveDuration = character.moveCooldown;
    }
    enqueueMove(dx, dz) {
        if (this.queue.length < 3) {
            this.queue.push({ dx, dz });
        }
    }
    update(delta, laneLimit) {
        let movedForward = false;
        if (!this.moving && this.queue.length) {
            const req = this.queue.shift();
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
    getPosition() {
        return this.group.position;
    }
}
//# sourceMappingURL=PlayerController.js.map