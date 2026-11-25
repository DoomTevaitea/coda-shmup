import {toBulletData} from '../gameData/BulletData.ts';
import type {ConfigurableEnemyData} from '../gameData/ConfigurableEnemyData.ts';
import type {EnemyDifficulty} from '../gameData/ProgressionData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import SineMovement from "../components/SineMovement.ts";
import Steering from "../components/Steering.ts";
import Weapon from "../components/Weapon.ts";

// An enemy entirely described by a JSON file: look, health, XP, spawn rate, chase speed, sine weaving and spread shot.
// The same class gives the sine enemy, the fast one and the tank, only their JSON differ
export default class ConfigurableEnemy extends Entity {
    private static readonly HIT_FLASH_COLOR: number = 0xffffff;
    private static readonly HIT_FLASH_DURATION: number = 50;
    private static readonly HIT_SLOWDOWN_FACTOR: number = 0.5;

    private _data: ConfigurableEnemyData;
    private _target: Entity;
    private _despawnDistance: number;
    private _tint: number;
    private _shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private _shootTimer: Phaser.Time.TimerEvent;

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: ConfigurableEnemyData, target: Entity, despawnDistance: number) {
        this._data = data;
        this._target = target;
        this._despawnDistance = despawnDistance;
        this._tint = Phaser.Display.Color.HexStringToColor(data.tint).color;

        this.addComponent(new Health(data.health, this));
        this.addComponent(new Movement(data.movement.speed));
        this.addComponent(new Steering(data.movement.turnSpeed));
        this.addComponent(new SineMovement(data.movement));
        this.addComponent(new Weapon(bulletsGroup, toBulletData(data.spreadShot.bullet)));

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(ConfigurableEnemy.HIT_FLASH_COLOR);

            if (health.current == 0) {
                this.disableBody();
            }

            this.scene.time.delayedCall(ConfigurableEnemy.HIT_FLASH_DURATION, () => {
                this.setTint(this._tint);

                if (health.current == 0) {
                    this.disable();
                }
            });
        });

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

    public enable(x: number, y: number, difficulty: EnemyDifficulty) {
        this.enableBody(true, x, y, true, true);
        this.rotation = Phaser.Math.Angle.Between(x, y, this._target.x, this._target.y);
        this._shootTimer.reset(this._shootTimerConfig);
        this.setTint(this._tint);

        // The pooled enemy may come from an easier time of the game: apply the current difficulty
        this.getComponent(Movement)?.setSpeed(this._data.movement.speed * difficulty.speedMultiplier);

        // Restore health, in case the enemy is reused from the pool, without emitting events
        const health = this.getComponent(Health);
        health?.setMax(this._data.health + difficulty.healthBonus);
        health?.heal(health.max, false);

        this.getComponent(SineMovement)?.reset();
    }

    public disable() {
        this.disableBody(true, true);
        this._shootTimer.paused = true;
    }

    private shoot() {
        // Some enemies only ram the player
        const spreadShot = this._data.spreadShot;
        if (spreadShot.bulletCount <= 0)
            return;

        this.getComponent(Weapon)?.shootSpread(this, spreadShot.bulletCount, spreadShot.spreadAngle);
        this.scene.sound.play('sfx_laser2');
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // Recycle enemies left far behind
        if (Phaser.Math.Distance.Between(this.x, this.y, this._target.x, this._target.y) > this._despawnDistance) {
            this.disable();
            return;
        }

        // Chase the target while weaving sideways, slowed down while flashing white after a hit
        const moveDeltaTime: number = this.tintFill ? deltaTime * ConfigurableEnemy.HIT_SLOWDOWN_FACTOR : deltaTime;
        this.getComponent(Steering)?.turnToward(this, this._target.x, this._target.y, moveDeltaTime);
        this.getComponent(Movement)?.moveForward(this, moveDeltaTime);
        this.getComponent(SineMovement)?.moveSideways(this, moveDeltaTime);
    }
}
