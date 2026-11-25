import {Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import MenuList from "../ui/MenuList.ts";
import MenuScreen from "../ui/MenuScreen.ts";

// How to play with each device
export default class ControlsScene extends Scene {
    constructor() {
        super(GameConstants.SceneKeys.CONTROLS);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        const height: number = this.scale.height;

        MenuScreen.addBackground(this);
        MenuScreen.addTitle(this, 'CONTROLS', height * 0.1);

        MenuScreen.addText(this, [
            'The ship never stops and shoots by itself.',
            'Steer it, aim the turret, boost with the nitro.',
            '',
            'KEYBOARD + MOUSE',
            'Steer: ZQSD or arrows    Aim: mouse',
            'Nitro: SHIFT    Pause: ESC    Ship: 1 2 3',
            '',
            'PS5 CONTROLLER',
            'Steer: left stick or D-pad    Aim: right stick',
            'Nitro: L1 R1 L2 R2    Pause: OPTIONS',
            'Menus: D-pad + cross, circle to go back',
            '',
            'TOUCH SCREEN',
            'Steer: drag on the left half',
            'Aim: drag on the right half',
            'Nitro: hold NITRO    Pause: II button',
        ].join('\n'), height * 0.5, 32);

        new MenuList(this, this.scale.width / 2, height * 0.88, [
            {label: 'BACK', onSelect: () => this.scene.start(GameConstants.SceneKeys.HOME)},
        ], {onBack: () => this.scene.start(GameConstants.SceneKeys.HOME)});
    }
}
