import {BulletData} from "../gameData/BulletData.ts";

export default class Bullet extends Phaser.GameObjects.Rectangle {
    private static readonly OFFSCREEN_MARGIN: number = 512;

    private _arcadeBody: Phaser.Physics.Arcade.Body;

    private _damage: number = 0;

    public get damage(): number {
        return this._damage;
    }

    public init() {
        this.scene.physics.add.existing(this);

        this._arcadeBody = this.body as Phaser.Physics.Arcade.Body;
        this._arcadeBody.allowGravity = false;
        this._arcadeBody.setFriction(0, 0);
    }

    public enable(x: number, y: number, velocityX: number, velocityY: number, data: BulletData) {
        this.setPosition(x, y);
        this.setSize(data.width, data.height);
        this.setOrigin(0.5);
        this.setFillStyle(data.color);

        this.scene.physics.world.add(this._arcadeBody);
        this.setActive(true);
        this.setVisible(true);

        this._arcadeBody.setVelocity(velocityX, velocityY);
        this._damage = data.damage;

        // Rotate the bullet to face the direction it's moving
        this.setRotation(this._arcadeBody.velocity.angle());

        // Maths way
        // this.setRotation(Math.atan2(velocityY, velocityX));

        // Arcade bodies can't rotate: fit the body to the rotated bullet bounds
        const cos: number = Math.abs(Math.cos(this.rotation));
        const sin: number = Math.abs(Math.sin(this.rotation));
        this._arcadeBody.setSize(data.width * cos + data.height * sin, data.width * sin + data.height * cos);
    }

    public disable() {
        this.scene.physics.world.disableBody(this._arcadeBody);
        this.setActive(false);
        this.setVisible(false);
    }

    update(timeSinceLaunch: number, deltaTime: number) {
        super.update(timeSinceLaunch, deltaTime);

        // Bullets can fly in any direction: recycle them when they get far enough from the visible part of the world.
        // The margin keeps alive the bullets shot by enemies that are still a bit off screen
        const view: Phaser.Geom.Rectangle = this.scene.cameras.main.worldView;
        if (this.x < view.left - Bullet.OFFSCREEN_MARGIN || this.x > view.right + Bullet.OFFSCREEN_MARGIN
            || this.y < view.top - Bullet.OFFSCREEN_MARGIN || this.y > view.bottom + Bullet.OFFSCREEN_MARGIN) {
            this.disable();
        }
    }
}