import {GameObjects} from "phaser";
import {toBulletData} from "../gameData/BulletData.ts";
import type {
    BossAttackData,
    BossData,
    DashAttackData,
    LaserAttackData,
    SpiralAttackData,
    SummonAttackData
} from "../gameData/BossData.ts";
import Entity from "./Entity.ts";
import Player from "./Player.ts";
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Steering from "../components/Steering.ts";
import Weapon from "../components/Weapon.ts";
import GameConstants from "../GameConstants.ts";

// What the boss body does between and during its attacks
type BossMode = 'chase' | 'still' | 'dash';

type LaserState = {
    data: LaserAttackData;
    // Direction the beam starts from, the sweep goes from there
    startRotation: number;
    elapsed: number;
}

// A big enemy chasing the player and cycling through the attacks of its JSON: spiral, laser, dash and summon
export default class Boss extends Entity {
    private static readonly HIT_FLASH_COLOR: number = 0xffffff;
    private static readonly HIT_FLASH_DURATION: number = 50;
    private static readonly FULL_CIRCLE_DEGREES: number = 360;
    private static readonly LASER_LENGTH: number = 5000;
    private static readonly LASER_WARNING_WIDTH: number = 6;
    private static readonly LASER_BLINK_PERIOD: number = 120;
    private static readonly LASER_CORE_COLOR: number = 0xffffff;
    private static readonly LASER_DAMAGE: number = 1;
    // Above the ships, below the UI
    private static readonly LASER_DEPTH: number = 2;
    private static readonly DASH_BLINK_ALPHA: number = 0.3;
    private static readonly DASH_BLINK_DURATION: number = 100;
    private static readonly LASER_SHAKE_DURATION: number = 120;
    private static readonly LASER_SHAKE_INTENSITY: number = 0.01;

    private _data: BossData;
    private _target: Player;
    private _tint: number;
    private _mode: BossMode = 'chase';
    private _dashRotation: number = 0;
    private _dashSpeed: number = 0;
    private _laser: GameObjects.Graphics;
    private _laserState: LaserState | null = null;
    private _attackIndex: number = 0;
    // Every pending attack step, cancelled if the boss dies in the middle of an attack
    private _timers: Phaser.Time.TimerEvent[] = [];

    public get bossData(): BossData {
        return this._data;
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group, data: BossData, target: Player) {
        this._data = data;
        this._target = target;
        this._tint = Phaser.Display.Color.HexStringToColor(data.tint).color;

        this.addComponent(new Health(data.health, this));
        this.addComponent(new Movement(data.movement.speed));
        this.addComponent(new Steering(data.movement.turnSpeed));
        this.addComponent(new Weapon(bulletsGroup, toBulletData(data.bullet)));

        // Listen once per boss, not on every enable(): pooled bosses are reused
        const health = this.getComponent(Health);
        health?.on(Health.CHANGE_EVENT, () => {
            this.setTintFill(Boss.HIT_FLASH_COLOR);

            if (health.current == 0) {
                this.disableBody();
            }

            this.scene.time.delayedCall(Boss.HIT_FLASH_DURATION, () => {
                this.setTint(this._tint);

                if (health.current == 0) {
                    this.disable();
                }
            });
        });

        this.setTexture('sprites', data.texture);
        this.setScale(data.scale);
        this.setTint(this._tint);

        // The body follows the sprite scale, the radius is given in unscaled pixels
        this.arcadeBody.setCircle(this.width / 2);

        this._laser = this.scene.add.graphics().setDepth(Boss.LASER_DEPTH);
    }

    // appearance: how many times this boss already showed up, it gets tougher every time
    public enable(x: number, y: number, appearance: number) {
        this.enableBody(true, x, y, true, true);
        this.rotation = Phaser.Math.Angle.Between(x, y, this._target.x, this._target.y);
        this.setTint(this._tint).setAlpha(1);

        const health = this.getComponent(Health);
        health?.setMax(Math.round(this._data.health * (1 + this._data.healthGrowthPerAppearance * appearance)));
        health?.heal(health.max, false);

        this._mode = 'chase';
        this._attackIndex = 0;
        this.schedule(this._data.attackDelay, () => this.startNextAttack());
    }

    public disable() {
        this._timers.forEach(timer => timer.remove());
        this._timers = [];
        this._laserState = null;
        this._laser.clear();
        this.scene.tweens.killTweensOf(this);

        this.disableBody(true, true);
    }

    private schedule(delay: number, callback: () => void) {
        this._timers.push(this.scene.time.delayedCall(delay, callback));
    }

    private startNextAttack() {
        if (!this.active)
            return;

        const attack: BossAttackData = this._data.attacks[this._attackIndex % this._data.attacks.length];
        this._attackIndex++;

        switch (attack.type) {
            case 'spiral':
                this.spiral(attack);
                break;
            case 'laser':
                this.laser(attack);
                break;
            case 'dash':
                this.dash(attack);
                break;
            case 'summon':
                this.summon(attack);
                break;
        }
    }

    private finishAttack() {
        this._mode = 'chase';
        this.schedule(this._data.attackDelay, () => this.startNextAttack());
    }

