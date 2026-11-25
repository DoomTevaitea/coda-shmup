import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import Bullet from "../entities/Bullet.ts";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    private static readonly FULL_CIRCLE_DEGREES: number = 360;

    public enabled: boolean = true;

    private readonly _bullets: Physics.Arcade.Group;
    private readonly _bulletData: BulletData;

    constructor(bullets: Physics.Arcade.Group, bulletData: BulletData) {
        if (!bullets) {
            console.error("Weapon 'bullets' group cannot be null or undefined");
        }

        this._bullets = bullets;
        this._bulletData = bulletData;
    }

    public shoot(source: Entity) {
        this.shootAtAngle(source, source.rotation);
    }

    // Shoots bulletCount bullets fanned out over spreadAngle degrees, centered on the source forward direction
    public shootSpread(source: Entity, bulletCount: number, spreadAngle: number) {
        if (bulletCount <= 1) {
            this.shoot(source);
            return;
        }

        const spread: number = Phaser.Math.DegToRad(spreadAngle);
        // On a full circle, the first and last bullets would overlap: share the circle between all bullets instead
        const step: number = spreadAngle >= Weapon.FULL_CIRCLE_DEGREES
            ? spread / bulletCount
            : spread / (bulletCount - 1);
        const firstAngle: number = source.rotation - spread / 2;

        for (let i: number = 0; i < bulletCount; i++) {
            this.shootAtAngle(source, firstAngle + i * step);
        }
    }

    private shootAtAngle(source: Entity, angle: number) {
        if (!this.enabled)
            return;

        if (!this._bullets)
            return;

        const bullet: Bullet = this._bullets.get() as Bullet;
        if (bullet) {
            // Get the direction vector the bullet will follow
            const sourceForward: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0).rotate(angle);
            const bulletVelocity: Phaser.Math.Vector2 = sourceForward.clone().scale(this._bulletData.speed);
            bullet.enable(source.x + sourceForward.x * source.arcadeBody.radius, source.y + sourceForward.y * source.arcadeBody.radius,
                bulletVelocity.x, bulletVelocity.y, this._bulletData);

            // Maths way
            // const forwardVectorX: number = Math.cos(angle);
            // const forwardVectorY: number = Math.sin(angle);
            // const bulletVelocityX: number = forwardVectorX * this._bulletData.speed;
            // const bulletVelocityY: number = forwardVectorY * this._bulletData.speed;
            // bullet.enable(source.x + forwardVectorX * source.arcadeBody.radius, source.y + forwardVectorY * source.arcadeBody.radius,
            //     bulletVelocityX, bulletVelocityY, this._bulletData);
        }
    }
}