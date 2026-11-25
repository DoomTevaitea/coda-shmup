import type {BulletData} from '../gameData/BulletData.ts';
import type {SineEnemyData} from '../gameData/SineEnemyData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import SineMovement from "../components/SineMovement.ts";
import Weapon from "../components/Weapon.ts";

export default class SineEnemy extends Entity {
    private static readonly FORWARD_ANGLE: number = 90;
    private static readonly HIT_FLASH_COLOR: number = 0xffffff;
    private static readonly HIT_FLASH_DURATION: number = 50;
    private static readonly HIT_SLOWDOWN_FACTOR: number = 0.5;

    private _data: SineEnemyData;
    private _tint: number;
    private _shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private _shootTimer: Phaser.Time.TimerEvent;

    // Furthest horizontal distance from the spawn point, used to keep the whole wave on screen
    public get horizontalReach(): number {
        return (this.getComponent(SineMovement)?.amplitude ?? 0) + this.displayWidth / 2;
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: SineEnemyData) {
        this._data = data;
        this._tint = Phaser.Display.Color.HexStringToColor(data.tint).color;

        const bulletData: BulletData = {
            ...data.spreadShot.bullet,
            color: Phaser.Display.Color.HexStringToColor(data.spreadShot.bullet.color).color
        };

        this.addComponent(new Health(data.health, this));
        this.addComponent(new Movement(data.movement.verticalSpeed));
        this.addComponent(new SineMovement(data.movement));
        this.addComponent(new Weapon(bulletsGroup, bulletData));

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(SineEnemy.HIT_FLASH_COLOR);

            if (health.current == 0) {
                this.disableBody();
            }

            this.scene.time.delayedCall(SineEnemy.HIT_FLASH_DURATION, () => {
                this.setTint(this._tint);

                if (health.current == 0) {
                    this.disable();
                }
            });
        });

        this.angle = SineEnemy.FORWARD_ANGLE;
        this.setTexture('sprites', data.texture);
        this.setScale(data.scale);
        this.setTint(this._tint);

        this._shootTimerConfig = {
            delay: data.spreadShot.delay,
            callback: this.shoot,
            callbackScope: this,
            loop: true
        };
        this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);

        // The body follows the sprite scale, the radius is given in unscaled pixels
        this.arcadeBody.setCircle(this.width / 2);
    }

    public enable(x: number, y: number) {
        this.enableBody(true, x, y - this.displayHeight, true, true);
        this._shootTimer.reset(this._shootTimerConfig);
        this.setTint(this._tint);

        // Restore health, in case the enemy is reused from the pool, without emitting events
        const health = this.getComponent(Health);
        health?.heal(health.max, false);

        this.getComponent(SineMovement)?.reset(x);
    }

    public disable() {
        this.disableBody(true, true);
        this._shootTimer.paused = true;
    }

    private shoot() {
        const spreadShot = this._data.spreadShot;
        this.getComponent(Weapon)?.shootSpread(this, spreadShot.bulletCount, spreadShot.spreadAngle);
        this.scene.sound.play('sfx_laser2');
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // Destroy entities when out of screen
        if (this.y > this.scene.cameras.main.height + this.displayHeight) {
            this.disable();
            return;
        }

        // Slow down while flashing white after a hit
        const moveDeltaTime: number = this.tintFill ? deltaTime * SineEnemy.HIT_SLOWDOWN_FACTOR : deltaTime;
        this.getComponent(Movement)?.moveVertically(this, moveDeltaTime);
        this.getComponent(SineMovement)?.moveHorizontally(this, moveDeltaTime);
    }
}
