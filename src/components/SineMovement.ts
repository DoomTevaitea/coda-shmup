import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import {SineMovementData} from "../gameData/SineEnemyData.ts";

// Moves an entity left and right around an origin, following a sine wave
export default class SineMovement implements IComponent {
    public enabled: boolean = true;

    private readonly _amplitude: number;
    private readonly _period: number;
    private _originX: number = 0;
    private _elapsedTime: number = 0;

    public get amplitude(): number {
        return this._amplitude;
    }

    public constructor(data: SineMovementData) {
        this._amplitude = data.amplitude;
        this._period = data.period;
    }

    // Must be called on each spawn: pooled entities keep the wave state of their previous life
    public reset(originX: number) {
        this._originX = originX;
        this._elapsedTime = 0;
    }

    public moveHorizontally(entity: Entity, deltaTime: number) {
        if (!this.enabled || this._period <= 0)
            return;

        this._elapsedTime += deltaTime;

        const phase: number = (this._elapsedTime / this._period) * Phaser.Math.PI2;
        entity.x = this._originX + Math.sin(phase) * this._amplitude;
    }
}
