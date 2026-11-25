import {GameObjects, Scene} from "phaser";

// Shared look of every menu screen: the game background, slowly scrolling, with a title
export default class MenuScreen {
    private static readonly BG_TILE_SCALE: number = 2;
    private static readonly BG_SCROLL_SPEED: number = 0.02;
    private static readonly OVERLAY_COLOR: number = 0x05030a;
    private static readonly OVERLAY_ALPHA: number = 0.45;
    public static readonly TITLE_COLOR: string = '#ffe066';

    public static addBackground(scene: Scene) {
        const background: GameObjects.TileSprite = scene.add.tileSprite(0, 0, scene.scale.width, scene.scale.height, 'bg')
            .setOrigin(0).setTileScale(MenuScreen.BG_TILE_SCALE);
        scene.add.rectangle(0, 0, scene.scale.width, scene.scale.height, MenuScreen.OVERLAY_COLOR, MenuScreen.OVERLAY_ALPHA)
            .setOrigin(0);

        const scroll = (_time: number, delta: number) => {
            background.tilePositionY -= MenuScreen.BG_SCROLL_SPEED * delta;
        };
        scene.events.on(Phaser.Scenes.Events.UPDATE, scroll);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, scroll));
    }

    public static addTitle(scene: Scene, text: string, y: number, fontSize: number = 96): GameObjects.Text {
        return scene.add.text(scene.scale.width / 2, y, text,
            {fontSize: `${fontSize}px`, color: MenuScreen.TITLE_COLOR, fontFamily: 'future', align: 'center',
                stroke: '#000', strokeThickness: 8})
            .setOrigin(0.5);
    }

    public static addText(scene: Scene, text: string, y: number, fontSize: number = 36, color: string = '#ddd'): GameObjects.Text {
        return scene.add.text(scene.scale.width / 2, y, text,
            {fontSize: `${fontSize}px`, color, align: 'center', lineSpacing: 10})
            .setOrigin(0.5);
    }
}
