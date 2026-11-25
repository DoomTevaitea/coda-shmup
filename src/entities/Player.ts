import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import type {PlayerBonuses} from "../gameData/ProgressionData.ts";
import {toBulletData} from "../gameData/BulletData.ts";
import Entity from './Entity.ts';
import Booster from "../components/Booster.ts";
import BoostFlame from "../components/BoostFlame.ts";
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Steering from "../components/Steering.ts";
import Turret from "../components/Turret.ts";
import Weapon from "../components/Weapon.ts";
import GameConstants from "../GameConstants.ts";

export default class Player extends Entity {
    private static readonly HIT_BLINK_ALPHA: number = 0.2;
    private static readonly HIT_BLINK_DURATION: number = 80;

    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private readonly _zqsdKeys: Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>;
    private _playerData: PlayerData;
    private _playerShipData: PlayerShipData;
    private _bonuses: PlayerBonuses = {zoom: 0, speed: 0, damage: 0, multishot: 0, bulletSpeed: 0, nitro: null};
    private _lastShotTime: number;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites');

        if (this.scene.input.keyboard) {
            this._cursorKeys = this.scene.input.keyboard.createCursorKeys();
            // AZERTY layout: Z Q S D are where W A S D are on a QWERTY keyboard
            this._zqsdKeys = this.scene.input.keyboard.addKeys({
                up: Input.Keyboard.KeyCodes.Z,
                left: Input.Keyboard.KeyCodes.Q,
                down: Input.Keyboard.KeyCodes.S,
                right: Input.Keyboard.KeyCodes.D
            }) as Record<'up' | 'left' | 'down' | 'right', Phaser.Input.Keyboard.Key>;

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        this._playerData = this.scene.cache.json.get(GameConstants.DataKeys.PLAYER) as PlayerData;

        this.addComponent(new Health(this._playerData.health, this));
        this.addComponent(new Movement());
        this.addComponent(new Steering());
        this.addComponent(new Turret(this.scene, this._playerData.turret));
        this.addComponent(new Weapon(bulletsGroup, toBulletData(this._playerData.bullet)));
        this.addComponent(new Booster());
        this.addComponent(new BoostFlame(this.scene));

        this.angle = -90;

        this.selectPlayerShip(1);

        this._lastShotTime = 0;

        // A dead player stops updating: hide its turret and flames, which are separate game objects
        this.getComponent(Health)?.once(Health.DEATH_EVENT, () => {
            this.getComponent(Turret)?.setVisible(false);
            this.getComponent(BoostFlame)?.stop();
        });

        // After a hit, the ship blinks and can't be hit for a moment: bosses and lasers would hit every frame otherwise
        let previousHealth: number = this._playerData.health;
        this.getComponent(Health)?.on(Health.CHANGE_EVENT, (current: number) => {
            const isHit: boolean = current < previousHealth;
            previousHealth = current;
            if (!isHit)
                return;

            this.arcadeBody.setEnable(false);
            this.scene.tweens.add({
                targets: this, alpha: Player.HIT_BLINK_ALPHA, duration: Player.HIT_BLINK_DURATION, yoyo: true,
                repeat: Math.floor(this._playerData.hitInvulnerability / (Player.HIT_BLINK_DURATION * 2)) - 1,
                onComplete: () => this.setAlpha(1)
            });

            this.scene.time.delayedCall(this._playerData.hitInvulnerability, () => {
                // A dead player stays disabled
                if (this.active)
                    this.arcadeBody.setEnable(true);
            });
        });
    }

    // False while blinking after a hit, or dead
    public get canBeHit(): boolean {
        return this.active && this.arcadeBody.enable;
    }

    public selectPlayerShip(playerShipDataId: number) {
        const playerShipsData = this.scene.cache.json.get(GameConstants.DataKeys.PLAYER_SHIPS) as PlayerShipsData;
        this._playerShipData = playerShipsData[playerShipDataId];

        this.setTexture('sprites', this._playerShipData.texture);
        const bodyData = this._playerShipData.body;
        this.arcadeBody.setCircle(bodyData.radius, bodyData.offsetX, bodyData.offsetY);

        this.getComponent(Steering)?.setTurnSpeed(this._playerShipData.turnSpeed);
    }

