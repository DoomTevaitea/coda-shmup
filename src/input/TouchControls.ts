import {GameObjects, Scene} from "phaser";
import GameConstants from "../GameConstants.ts";

type Stick = {
    pointerId: number;
    originX: number;
    originY: number;
    // From -1 to 1 on each axis, length at most 1
    x: number;
    y: number;
}

// On screen controls for phones and tablets, drawn in the UI scene:
// drag on the left half to steer, drag on the right half to aim, hold the NITRO button to boost, tap II to pause.
// Joysticks appear where the finger touches the screen. The player reads them through the game registry
export default class TouchControls {
    public static readonly REGISTRY_KEY: string = 'touchControls';

    private static readonly STICK_RADIUS: number = 110;
    private static readonly KNOB_RADIUS: number = 46;
    private static readonly STICK_COLOR: number = 0xffffff;
    private static readonly STICK_ALPHA: number = 0.25;
    private static readonly KNOB_ALPHA: number = 0.5;
    private static readonly BUTTON_RADIUS: number = 72;
    private static readonly NITRO_COLOR: number = 0x4dd0e1;
    private static readonly PAUSE_SIZE: number = 80;
    private static readonly PAUSE_MARGIN: number = 40;
    private static readonly PAUSE_TOP: number = 220;

    private readonly _scene: Scene;
    private readonly _graphics: GameObjects.Graphics;
    private _move: Stick | null = null;
    private _aim: Stick | null = null;
    private _boostPointerId: number | null = null;
    private readonly _nitroButton: Phaser.Geom.Circle;
    private readonly _pauseButton: Phaser.Geom.Rectangle;

    public static isSupported(scene: Scene): boolean {
        return scene.sys.game.device.input.touch;
    }

    public constructor(scene: Scene) {
        this._scene = scene;
        this._graphics = scene.add.graphics();

        const width: number = scene.scale.width;
        const height: number = scene.scale.height;
        this._nitroButton = new Phaser.Geom.Circle(width - TouchControls.BUTTON_RADIUS * 1.6, height * 0.6,
            TouchControls.BUTTON_RADIUS);
        this._pauseButton = new Phaser.Geom.Rectangle(width - TouchControls.PAUSE_MARGIN - TouchControls.PAUSE_SIZE,
            TouchControls.PAUSE_TOP, TouchControls.PAUSE_SIZE, TouchControls.PAUSE_SIZE);
        scene.add.text(this._nitroButton.x, this._nitroButton.y, 'NITRO',
            {fontSize: '26px', color: '#ffffff', fontFamily: 'future'}).setOrigin(0.5).setAlpha(0.8);

        scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
        scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
        scene.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
        scene.registry.set(TouchControls.REGISTRY_KEY, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
            scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
            scene.input.off(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
            scene.registry.remove(TouchControls.REGISTRY_KEY);
        });

        this.draw();
    }

    public get moveVector(): {x: number, y: number} | null {
        return this._move ? {x: this._move.x, y: this._move.y} : null;
    }

    public get aimVector(): {x: number, y: number} | null {
        return this._aim ? {x: this._aim.x, y: this._aim.y} : null;
    }

    public get isBoostHeld(): boolean {
        return this._boostPointerId !== null;
    }

    private onPointerDown(pointer: Phaser.Input.Pointer) {
        if (!pointer.wasTouch)
            return;

        if (Phaser.Geom.Rectangle.Contains(this._pauseButton, pointer.x, pointer.y)) {
            this._scene.game.events.emit(GameConstants.Events.PAUSE_REQUESTED_EVENT);
            return;
        }

        if (Phaser.Geom.Circle.Contains(this._nitroButton, pointer.x, pointer.y)) {
            this._boostPointerId = pointer.id;
        } else if (pointer.x < this._scene.scale.width / 2) {
            this._move ??= {pointerId: pointer.id, originX: pointer.x, originY: pointer.y, x: 0, y: 0};
        } else {
            this._aim ??= {pointerId: pointer.id, originX: pointer.x, originY: pointer.y, x: 0, y: 0};
        }

        this.draw();
    }

    private onPointerMove(pointer: Phaser.Input.Pointer) {
        for (const stick of [this._move, this._aim]) {
            if (!stick || stick.pointerId !== pointer.id)
                continue;

            const offset = new Phaser.Math.Vector2(pointer.x - stick.originX, pointer.y - stick.originY)
                .limit(TouchControls.STICK_RADIUS).scale(1 / TouchControls.STICK_RADIUS);
            stick.x = offset.x;
            stick.y = offset.y;
        }

        this.draw();
    }

    private onPointerUp(pointer: Phaser.Input.Pointer) {
        if (this._move?.pointerId === pointer.id)
            this._move = null;
        if (this._aim?.pointerId === pointer.id)
            this._aim = null;
        if (this._boostPointerId === pointer.id)
            this._boostPointerId = null;

        this.draw();
    }

    private draw() {
        const graphics: GameObjects.Graphics = this._graphics.clear();

        for (const stick of [this._move, this._aim]) {
            if (!stick)
                continue;

            graphics.fillStyle(TouchControls.STICK_COLOR, TouchControls.STICK_ALPHA)
                .fillCircle(stick.originX, stick.originY, TouchControls.STICK_RADIUS)
                .fillStyle(TouchControls.STICK_COLOR, TouchControls.KNOB_ALPHA)
                .fillCircle(stick.originX + stick.x * TouchControls.STICK_RADIUS,
                    stick.originY + stick.y * TouchControls.STICK_RADIUS, TouchControls.KNOB_RADIUS);
        }

        graphics.fillStyle(TouchControls.NITRO_COLOR, this.isBoostHeld ? 0.7 : 0.35)
            .fillCircle(this._nitroButton.x, this._nitroButton.y, this._nitroButton.radius);

        // Pause button: two bars
        const pause = this._pauseButton;
        const barWidth: number = pause.width / 4;
        graphics.fillStyle(TouchControls.STICK_COLOR, 0.35).fillRoundedRect(pause.x, pause.y, pause.width, pause.height, 12)
            .fillStyle(TouchControls.STICK_COLOR, 0.9)
            .fillRect(pause.x + barWidth, pause.y + pause.height / 4, barWidth * 0.7, pause.height / 2)
            .fillRect(pause.right - barWidth * 1.7, pause.y + pause.height / 4, barWidth * 0.7, pause.height / 2);
    }
}
