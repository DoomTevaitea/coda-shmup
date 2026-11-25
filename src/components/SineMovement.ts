import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import {SineMovementData} from "../gameData/ConfigurableEnemyData.ts";

// Makes an entity weave sideways, following a sine wave around the path it is flying along
export default class SineMovement implements IComponent {
    public enabled: boolean = true;

    private readonly _amplitude: number;
    private readonly _period: number;
    private _elapsedTime: number = 0;
    private _previousOffset: number = 0;

    public constructor(data: SineMovementData) {
        this._amplitude = data.amplitude;
        this._period = data.period;
    }

    // Must be called on each spawn: pooled entities keep the wave state of their previous life
    public reset() {
        this._elapsedTime = 0;
        this._previousOffset = 0;
    }

    public moveSideways(entity: Entity, deltaTime: number) {
        if (!this.enabled || this._period <= 0)
            return;

        this._elapsedTime += deltaTime;

        const phase: number = (this._elapsedTime / this._period) * Phaser.Math.PI2;
        const offset: number = Math.sin(phase) * this._amplitude;

        // Only apply the change of offset since last frame, perpendicular to the entity heading,
        // so the wave follows the entity even when it turns
        const sideRotation: number = entity.rotation + Math.PI / 2;
        const offsetDelta: number = offset - this._previousOffset;
        entity.x += Math.cos(sideRotation) * offsetDelta;
        entity.y += Math.sin(sideRotation) * offsetDelta;

        this._previousOffset = offset;
    }
}