    // Gives back lives. Lives above the max raise the max, up to maxHealthCap
    public repair(lives: number, maxHealthCap: number) {
        // A dead player can't be brought back
        const health = this.getComponent(Health);
        if (!health || health.current <= 0)
            return;

        health.setMax(Math.min(maxHealthCap, Math.max(health.max, health.current + lives)));
        health.heal(lives);
    }

    public setBonuses(bonuses: PlayerBonuses) {
        this._bonuses = bonuses;

        const weapon = this.getComponent(Weapon);
        if (weapon) {
            weapon.damageBonus = bonuses.damage;
            weapon.speedMultiplier = 1 + bonuses.bulletSpeed;
        }

        this.getComponent(Booster)?.setStats(bonuses.nitro);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // The ship never stops: it keeps flying forward while turning toward the direction held on the keyboard
        this.steerWithKeyboard(deltaTime);
        const booster = this.getComponent(Booster);
        booster?.update(this._cursorKeys.shift.isDown, deltaTime);
        this.getComponent(Movement)?.setSpeed(this.getCurrentSpeed());
        this.getComponent(Movement)?.moveForward(this, deltaTime);
        this.getComponent(BoostFlame)?.update(this, booster?.isBoosting ?? false);

        // Stop player from leaving the world
        const worldBounds: Phaser.Geom.Rectangle = this.scene.physics.world.bounds;
        this.x = Phaser.Math.Clamp(this.x, worldBounds.left + this.displayWidth / 2, worldBounds.right - this.displayWidth / 2);
        this.y = Phaser.Math.Clamp(this.y, worldBounds.top + this.displayHeight / 2, worldBounds.bottom - this.displayHeight / 2);

        // The turret follows the mouse, whatever the ship is facing.
        // pointer.worldX/Y are only refreshed when the mouse moves: recompute them as the camera follows the player
        const pointer: Phaser.Input.Pointer = this.scene.input.activePointer;
        const aimPoint: Phaser.Math.Vector2 = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
        const turret = this.getComponent(Turret);
        turret?.aimAt(this, aimPoint.x, aimPoint.y);

        // Shoot automatically where the turret aims, one more bullet per multishot level
        if (turret && timeSinceLaunch - this._lastShotTime > this._playerData.shootDelay) {
            const bulletCount: number = 1 + this._bonuses.multishot;
            const spreadAngle: number = (bulletCount - 1) * this._playerData.multishotAngle;
            this.getComponent(Weapon)?.shootSpread(this, bulletCount, spreadAngle, turret.rotation);
            this.scene.sound.play('sfx_laser1');

            this._lastShotTime = timeSinceLaunch;
        }
    }

    // Ship speed, plus the speed bonus, plus the nitro while SHIFT is held and the nitro bar is not empty
    private getCurrentSpeed(): number {
        const boostMultiplier: number = this.getComponent(Booster)?.speedMultiplier ?? 1;

        return this._playerShipData.movementSpeed * (1 + this._bonuses.speed) * boostMultiplier;
    }

    // ZQSD or arrow keys give a direction (8 possible), the ship turns toward it at its own turn speed.
    // With no key held, the ship keeps its current heading
    private steerWithKeyboard(deltaTime: number) {
        const directionX: number = Number(this._cursorKeys.right.isDown || this._zqsdKeys.right.isDown)
            - Number(this._cursorKeys.left.isDown || this._zqsdKeys.left.isDown);
        const directionY: number = Number(this._cursorKeys.down.isDown || this._zqsdKeys.down.isDown)
            - Number(this._cursorKeys.up.isDown || this._zqsdKeys.up.isDown);

        if (directionX === 0 && directionY === 0)
            return;

        this.getComponent(Steering)?.turnToward(this, this.x + directionX, this.y + directionY, deltaTime);
    }
}