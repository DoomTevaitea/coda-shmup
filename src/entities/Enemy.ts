import {toBulletData} from '../gameData/BulletData.ts';
import type {EnemyData} from '../gameData/EnemyData.ts';
import type {EnemyDifficulty} from '../gameData/ProgressionData.ts';
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Steering from "../components/Steering.ts";
import Weapon from "../components/Weapon.ts";

export default class Enemy extends Entity {
    private static readonly HIT_SLOWDOWN_FACTOR: number = 0.5;

    private _data: EnemyData;
    private _target: Entity;
    private _despawnDistance: number;
    private _shootTimerConfig: Phaser.Types.Time.TimerEventConfig;
    private _shootTimer: Phaser.Time.TimerEvent;

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: EnemyData, target: Entity, despawnDistance: number) {
        this._data = data;
        this._target = target;
        this._despawnDistance = despawnDistance;

        this.addComponent(new Health(data.health, this));
        this.addComponent(new Movement(data.movement.speed));
        this.addComponent(new Steering(data.movement.turnSpeed));
        this.addComponent(new Weapon(bulletsGroup, toBulletData(data.shoot.bullet)));

        // Listen once per enemy, not on every enable(): pooled enemies are reused many times
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(0xffffff);

            if (health?.current == 0)
            {
                this.disableBody();
            }

            this.scene.time.delayedCall(50, () => {
                this.clearTint();

                if (health?.current == 0)
                {
                    this.disable();
                }
            });
        });

        this._shootTimerConfig = {
            delay: Phaser.Math.Between(data.shoot.minDelay, data.shoot.maxDelay),
            callback: this.shoot,
            callbackScope: this,
            loop: true
        };
        this._shootTimer = this.scene.time.addEvent(this._shootTimerConfig);

        // Create animation when enemy is about to shoot in the global animation manager
        if (!this.scene.anims.exists('ufoShoot')) {
            this.scene.anims.create({
                key: 'ufoShoot',
                frames: [
                    {key: 'sprites', frame: 'ufoRed'},
                    {key: 'sprites', frame: 'ufoRed-shoot0'},
                    {key: 'sprites', frame: 'ufoRed-shoot1'}
                ],
                frameRate: 4,
            });
        }

        this.arcadeBody.setCircle(this.displayWidth / 2);
    }

    public enable(x: number, y: number, difficulty: EnemyDifficulty) {
        this.enableBody(true, x, y, true, true);
        this.rotation = Phaser.Math.Angle.Between(x, y, this._target.x, this._target.y);
        this._shootTimer.reset(this._shootTimerConfig);

        // The pooled enemy may come from an easier time of the game: apply the current difficulty
        this.getComponent(Movement)?.setSpeed(this._data.movement.speed * difficulty.speedMultiplier);

        // Restore health, in case the enemy is reused from the pool, without emitting events
        const health = this.getComponent(Health);
        health?.setMax(this._data.health + difficulty.healthBonus);
        health?.heal(health!.max, false);
    }

    public disable() {
        this.stop();
        this.removeAllListeners(Phaser.Animations.Events.ANIMATION_COMPLETE);

        this.disableBody(true, true);
        this._shootTimer.paused = true;
    }

    private shoot() {
        this.play('ufoShoot');
        this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            this.setTexture('sprites', 'ufoRed');

            this.getComponent(Weapon)?.shoot(this);
            this.scene.sound.play('sfx_laser2');
        });
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime)

        // Recycle enemies left far behind
        if (Phaser.Math.Distance.Between(this.x, this.y, this._target.x, this._target.y) > this._despawnDistance) {
            this.disable();
            return;
        }

        // Chase the target, slowed down while flashing white after a hit
        const moveDeltaTime: number = this.isTinted ? deltaTime * Enemy.HIT_SLOWDOWN_FACTOR : deltaTime;
        this.getComponent(Steering)?.turnToward(this, this._target.x, this._target.y, moveDeltaTime);
        this.getComponent(Movement)?.moveForward(this, moveDeltaTime);
    }
}