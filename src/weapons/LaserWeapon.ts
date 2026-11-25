import {GameObjects, Scene} from "phaser";
import Entity from "../entities/Entity.ts";
import type {PiercingLaserData} from "../gameData/WeaponsData.ts";
import CombatTargets, {valueAtLevel} from "./CombatTargets.ts";

// A beam fired where the owner aims, hurting every enemy along it at once
export default class LaserWeapon {
    private static readonly MIN_DELAY: number = 600;
    private static readonly CORE_COLOR: number = 0xffffff;
    private static readonly CORE_WIDTH_RATIO: number = 0.35;
    private static readonly DEPTH: number = 2;

    private readonly _data: PiercingLaserData;
    private readonly _targets: CombatTargets;
    private readonly _graphics: GameObjects.Graphics;
    private readonly _color: number;
    private _level: number = 0;
    private _timer: number = 0;
    // Beam currently shown, fading out
    private _beam: Phaser.Geom.Line | null = null;
    private _beamWidth: number = 0;
    private _beamAge: number = 0;

    public constructor(scene: Scene, data: PiercingLaserData, targets: CombatTargets) {
        this._data = data;
        this._targets = targets;
        this._color = Phaser.Display.Color.HexStringToColor(data.color).color;
        this._graphics = scene.add.graphics().setDepth(LaserWeapon.DEPTH);
    }

    public setLevel(level: number) {
        this._level = level;
    }

    public update(owner: Entity, deltaTime: number, enemies: Entity[], aimRotation: number) {
        if (this._level > 0) {
            this._timer += deltaTime;
            const delay: number = Math.max(LaserWeapon.MIN_DELAY,
                valueAtLevel(this._data.delay, this._data.delayPerLevel, this._level));
            if (this._timer >= delay) {
                this._timer = 0;
                this.fire(owner, enemies, aimRotation);
            }
        }

        this.drawBeam(deltaTime);
    }

    private fire(owner: Entity, enemies: Entity[], aimRotation: number) {
        this._beamWidth = valueAtLevel(this._data.width, this._data.widthPerLevel, this._level);
        this._beamAge = 0;
        this._beam = new Phaser.Geom.Line(owner.x, owner.y,
            owner.x + Math.cos(aimRotation) * this._data.length, owner.y + Math.sin(aimRotation) * this._data.length);

        const damage: number = valueAtLevel(this._data.damage, this._data.damagePerLevel, this._level);
        for (const enemy of enemies) {
            const hitCircle = new Phaser.Geom.Circle(enemy.x, enemy.y, enemy.displayWidth / 2 + this._beamWidth / 2);
            if (Phaser.Geom.Intersects.LineToCircle(this._beam, hitCircle))
                this._targets.damageEnemy(enemy, damage);
        }
    }

    private drawBeam(deltaTime: number) {
        this._graphics.clear();
        if (!this._beam)
            return;

        this._beamAge += deltaTime;
        const alpha: number = 1 - this._beamAge / this._data.duration;
        if (alpha <= 0) {
            this._beam = null;
            return;
        }

        this._graphics.lineStyle(this._beamWidth, this._color, alpha).strokeLineShape(this._beam)
            .lineStyle(this._beamWidth * LaserWeapon.CORE_WIDTH_RATIO, LaserWeapon.CORE_COLOR, alpha)
            .strokeLineShape(this._beam);
    }

    public hide() {
        this._level = 0;
        this._beam = null;
        this._graphics.clear();
    }
}
