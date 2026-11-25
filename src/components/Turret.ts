import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import {TurretData} from "../gameData/PlayerData.ts";

// A gun mounted on top of an entity, aiming independently of where the entity is heading
export default class Turret implements IComponent {
    // Drawn above the ship sprite
    private static readonly DEPTH: number = 1;

    public enabled: boolean = true;

    private readonly _graphics: Phaser.GameObjects.Graphics;

    public get rotation(): number {
        return this._graphics.rotation;
    }

    public constructor(scene: Phaser.Scene, data: TurretData) {
        // Drawn pointing right (rotation 0), like every sprite of the game
        this._graphics = scene.add.graphics()
            .fillStyle(Phaser.Display.Color.HexStringToColor(data.color).color)
            .fillRect(0, -data.barrelWidth / 2, data.barrelLength, data.barrelWidth)
            .fillCircle(0, 0, data.baseRadius)
            .setDepth(Turret.DEPTH);
    }

    public setVisible(visible: boolean) {
        this._graphics.setVisible(visible);
    }

    // Sticks the turret to the entity and turns its barrel toward the given world point
    public aimAt(entity: Entity, x: number, y: number) {
        this._graphics.setPosition(entity.x, entity.y);

        if (!this.enabled)
            return;

        this._graphics.setRotation(Phaser.Math.Angle.Between(entity.x, entity.y, x, y));
    }
}
