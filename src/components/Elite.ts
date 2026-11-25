import {GameObjects, Scene} from "phaser";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import Health from "./Health.ts";
import Movement from "./Movement.ts";
import Weapon from "./Weapon.ts";
import type {EliteData, ElitePower} from "../gameData/EliteData.ts";

// Turns a regular pooled enemy into an elite for one life: bigger, tougher, with a golden aura and a power.
// Must be activated or deactivated on every spawn, since pooled enemies are reused
export default class Elite implements IComponent {
    private static readonly FULL_CIRCLE_DEGREES: number = 360;
    private static readonly AURA_WIDTH: number = 6;
    private static readonly AURA_PULSE_SPEED: number = 0.006;
    private static readonly AURA_MIN_ALPHA: number = 0.4;
    private static readonly SHIELD_WIDTH: number = 5;
    private static readonly SHIELD_MARGIN: number = 14;
    // Above the enemy sprite
    private static readonly DEPTH: number = 1;

    public enabled: boolean = true;

    private readonly _graphics: GameObjects.Graphics;
    private _data: EliteData | null = null;
    private _power: ElitePower | null = null;
    private _baseScale: number = 1;
    private _novaTimer: number = 0;
    private _elapsed: number = 0;

    public get isElite(): boolean {
        return this._power !== null;
    }

    public get xpMultiplier(): number {
        return this._power && this._data ? this._data.xpMultiplier : 1;
    }

    public constructor(scene: Scene) {
        this._graphics = scene.add.graphics().setDepth(Elite.DEPTH);
    }

    // Call after the enemy enable(): health and speed are then already set for the current difficulty
    public activate(entity: Entity, data: EliteData, power: ElitePower) {
        this._data = data;
        this._power = power;
        this._baseScale = entity.scale;
        this._novaTimer = 0;
        entity.setScale(this._baseScale * data.scale);

        const health = entity.getComponent(Health);
        if (health) {
            health.setMax(Math.round(health.max * data.healthMultiplier));
            health.heal(health.max, false);
            health.shieldHits = power === 'shield' ? data.shield.hits : 0;
        }

        if (power === 'haste') {
            const movement = entity.getComponent(Movement);
            movement?.setSpeed(movement.speed * data.haste.speedMultiplier);
        }
    }

    public deactivate(entity: Entity) {
        if (this._power)
            entity.setScale(this._baseScale);

        const health = entity.getComponent(Health);
        if (health)
            health.shieldHits = 0;

        this._power = null;
        this._graphics.clear();
    }

    public update(entity: Entity, deltaTime: number) {
        this._graphics.clear();
        if (!this.enabled || !this._power || !this._data)
            return;

        this._elapsed += deltaTime;
        const radius: number = entity.displayWidth / 2;
        const pulse: number = Elite.AURA_MIN_ALPHA
            + (1 - Elite.AURA_MIN_ALPHA) * (0.5 + 0.5 * Math.sin(this._elapsed * Elite.AURA_PULSE_SPEED));
        this._graphics.lineStyle(Elite.AURA_WIDTH, Phaser.Display.Color.HexStringToColor(this._data.color).color, pulse)
            .strokeCircle(entity.x, entity.y, radius);

        if ((entity.getComponent(Health)?.shieldHits ?? 0) > 0) {
            this._graphics.lineStyle(Elite.SHIELD_WIDTH, Phaser.Display.Color.HexStringToColor(this._data.shield.color).color)
                .strokeCircle(entity.x, entity.y, radius + Elite.SHIELD_MARGIN);
        }

        if (this._power === 'nova') {
            this._novaTimer += deltaTime;
            if (this._novaTimer >= this._data.nova.delay) {
                this._novaTimer = 0;
                entity.getComponent(Weapon)?.shootSpread(entity, this._data.nova.bulletCount, Elite.FULL_CIRCLE_DEGREES);
            }
        }
    }

    // When the enemy is recycled or dies
    public hide() {
        this._graphics.clear();
    }
}
