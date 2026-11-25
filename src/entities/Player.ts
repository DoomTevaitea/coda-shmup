import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import type {PlayerData} from "../gameData/PlayerData.ts";
import type {PlayerBonuses} from "../gameData/ProgressionData.ts";
import type {WeaponsData} from "../gameData/WeaponsData.ts";
import {toBulletData} from "../gameData/BulletData.ts";
import Entity from './Entity.ts';
import Arsenal from "../components/Arsenal.ts";
import Booster from "../components/Booster.ts";
import BoostFlame from "../components/BoostFlame.ts";
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Steering from "../components/Steering.ts";
import Turret from "../components/Turret.ts";
import Weapon from "../components/Weapon.ts";
import PlayerInput from "../input/PlayerInput.ts";
import CombatTargets from "../weapons/CombatTargets.ts";
import GameConstants from "../GameConstants.ts";

export default class Player extends Entity {
    // Emitted when the player loses health, for the hit feedback
    public static readonly HIT_EVENT: string = 'playerHit';

    private static readonly HIT_BLINK_ALPHA: number = 0.2;
    private static readonly HIT_BLINK_DURATION: number = 80;
    // A hit blocked by the shield only gives a short invulnerability
    private static readonly SHIELD_HIT_INVULNERABILITY_RATIO: number = 0.5;

    private readonly _input: PlayerInput;
    private _playerData: PlayerData;
    private _playerShipData: PlayerShipData;
    private _bonuses: PlayerBonuses = {
        zoom: 0, speed: 0, damage: 0, multishot: 0, bulletSpeed: 0,
        drones: 0, missiles: 0, piercingLaser: 0, shield: 0, nitro: null
    };
    private _lastShotTime: number;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites');

        this._input = new PlayerInput(scene);

        if (this.scene.input.keyboard) {
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    // startHealthBonus: extra starting lives bought in the shop
    public init(bulletsGroup: Phaser.Physics.Arcade.Group, targets: CombatTargets, startHealthBonus: number) {
        this._playerData = this.scene.cache.json.get(GameConstants.DataKeys.PLAYER) as PlayerData;
        const weaponsData = this.scene.cache.json.get(GameConstants.DataKeys.WEAPONS) as WeaponsData;
        const startHealth: number = this._playerData.health + startHealthBonus;

        this.addComponent(new Health(startHealth, this));
        this.addComponent(new Movement());
        this.addComponent(new Steering());
        this.addComponent(new Turret(this.scene, this._playerData.turret));
        this.addComponent(new Weapon(bulletsGroup, toBulletData(this._playerData.bullet)));
        this.addComponent(new Booster());
        this.addComponent(new BoostFlame(this.scene));
        this.addComponent(new Arsenal(this.scene, weaponsData, targets));

        this.angle = -90;

        this.selectPlayerShip(1);

        this._lastShotTime = 0;

        // A dead player stops updating: hide its turret, flames and weapons, which are separate game objects
        this.getComponent(Health)?.once(Health.DEATH_EVENT, () => {
            this.getComponent(Turret)?.setVisible(false);
            this.getComponent(BoostFlame)?.stop();
            this.getComponent(Arsenal)?.hide();
        });

        // After a hit, the ship blinks and can't be hit for a moment: bosses and lasers would hit every frame otherwise
        let previousHealth: number = startHealth;
        this.getComponent(Health)?.on(Health.CHANGE_EVENT, (current: number) => {
            const isHit: boolean = current < previousHealth;
            previousHealth = current;
            if (!isHit)
                return;

            this.emit(Player.HIT_EVENT);
            this.becomeInvulnerable(this._playerData.hitInvulnerability);
        });
        this.getComponent(Health)?.on(Health.SHIELD_HIT_EVENT, () => {
            this.becomeInvulnerable(this._playerData.hitInvulnerability * Player.SHIELD_HIT_INVULNERABILITY_RATIO);
        });
    }

    private becomeInvulnerable(duration: number) {
        this.arcadeBody.setEnable(false);
        this.scene.tweens.add({
            targets: this, alpha: Player.HIT_BLINK_ALPHA, duration: Player.HIT_BLINK_DURATION, yoyo: true,
            repeat: Math.max(0, Math.floor(duration / (Player.HIT_BLINK_DURATION * 2)) - 1),
            onComplete: () => this.setAlpha(1)
        });

        this.scene.time.delayedCall(duration, () => {
            // A dead player stays disabled
            if (this.active)
                this.arcadeBody.setEnable(true);
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
        this.getComponent(Arsenal)?.setLevels(this, {
            drones: bonuses.drones,
            missiles: bonuses.missiles,
            piercingLaser: bonuses.piercingLaser,
            shield: bonuses.shield
        });
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // The ship never stops: it keeps flying forward while turning toward the direction asked by the input
        const direction = this._input.getMoveDirection();
        if (direction)
            this.getComponent(Steering)?.turnToward(this, this.x + direction.x, this.y + direction.y, deltaTime);

        const booster = this.getComponent(Booster);
        booster?.update(this._input.isBoostHeld(), deltaTime);
        this.getComponent(Movement)?.setSpeed(this.getCurrentSpeed());
        this.getComponent(Movement)?.moveForward(this, deltaTime);
        this.getComponent(BoostFlame)?.update(this, booster?.isBoosting ?? false);

        // Stop player from leaving the world
        const worldBounds: Phaser.Geom.Rectangle = this.scene.physics.world.bounds;
        this.x = Phaser.Math.Clamp(this.x, worldBounds.left + this.displayWidth / 2, worldBounds.right - this.displayWidth / 2);
        this.y = Phaser.Math.Clamp(this.y, worldBounds.top + this.displayHeight / 2, worldBounds.bottom - this.displayHeight / 2);

        // The turret aims with the mouse, the right stick or the right touch joystick, whatever the ship is facing
        const aimRotation: number = this._input.getAimRotation(this.x, this.y);
        const turret = this.getComponent(Turret);
        turret?.aimToward(this, aimRotation);

        // Shoot automatically where the turret aims, one more bullet per multishot level
        if (turret && timeSinceLaunch - this._lastShotTime > this._playerData.shootDelay) {
            const bulletCount: number = 1 + this._bonuses.multishot;
            const spreadAngle: number = (bulletCount - 1) * this._playerData.multishotAngle;
            this.getComponent(Weapon)?.shootSpread(this, bulletCount, spreadAngle, aimRotation);
            this.scene.sound.play('sfx_laser1');

            this._lastShotTime = timeSinceLaunch;
        }

        this.getComponent(Arsenal)?.update(this, deltaTime, aimRotation);
    }

    // Ship speed, plus the speed bonus, plus the nitro while boosting and the nitro bar is not empty
    private getCurrentSpeed(): number {
        const boostMultiplier: number = this.getComponent(Booster)?.speedMultiplier ?? 1;

        return this._playerShipData.movementSpeed * (1 + this._bonuses.speed) * boostMultiplier;
    }
}
