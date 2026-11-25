import {GameObjects, Input, Scene} from "phaser";
import GameConstants from "../GameConstants.ts";

export type MenuItem = {
    // A function for labels that change, like prices
    label: string | (() => string);
    onSelect: () => void;
    // Greyed out and not selectable when it returns false
    isEnabled?: () => boolean;
}

export type MenuListOptions = {
    width?: number;
    itemHeight?: number;
    gap?: number;
    fontSize?: number;
    // Called by ESC, the gamepad circle button or the back button of a menu
    onBack?: () => void;
}

// A vertical list of buttons usable with every device:
// mouse and touch (click or tap), keyboard (arrows / ZQSD + ENTER or SPACE, ESC to go back),
// gamepad (D-pad or left stick + cross, circle to go back)
export default class MenuList {
    private static readonly DEFAULT_WIDTH: number = 620;
    private static readonly DEFAULT_ITEM_HEIGHT: number = 96;
    private static readonly DEFAULT_GAP: number = 24;
    private static readonly DEFAULT_FONT_SIZE: number = 40;
    private static readonly RADIUS: number = 20;
    private static readonly COLOR: number = 0x1d1630;
    private static readonly FOCUSED_COLOR: number = 0x43336a;
    private static readonly BORDER_COLOR: number = 0x6c63ff;
    private static readonly FOCUSED_BORDER_COLOR: number = 0xffe066;
    private static readonly DISABLED_ALPHA: number = 0.4;
    private static readonly FOCUSED_SCALE: number = 1.05;
    private static readonly STICK_THRESHOLD: number = 0.5;
    // Holding the stick moves the focus again after this delay (ms)
    private static readonly STICK_REPEAT_DELAY: number = 220;

    private readonly _scene: Scene;
    private readonly _items: MenuItem[];
    private readonly _options: Required<Omit<MenuListOptions, 'onBack'>> & Pick<MenuListOptions, 'onBack'>;
    private readonly _buttons: {container: GameObjects.Container, background: GameObjects.Graphics, text: GameObjects.Text}[] = [];
    private _focusIndex: number = 0;
    private _lastStickMoveTime: number = 0;

    public constructor(scene: Scene, x: number, y: number, items: MenuItem[], options: MenuListOptions = {}) {
        this._scene = scene;
        this._items = items;
        this._options = {
            width: options.width ?? MenuList.DEFAULT_WIDTH,
            itemHeight: options.itemHeight ?? MenuList.DEFAULT_ITEM_HEIGHT,
            gap: options.gap ?? MenuList.DEFAULT_GAP,
            fontSize: options.fontSize ?? MenuList.DEFAULT_FONT_SIZE,
            onBack: options.onBack
        };

        items.forEach((_item, index) => this.createButton(x, y + index * (this._options.itemHeight + this._options.gap), index));
        this._focusIndex = Math.max(0, this.findEnabledIndex(0, 1));
        this.refresh();
        this.listenToInputs();
    }

    private createButton(x: number, y: number, index: number) {
        const {width, itemHeight, fontSize} = this._options;
        const container: GameObjects.Container = this._scene.add.container(x, y);
        const background: GameObjects.Graphics = this._scene.add.graphics();
        const text: GameObjects.Text = this._scene.add.text(0, 0, '',
            {fontSize: `${fontSize}px`, color: '#fff', fontFamily: 'future', align: 'center', wordWrap: {width: width - 40}})
            .setOrigin(0.5);
        container.add([background, text]);

        container.setSize(width, itemHeight).setInteractive({useHandCursor: true});
        container.on(Input.Events.POINTER_OVER, () => {
            if (this.isEnabled(index))
                this.setFocus(index);
        });
        container.on(Input.Events.POINTER_DOWN, () => {
            this.setFocus(index);
            this.selectFocused();
        });

        this._buttons.push({container, background, text});
    }

    private listenToInputs() {
        const keyboard = this._scene.input.keyboard;
        keyboard?.on('keydown', this.onKeyDown, this);

        const gamepad = this._scene.input.gamepad;
        gamepad?.on('down', this.onGamepadButtonDown, this);

        this._scene.events.on(Phaser.Scenes.Events.UPDATE, this.pollStick, this);
        this._scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            keyboard?.off('keydown', this.onKeyDown, this);
            gamepad?.off('down', this.onGamepadButtonDown, this);
            this._scene.events.off(Phaser.Scenes.Events.UPDATE, this.pollStick, this);
        });
    }

    private onKeyDown(event: KeyboardEvent) {
        // Keys held from the previous screen repeat: ignore them
        if (event.repeat)
            return;

        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveFocus(-1);
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveFocus(1);
                break;
            case 'Enter':
            case 'Space':
                this.selectFocused();
                break;
            case 'Escape':
            case 'Backspace':
                this._options.onBack?.();
                break;
        }
    }

    private onGamepadButtonDown(_pad: Input.Gamepad.Gamepad, button: Input.Gamepad.Button) {
        const buttons = GameConstants.GamepadButtons;
        switch (button.index) {
            case buttons.DPAD_UP:
                this.moveFocus(-1);
                break;
            case buttons.DPAD_DOWN:
                this.moveFocus(1);
                break;
            case buttons.CROSS:
                this.selectFocused();
                break;
            case buttons.CIRCLE:
                this._options.onBack?.();
                break;
        }
    }

    private pollStick(time: number) {
        const stickY: number = this._scene.input.gamepad?.pad1?.leftStick.y ?? 0;
        if (Math.abs(stickY) < MenuList.STICK_THRESHOLD || time - this._lastStickMoveTime < MenuList.STICK_REPEAT_DELAY)
            return;

        this._lastStickMoveTime = time;
        this.moveFocus(Math.sign(stickY));
    }

    private isEnabled(index: number): boolean {
        return this._items[index].isEnabled?.() ?? true;
    }

    // Next enabled item from start in this direction, -1 if none
    private findEnabledIndex(start: number, direction: number): number {
        for (let i: number = 0; i < this._items.length; i++) {
            const index: number = Phaser.Math.Wrap(start + i * direction, 0, this._items.length);
            if (this.isEnabled(index))
                return index;
        }

        return -1;
    }

    private moveFocus(direction: number) {
        const index: number = this.findEnabledIndex(this._focusIndex + direction, direction);
        if (index >= 0)
            this.setFocus(index);
    }

    private setFocus(index: number) {
        this._focusIndex = index;
        this.refresh();
    }

    private selectFocused() {
        if (this.isEnabled(this._focusIndex))
            this._items[this._focusIndex].onSelect();
    }

    // Redraws every button, e.g. after a purchase changed the labels or what can be bought
    public refresh() {
        const {width, itemHeight} = this._options;
        this._buttons.forEach((button, index) => {
            const item: MenuItem = this._items[index];
            const isFocused: boolean = index === this._focusIndex;

            button.text.setText(typeof item.label === 'function' ? item.label() : item.label);
            button.container.setAlpha(this.isEnabled(index) ? 1 : MenuList.DISABLED_ALPHA)
                .setScale(isFocused ? MenuList.FOCUSED_SCALE : 1);
            button.background.clear()
                .fillStyle(isFocused ? MenuList.FOCUSED_COLOR : MenuList.COLOR)
                .fillRoundedRect(-width / 2, -itemHeight / 2, width, itemHeight, MenuList.RADIUS)
                .lineStyle(4, isFocused ? MenuList.FOCUSED_BORDER_COLOR : MenuList.BORDER_COLOR)
                .strokeRoundedRect(-width / 2, -itemHeight / 2, width, itemHeight, MenuList.RADIUS);
        });
    }
}
