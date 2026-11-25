import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Movement implements IComponent {
    public enabled: boolean = true;

    private _speed: number = 0;

    public constructor(speed?: number) {
        if (speed) {
            this._speed = speed;
        }
    }

    public get speed(): number {
        return this._speed;
    }

    public setSpeed(speed: number) {
        this._speed = speed;
    }

    // Moves the entity in the direction it is facing
    public moveForward(entity: Entity, deltaTime: number) {
        if (!this.enabled)
            return;

        entity.x += Math.cos(entity.rotation) * this._speed * deltaTime;
        entity.y += Math.sin(entity.rotation) * this._speed * deltaTime;
    }
}