import {GameObjects, Scene} from "phaser";
import Entity from "../entities/Entity.ts";
import type {DronesData} from "../gameData/WeaponsData.ts";
import CombatTargets, {valueAtLevel} from "./CombatTargets.ts";

// Drones orbiting the owner, hurting the enemies they touch. One drone per level
export default class DroneWeapon {
    private static readonly GLOW_ALPHA: number = 0.3;
    private static readonly GLOW_SCALE: number = 1.8;
    private static readonly CORE_COLOR: number = 0xffffff;
    private static readonly CORE_SCALE: number = 0.4;
    private static readonly DEPTH: number = 1;

    private readonly _data: DronesData;
    private readonly _targets: CombatTargets;
    private readonly _graphics: GameObjects.Graphics;
    private readonly _color: number;
    private _level: number = 0;
    private _elapsed: number = 0;
    // Last time each enemy was hurt by the drones, so an enemy touching a drone isn't hurt every frame
    private readonly _lastHitTimes: Map<Entity, number> = new Map();

    public constructor(scene: Scene, data: DronesData, targets: CombatTargets) {
        this._data = data;
        this._targets = targets;
        this._color = Phaser.Display.Color.HexStringToColor(data.color).color;
        this._graphics = scene.add.graphics().setDepth(DroneWeapon.DEPTH);
    }

    public setLevel(level: number) {
        this._level = level;
    }

    public update(owner: Entity, deltaTime: number, enemies: Entity[]) {
        this._graphics.clear();
        if (this._level <= 0)
            return;

        this._elapsed += deltaTime;
        const damage: number = valueAtLevel(this._data.damage, this._data.damagePerLevel, this._level);
        const baseAngle: number = Phaser.Math.DegToRad(this._data.rotationSpeed) * this._elapsed / 1000;

        for (let i: number = 0; i < this._level; i++) {
            const angle: number = baseAngle + Phaser.Math.PI2 * i / this._level;
            const x: number = owner.x + Math.cos(angle) * this._data.radius;
            const y: number = owner.y + Math.sin(angle) * this._data.radius;

            this._graphics.fillStyle(this._color, DroneWeapon.GLOW_ALPHA)
                .fillCircle(x, y, this._data.size * DroneWeapon.GLOW_SCALE)
                .fillStyle(this._color)
                .fillCircle(x, y, this._data.size)
                .fillStyle(DroneWeapon.CORE_COLOR)
                .fillCircle(x, y, this._data.size * DroneWeapon.CORE_SCALE);

            for (const enemy of enemies) {
                const touchDistance: number = this._data.size + enemy.displayWidth / 2;
                if (Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) > touchDistance)
                    continue;

                const lastHitTime: number = this._lastHitTimes.get(enemy) ?? Number.NEGATIVE_INFINITY;
                if (this._elapsed - lastHitTime < this._data.hitCooldown)
                    continue;

                this._lastHitTimes.set(enemy, this._elapsed);
                this._targets.damageEnemy(enemy, damage);
            }
        }
    }

    public hide() {
        this._graphics.clear();
        this._level = 0;
    }
}
