import {Physics} from 'phaser';
import {BulletData} from "../gameData/BulletData.ts";
import Bullet from "../entities/Bullet.ts";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

export default class Weapon implements IComponent {
    private static readonly FULL_CIRCLE_DEGREES: number = 360;

    public enabled: boolean = true;
    // Added to the damage of every bullet shot, e.g. from player upgrades
    public damageBonus: number = 0;

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

    // Shoots bulletCount bullets fanned out over spreadAngle degrees, centered on centerAngle (radians),
    // which is the source forward direction by default
    public shootSpread(source: Entity, bulletCount: number, spreadAngle: number, centerAngle: number = source.rotation) {
        if (bulletCount <= 1) {
            this.shootAtAngle(source, centerAngle);
            return;
        }

        const spread: number = Phaser.Math.DegToRad(spreadAngle);
        // On a full circle, the first and last bullets would overlap: share the circle between all bullets instead
        const step: number = spreadAngle >= Weapon.FULL_CIRCLE_DEGREES
            ? spread / bulletCount
            : spread / (bulletCount - 1);
        const firstAngle: number = centerAngle - spread / 2;

        for (let i: number = 0; i < bulletCount; i++) {
            this.shootAtAngle(source, firstAngle + i * step);
        }
    }

    // Shoots one bullet in any direction, whatever the source is facing (radians)
    public shootAtAngle(source: Entity, angle: number) {
        if (!this.enabled)
            return;

        if (!this._bullets)
            return;

        const bullet: Bullet = this._bullets.get() as Bullet;
        if (bullet) {
            const bulletData: BulletData = {...this._bulletData, damage: this._bulletData.damage + this.damageBonus};

            // Get the direction vector the bullet will follow
            const sourceForward: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0).rotate(angle);
            const bulletVelocity: Phaser.Math.Vector2 = sourceForward.clone().scale(bulletData.speed);
            bullet.enable(source.x + sourceForward.x * source.arcadeBody.radius, source.y + sourceForward.y * source.arcadeBody.radius,
                bulletVelocity.x, bulletVelocity.y, bulletData);

            // Maths way
            // const forwardVectorX: number = Math.cos(angle);
            // const forwardVectorY: number = Math.sin(angle);
            // const bulletVelocityX: number = forwardVectorX * bulletData.speed;
            // const bulletVelocityY: number = forwardVectorY * bulletData.speed;
            // bullet.enable(source.x + forwardVectorX * source.arcadeBody.radius, source.y + forwardVectorY * source.arcadeBody.radius,
            //     bulletVelocityX, bulletVelocityY, bulletData);
        }
    }
}