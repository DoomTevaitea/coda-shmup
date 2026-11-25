import {GameObjects, Scene} from "phaser";
import Entity from "../entities/Entity.ts";
import Health from "../components/Health.ts";
import type {ShieldData} from "../gameData/WeaponsData.ts";
import {valueAtLevel} from "./CombatTargets.ts";

// A bubble blocking hits, using the owner Health shield. Once broken, it recharges after a delay
export default class ShieldWeapon {
    private static readonly MIN_RECHARGE_DELAY: number = 2000;
    private static readonly BUBBLE_MARGIN: number = 22;
    private static readonly BUBBLE_WIDTH: number = 5;
    private static readonly BUBBLE_FILL_ALPHA: number = 0.12;
    private static readonly DEPTH: number = 1;

    private readonly _data: ShieldData;
    private readonly _graphics: GameObjects.Graphics;
    private readonly _color: number;
    private _level: number = 0;
    private _rechargeTimer: number = 0;

    public constructor(scene: Scene, data: ShieldData) {
        this._data = data;
        this._color = Phaser.Display.Color.HexStringToColor(data.color).color;
        this._graphics = scene.add.graphics().setDepth(ShieldWeapon.DEPTH);
    }

    private get hits(): number {
        return this._data.hits + Math.floor(this._level / this._data.extraHitEveryLevels);
    }

    // The shield starts full when unlocked or upgraded
    public setLevel(owner: Entity, level: number) {
        const isUpgrade: boolean = level > this._level;
        this._level = level;

        const health = owner.getComponent(Health);
        if (health && isUpgrade) {
            health.shieldHits = this.hits;
            this._rechargeTimer = 0;
        }
    }

    public update(owner: Entity, deltaTime: number) {
        this._graphics.clear();
        const health = owner.getComponent(Health);
        if (this._level <= 0 || !health)
            return;

        if (health.shieldHits <= 0) {
            this._rechargeTimer += deltaTime;
            const delay: number = Math.max(ShieldWeapon.MIN_RECHARGE_DELAY,
                valueAtLevel(this._data.rechargeDelay, this._data.rechargeDelayPerLevel, this._level));
            if (this._rechargeTimer >= delay) {
                this._rechargeTimer = 0;
                health.shieldHits = this.hits;
            }
            return;
        }

        const radius: number = owner.displayWidth / 2 + ShieldWeapon.BUBBLE_MARGIN;
        this._graphics.fillStyle(this._color, ShieldWeapon.BUBBLE_FILL_ALPHA).fillCircle(owner.x, owner.y, radius)
            .lineStyle(ShieldWeapon.BUBBLE_WIDTH, this._color).strokeCircle(owner.x, owner.y, radius);
    }

    public hide() {
        this._level = 0;
        this._graphics.clear();
    }
}
