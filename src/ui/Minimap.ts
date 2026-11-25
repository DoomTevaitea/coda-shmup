import {GameObjects, Scene} from "phaser";
import type {MinimapPoint, MinimapSettingsData, MinimapSnapshot} from "../gameData/MinimapData.ts";

// Square map of the whole world in the bottom right corner of the screen, redrawn from each MinimapSnapshot.
// Also draws an arrow on the screen edge pointing to the boss when it is off screen
export default class Minimap {
    private static readonly BACKGROUND_COLOR: number = 0x0b0716;
    private static readonly BACKGROUND_ALPHA: number = 0.65;
    private static readonly BORDER_COLOR: number = 0x6c63ff;
    private static readonly BORDER_WIDTH: number = 4;
    private static readonly VIEW_COLOR: number = 0xffffff;
    private static readonly VIEW_ALPHA: number = 0.45;
    private static readonly LANDMARK_COLOR: number = 0x4dd0e1;
    private static readonly LANDMARK_RADIUS: number = 6;
    private static readonly ENEMY_COLOR: number = 0xf25f5c;
    private static readonly ENEMY_RADIUS: number = 2.5;
    private static readonly BOSS_RADIUS: number = 7;
    private static readonly PLAYER_COLOR: number = 0xffffff;
    // Player arrow, pointing right before rotation (px)
    private static readonly PLAYER_ARROW_LENGTH: number = 9;
    private static readonly PLAYER_ARROW_WIDTH: number = 7;
    // Boss pointer on the screen edge
    private static readonly BOSS_POINTER_EDGE_MARGIN: number = 90;
    private static readonly BOSS_POINTER_LENGTH: number = 40;
    private static readonly BOSS_POINTER_WIDTH: number = 30;
    private static readonly BOSS_POINTER_OUTLINE_COLOR: number = 0x000000;
    private static readonly BOSS_POINTER_OUTLINE_WIDTH: number = 4;

    private readonly _scene: Scene;
    private readonly _settings: MinimapSettingsData;
    private readonly _graphics: GameObjects.Graphics;
    private readonly _bossPointer: GameObjects.Graphics;

    public constructor(scene: Scene, settings: MinimapSettingsData) {
        this._scene = scene;
        this._settings = settings;
        this._graphics = scene.add.graphics();
        this._bossPointer = scene.add.graphics();
    }

    public draw(snapshot: MinimapSnapshot) {
        const size: number = this._settings.size;
        const left: number = this._scene.scale.width - this._settings.margin - size;
        const top: number = this._scene.scale.height - this._settings.margin - size;
        const scaleX: number = size / snapshot.worldWidth;
        const scaleY: number = size / snapshot.worldHeight;
        const toMap = (point: MinimapPoint) => ({x: left + point.x * scaleX, y: top + point.y * scaleY});

        const graphics: GameObjects.Graphics = this._graphics.clear()
            .fillStyle(Minimap.BACKGROUND_COLOR, Minimap.BACKGROUND_ALPHA)
            .fillRect(left, top, size, size);

        for (const landmark of snapshot.landmarks) {
            const position = toMap(landmark);
            graphics.fillStyle(Minimap.LANDMARK_COLOR).fillCircle(position.x, position.y, Minimap.LANDMARK_RADIUS);
        }

        graphics.fillStyle(Minimap.ENEMY_COLOR);
        for (const enemy of snapshot.enemies) {
            const position = toMap(enemy);
            graphics.fillCircle(position.x, position.y, Minimap.ENEMY_RADIUS);
        }

        if (snapshot.boss) {
            const position = toMap(snapshot.boss);
            graphics.fillStyle(Phaser.Display.Color.HexStringToColor(snapshot.boss.color).color)
                .fillCircle(position.x, position.y, Minimap.BOSS_RADIUS);
        }

        // What is currently on screen: it grows with the wide view bonus and during boss fights
        const view = toMap(snapshot.view);
        graphics.lineStyle(2, Minimap.VIEW_COLOR, Minimap.VIEW_ALPHA)
            .strokeRect(view.x, view.y, snapshot.view.width * scaleX, snapshot.view.height * scaleY);

        const player = toMap(snapshot.player);
        this.fillArrow(graphics, player.x, player.y, snapshot.player.rotation,
            Minimap.PLAYER_ARROW_LENGTH, Minimap.PLAYER_ARROW_WIDTH, Minimap.PLAYER_COLOR);

        graphics.lineStyle(Minimap.BORDER_WIDTH, Minimap.BORDER_COLOR).strokeRect(left, top, size, size);

        this.drawBossPointer(snapshot);
    }

    // Arrow near the screen edge, in the direction of the boss, only while the boss is off screen
    private drawBossPointer(snapshot: MinimapSnapshot) {
        this._bossPointer.clear();

        const boss = snapshot.boss;
        const view = snapshot.view;
        if (!boss || Phaser.Geom.Rectangle.Contains(new Phaser.Geom.Rectangle(view.x, view.y, view.width, view.height),
            boss.x, boss.y))
            return;

        const viewCenterX: number = view.x + view.width / 2;
        const viewCenterY: number = view.y + view.height / 2;
        const rotation: number = Phaser.Math.Angle.Between(viewCenterX, viewCenterY, boss.x, boss.y);

        const screenWidth: number = this._scene.scale.width;
        const screenHeight: number = this._scene.scale.height;
        const distance: number = Math.min(screenWidth, screenHeight) / 2 - Minimap.BOSS_POINTER_EDGE_MARGIN;
        const x: number = screenWidth / 2 + Math.cos(rotation) * distance;
        const y: number = screenHeight / 2 + Math.sin(rotation) * distance;

        this._bossPointer.lineStyle(Minimap.BOSS_POINTER_OUTLINE_WIDTH, Minimap.BOSS_POINTER_OUTLINE_COLOR);
        this.fillArrow(this._bossPointer, x, y, rotation, Minimap.BOSS_POINTER_LENGTH, Minimap.BOSS_POINTER_WIDTH,
            Phaser.Display.Color.HexStringToColor(boss.color).color, true);
    }

    // Triangle centered on (x, y), pointing toward rotation
    private fillArrow(graphics: GameObjects.Graphics, x: number, y: number, rotation: number,
                      length: number, width: number, color: number, withOutline: boolean = false) {
        const point = (forward: number, side: number) => ({
            x: x + Math.cos(rotation) * forward - Math.sin(rotation) * side,
            y: y + Math.sin(rotation) * forward + Math.cos(rotation) * side
        });
        const tip = point(length / 2, 0);
        const backLeft = point(-length / 2, -width / 2);
        const backRight = point(-length / 2, width / 2);

        graphics.fillStyle(color).fillTriangle(tip.x, tip.y, backLeft.x, backLeft.y, backRight.x, backRight.y);
        if (withOutline)
            graphics.strokeTriangle(tip.x, tip.y, backLeft.x, backLeft.y, backRight.x, backRight.y);
    }
}