    private spiral(attack: SpiralAttackData) {
        for (let wave: number = 0; wave < attack.waves; wave++) {
            this.schedule(wave * attack.waveDelay, () => {
                const offset: number = Phaser.Math.DegToRad(wave * attack.rotationPerWave);
                this.getComponent(Weapon)?.shootSpread(this, attack.bulletsPerWave, Boss.FULL_CIRCLE_DEGREES,
                    this.rotation + offset);
                this.scene.sound.play('sfx_laser2');
            });
        }

        this.schedule(attack.waves * attack.waveDelay, () => this.finishAttack());
    }

    // The boss stops and aims where the player is now: the warning line gives time to move away
    private laser(attack: LaserAttackData) {
        this._mode = 'still';
        const aim: number = Phaser.Math.Angle.Between(this.x, this.y, this._target.x, this._target.y);
        this.rotation = aim;
        this._laserState = {
            data: attack,
            startRotation: aim - Phaser.Math.DegToRad(attack.sweepAngle) / 2,
            elapsed: 0
        };
    }

    private dash(attack: DashAttackData) {
        this._mode = 'still';
        this.scene.tweens.add({
            targets: this, alpha: Boss.DASH_BLINK_ALPHA, duration: Boss.DASH_BLINK_DURATION, yoyo: true,
            repeat: Math.floor(attack.warningDuration / (Boss.DASH_BLINK_DURATION * 2)) - 1,
            onComplete: () => this.setAlpha(1)
        });

        // Aim at the end of the warning, where the player is then
        this.schedule(attack.warningDuration, () => {
            this._dashRotation = Phaser.Math.Angle.Between(this.x, this.y, this._target.x, this._target.y);
            this.rotation = this._dashRotation;
            this._dashSpeed = attack.speed;
            this._mode = 'dash';
        });

        this.schedule(attack.warningDuration + attack.duration, () => this.finishAttack());
    }

    private summon(attack: SummonAttackData) {
        this.scene.events.emit(GameConstants.Events.BOSS_SUMMON_EVENT, attack.enemyKey, attack.count, this.x, this.y);
        this.finishAttack();
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        switch (this._mode) {
            case 'chase':
                this.getComponent(Steering)?.turnToward(this, this._target.x, this._target.y, deltaTime);
                this.getComponent(Movement)?.moveForward(this, deltaTime);
                break;
            case 'dash':
                this.x += Math.cos(this._dashRotation) * this._dashSpeed * deltaTime;
                this.y += Math.sin(this._dashRotation) * this._dashSpeed * deltaTime;
                break;
            case 'still':
                break;
        }

        this.updateLaser(deltaTime);
    }

    private updateLaser(deltaTime: number) {
        if (!this._laserState)
            return;

        const state: LaserState = this._laserState;
        const attack: LaserAttackData = state.data;
        state.elapsed += deltaTime;
        this._laser.clear();

        // Warning: a thin blinking line where the beam will start
        if (state.elapsed < attack.warningDuration) {
            const isBlinkOn: boolean = Math.floor(state.elapsed / Boss.LASER_BLINK_PERIOD) % 2 === 0;
            this.drawLaser(state.startRotation, Boss.LASER_WARNING_WIDTH, attack.color, isBlinkOn ? 0.9 : 0.3);
            return;
        }

        const fireElapsed: number = state.elapsed - attack.warningDuration;
        if (fireElapsed >= attack.fireDuration) {
            this._laserState = null;
            this.finishAttack();
            return;
        }

        // Firing: the beam sweeps from its start direction across the sweep angle
        const progress: number = fireElapsed / attack.fireDuration;
        const rotation: number = state.startRotation + Phaser.Math.DegToRad(attack.sweepAngle) * progress;
        this.rotation = rotation;
        const beam: Phaser.Geom.Line = this.drawLaser(rotation, attack.width, attack.color, 0.85);
        this._laser.lineStyle(attack.width / 3, Boss.LASER_CORE_COLOR, 0.9).strokeLineShape(beam);

        if (this._target.canBeHit) {
            const playerHitCircle = new Phaser.Geom.Circle(this._target.x, this._target.y,
                this._target.arcadeBody.radius + attack.width / 2);
            if (Phaser.Geom.Intersects.LineToCircle(beam, playerHitCircle)) {
                this._target.getComponent(Health)?.damage(Boss.LASER_DAMAGE);
                this.scene.cameras.main.shake(Boss.LASER_SHAKE_DURATION, Boss.LASER_SHAKE_INTENSITY);
            }
        }
    }

    private drawLaser(rotation: number, width: number, color: string, alpha: number): Phaser.Geom.Line {
        const beam = new Phaser.Geom.Line(this.x, this.y,
            this.x + Math.cos(rotation) * Boss.LASER_LENGTH, this.y + Math.sin(rotation) * Boss.LASER_LENGTH);
        this._laser.lineStyle(width, Phaser.Display.Color.HexStringToColor(color).color, alpha).strokeLineShape(beam);

        return beam;
    }
}
