import {Input, Scene} from "phaser";
import {PlayerShipData, PlayerShipsData} from "../gameData/PlayerShipsData.ts";
import type {BulletData} from "../gameData/BulletData.ts";
import Entity from './Entity.ts';
import Health from "../components/Health.ts";
import Movement from "../components/Movement.ts";
import Weapon from "../components/Weapon.ts";

export default class Player extends Entity {
    private static readonly MS_PER_SECOND: number = 1000;

    private readonly _bulletData: BulletData = {
        width: 12,
        height: 4,
        color: 0xffe066,
        speed: 1024,
        damage: 1
    };

    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys;
    private _playerShipData: PlayerShipData;
    private _rateOfFire: number;
    private _lastShotTime: number;

    constructor(scene: Scene, x: number, y: number) {
        super(scene, x, y, 'sprites');

        if (this.scene.input.keyboard) {
            this._cursorKeys = this.scene.input.keyboard.createCursorKeys();

            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.ONE).on('down', () => this.selectPlayerShip(1));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.TWO).on('down', () => this.selectPlayerShip(2));
            this.scene.input.keyboard.addKey(Input.Keyboard.KeyCodes.THREE).on('down', () => this.selectPlayerShip(3));
        }
    }

    public init(bulletsGroup: Phaser.Physics.Arcade.Group) {
        this.addComponent(new Health(3, this));
        this.addComponent(new Movement());
        this.addComponent(new Weapon(bulletsGroup, this._bulletData));

        this.angle = -90;

        this.selectPlayerShip(1);

        this._rateOfFire = 0.5;
        this._lastShotTime = 0;

        this.getComponent(Health)?.on(Health.CHANGE_EVENT, () => {
            this.arcadeBody.setEnable(false);

            this.scene.time.delayedCall(50, () => {
                // A dead player stays disabled
                if (this.active)
                    this.arcadeBody.setEnable(true);
            });
        });
    }

    public selectPlayerShip(playerShipDataId: number) {
        const playerShipsData = this.scene.cache.json.get('playerShips') as PlayerShipsData;
        this._playerShipData = playerShipsData[playerShipDataId];

        this.setTexture('sprites', this._playerShipData.texture);
        const bodyData = this._playerShipData.body;
        this.arcadeBody.setCircle(bodyData.radius, bodyData.offsetX, bodyData.offsetY);

        this.getComponent(Movement)?.setSpeed(this._playerShipData.movementSpeed);
    }

    preUpdate(timeSinceLaunch: number, deltaTime: number) {
        super.preUpdate(timeSinceLaunch, deltaTime);

        // The ship never stops: it keeps flying forward while steering toward the mouse cursor
        this.steerTowardPointer(deltaTime);
        this.getComponent(Movement)?.moveForward(this, deltaTime);

        // Stop player from going offscreen
        const camera = this.scene.cameras.main;
        this.x = Phaser.Math.Clamp(this.x, this.displayWidth / 2, camera.width - this.displayWidth / 2);
        this.y = Phaser.Math.Clamp(this.y, this.displayHeight / 2, camera.height - this.displayHeight / 2);

        // Press space or the left mouse button to shoot
        if (this._cursorKeys.space.isDown || this.scene.input.activePointer.leftButtonDown()) {
            if (timeSinceLaunch - this._lastShotTime > this._rateOfFire * 1000) {
                this.getComponent(Weapon)?.shoot(this);
                this.scene.sound.play('sfx_laser1');

                this._lastShotTime = timeSinceLaunch;
            }
        }
    }

    // Turns toward the mouse cursor, limited by the ship turn speed so it flies in curves instead of snapping
    private steerTowardPointer(deltaTime: number) {
        const pointer: Phaser.Input.Pointer = this.scene.input.activePointer;

        // Keep the current heading until the mouse has moved at least once
        if (pointer.moveTime === 0)
            return;

        const targetRotation: number = Phaser.Math.Angle.Between(this.x, this.y, pointer.worldX, pointer.worldY);
        const maxTurn: number = Phaser.Math.DegToRad(this._playerShipData.turnSpeed) * deltaTime / Player.MS_PER_SECOND;
        this.rotation = Phaser.Math.Angle.RotateTo(this.rotation, targetRotation, maxTurn);
    }
}