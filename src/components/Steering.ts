import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

// Turns an entity toward a point, with a limited turn speed so it moves in curves instead of snapping
export default class Steering implements IComponent {
    private static readonly MS_PER_SECOND: number = 1000;

    public enabled: boolean = true;

    // Degrees per second
    private _turnSpeed: number = 0;

    public constructor(turnSpeed?: number) {
        if (turnSpeed) {
            this._turnSpeed = turnSpeed;
        }
    }

    public setTurnSpeed(turnSpeed: number) {
        this._turnSpeed = turnSpeed;
    }

    public turnToward(entity: Entity, x: number, y: number, deltaTime: number) {
        if (!this.enabled)
            return;

        const targetRotation: number = Phaser.Math.Angle.Between(entity.x, entity.y, x, y);
        const maxTurn: number = Phaser.Math.DegToRad(this._turnSpeed) * deltaTime / Steering.MS_PER_SECOND;
        entity.rotation = Phaser.Math.Angle.RotateTo(entity.rotation, targetRotation, maxTurn);
    }
}
