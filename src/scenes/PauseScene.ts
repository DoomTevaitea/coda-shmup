import {Input, Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import MenuList from "../ui/MenuList.ts";
import MenuScreen from "../ui/MenuScreen.ts";

// Shown over the paused game with ESC, the gamepad OPTIONS button or the touch pause button
export default class PauseScene extends Scene {
    private static readonly OVERLAY_COLOR: number = 0x05030a;
    private static readonly OVERLAY_ALPHA: number = 0.75;

    constructor() {
        super(GameConstants.SceneKeys.PAUSE);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        const width: number = this.scale.width;
        const height: number = this.scale.height;

        this.add.rectangle(0, 0, width, height, PauseScene.OVERLAY_COLOR, PauseScene.OVERLAY_ALPHA).setOrigin(0);
        MenuScreen.addTitle(this, 'PAUSED', height * 0.28);

        new MenuList(this, width / 2, height * 0.45, [
            {label: 'RESUME', onSelect: () => this.resumeGame()},
            {label: 'RESTART', onSelect: () => this.scene.start(GameConstants.SceneKeys.MAIN_GAME)},
            {label: 'MAIN MENU', onSelect: () => this.quitToMenu()},
        ], {onBack: () => this.resumeGame()});

        // OPTIONS closes the pause menu like it opened it
        this.input.gamepad?.on('down', (_pad: Input.Gamepad.Gamepad, button: Input.Gamepad.Button) => {
            if (button.index === GameConstants.GamepadButtons.OPTIONS)
                this.resumeGame();
        });

        this.scene.bringToTop();
    }

    private resumeGame() {
        this.scene.resume(GameConstants.SceneKeys.MAIN_GAME);
        this.scene.stop();
    }

    private quitToMenu() {
        this.scene.stop(GameConstants.SceneKeys.MAIN_GAME);
        this.scene.stop(GameConstants.SceneKeys.MAIN_UI);
        this.scene.start(GameConstants.SceneKeys.HOME);
    }
}
