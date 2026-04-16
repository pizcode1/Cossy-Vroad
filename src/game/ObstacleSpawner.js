import * as THREE from 'three';
import { rand, randInt } from '../core/utils';
import { LANE_WIDTH } from './config';
export class ObstacleSpawner {
    scene;
    group = new THREE.Group();
    hazards = [];
    nextId = 1;
    pool = [];
    laneHalf = Math.floor(LANE_WIDTH / 2);
    spawnTimers = new Map();
    trainCooldown = new Map();
    constructor(scene) {
        this.scene = scene;
        this.scene.add(this.group);
    }
    reset() {
        for (const hazard of this.hazards) {
            this.recycleMesh(hazard.mesh);
        }
        this.hazards = [];
        this.spawnTimers.clear();
        this.trainCooldown.clear();
    }
    update(delta, activeRows, difficulty) {
        for (const row of activeRows) {
            if (row.safe)
                continue;
            const prev = this.spawnTimers.get(row.index) ?? rand(0.3, 1.2);
            const reduced = prev - delta;
            if (reduced <= 0) {
                this.spawnForRow(row, difficulty);
                const cooldown = row.type === 'road' ? rand(0.65, 1.4) : rand(1.8, 3.3);
                this.spawnTimers.set(row.index, cooldown / (1 + difficulty * 0.04));
            }
            else {
                this.spawnTimers.set(row.index, reduced);
            }
        }
        for (const hazard of this.hazards) {
            if (!hazard.active)
                continue;
            hazard.mesh.position.x += hazard.direction * hazard.speed * delta;
            if (Math.abs(hazard.mesh.position.x) > this.laneHalf + 6) {
                hazard.active = false;
                hazard.mesh.visible = false;
            }
        }
    }
    spawnForRow(row, difficulty) {
        if (row.type === 'grass')
            return;
        if (row.type === 'rail') {
            const cd = this.trainCooldown.get(row.index) ?? 0;
            if (cd > 0) {
                this.trainCooldown.set(row.index, cd - 1);
                return;
            }
            this.trainCooldown.set(row.index, randInt(3, 6));
            this.spawnHazard(row, 'train', rand(8, 11) + difficulty * 0.35, randInt(4, 5));
            return;
        }
        if (row.type === 'water') {
            this.spawnHazard(row, 'log', rand(1.2, 2) + difficulty * 0.09, randInt(2, 3));
            return;
        }
        this.spawnHazard(row, 'vehicle', rand(2.5, 5.5) + difficulty * 0.2, randInt(1, 2));
    }
    spawnHazard(row, type, speed, length) {
        const mesh = this.getMesh(type, length);
        const direction = row.direction;
        const spawnX = direction === 1 ? -this.laneHalf - length - 1 : this.laneHalf + length + 1;
        mesh.position.set(spawnX, 0.45, row.index);
        mesh.visible = true;
        const entity = {
            id: this.nextId++,
            type,
            rowIndex: row.index,
            laneX: spawnX,
            speed,
            direction,
            length,
            active: true,
            mesh,
        };
        this.hazards.push(entity);
    }
    activeHazards() {
        return this.hazards.filter((hazard) => hazard.active);
    }
    cleanupRows(minRow) {
        for (const hazard of this.hazards) {
            if (hazard.rowIndex < minRow && hazard.active) {
                hazard.active = false;
                hazard.mesh.visible = false;
            }
        }
    }
    getMesh(type, length) {
        const pooled = this.pool.pop();
        if (pooled) {
            pooled.scale.set(length, 1, 1);
            return pooled;
        }
        const geometry = new THREE.BoxGeometry(0.95, type === 'train' ? 1.15 : 0.8, 0.9);
        let color = 0xd24736;
        if (type === 'log')
            color = 0x8c5828;
        if (type === 'train')
            color = 0x51545f;
        const material = new THREE.MeshLambertMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        this.group.add(mesh);
        mesh.scale.set(length, 1, 1);
        return mesh;
    }
    recycleMesh(mesh) {
        mesh.visible = false;
        this.pool.push(mesh);
    }
}
//# sourceMappingURL=ObstacleSpawner.js.map