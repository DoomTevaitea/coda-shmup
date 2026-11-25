import {Input, Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import TouchControls from "./TouchControls.ts";

type Direction = {x: number, y: number};
type AimSource = 'mouse' | 'gamepad' | 'touch';

// Everything the player can press, whatever the device: keyboard and mouse, gamepad (PS5 DualSense) or touch screen.
// The ship only asks "where to go", "where to aim" and "boost or not"
export default class PlayerInput {
    // Sticks never rest exactly at 0
    private static readonly STICK_DEAD_ZONE: number = 0.25;
    private static readonly TRIGGER_THRESHOLD: number = 0.3;

    private readonly _scene: Scene;
    private readonly _cursorKeys: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
    private readonly _zqsdKeys: Record<'up' | 'left' | 'down' | 'right', Input.Keyboard.Key> | null = null;
    // The aim follows the device used last: moving the mouse after the stick gives the aim back to the mouse
    private _aimSource: AimSource = 'mouse';
    private _lastMouseMoveTime: number = 0;
    private _lastAimRotation: number = -Math.PI / 2;

    public constructor(scene: Scene) {
        this._scene = scene;

        if (scene.input.keyboard) {
            this._cursorKeys = scene.input.keyboard.createCursorKeys();
            // AZERTY layout: Z Q S D are where W A S D are on a QWERTY keyboard
            this._zqsdKeys = scene.input.keyboard.addKeys({
                up: Input.Keyboard.KeyCodes.Z,
                left: Input.Keyboard.KeyCodes.Q,
                down: Input.Keyboard.KeyCodes.S,
                right: Input.Keyboard.KeyCodes.D
            }) as Record<'up' | 'left' | 'down' | 'right', Input.Keyboard.Key>;
        }
    }

    private get gamepad(): Input.Gamepad.Gamepad | null {
        return this._scene.input.gamepad?.pad1 ?? null;
    }

    private get touch(): TouchControls | undefined {
        return this._scene.registry.get(TouchControls.REGISTRY_KEY);
    }

    // Direction to steer toward, null to keep the current heading
    public getMoveDirection(): Direction | null {
        const pad = this.gamepad;
        if (pad) {
            if (pad.leftStick.length() > PlayerInput.STICK_DEAD_ZONE)
                return {x: pad.leftStick.x, y: pad.leftStick.y};

            const padX: number = Number(pad.isButtonDown(GameConstants.GamepadButtons.DPAD_RIGHT))
                - Number(pad.isButtonDown(GameConstants.GamepadButtons.DPAD_LEFT));
            const padY: number = Number(pad.isButtonDown(GameConstants.GamepadButtons.DPAD_DOWN))
                - Number(pad.isButtonDown(GameConstants.GamepadButtons.DPAD_UP));
            if (padX !== 0 || padY !== 0)
                return {x: padX, y: padY};
        }

        const touchMove = this.touch?.moveVector;
        if (touchMove && Math.hypot(touchMove.x, touchMove.y) > PlayerInput.STICK_DEAD_ZONE)
            return touchMove;

        if (this._cursorKeys && this._zqsdKeys) {
            const keyX: number = Number(this._cursorKeys.right.isDown || this._zqsdKeys.right.isDown)
                - Number(this._cursorKeys.left.isDown || this._zqsdKeys.left.isDown);
            const keyY: number = Number(this._cursorKeys.down.isDown || this._zqsdKeys.down.isDown)
                - Number(this._cursorKeys.up.isDown || this._zqsdKeys.up.isDown);
            if (keyX !== 0 || keyY !== 0)
                return {x: keyX, y: keyY};
        }

        return null;
    }

    // SHIFT, any shoulder button or trigger, or the touch NITRO button
    public isBoostHeld(): boolean {
        const pad = this.gamepad;
        const buttons = GameConstants.GamepadButtons;
        const isPadBoosting: boolean = pad !== null && (pad.isButtonDown(buttons.L1) || pad.isButtonDown(buttons.R1)
            || pad.getButtonValue(buttons.L2) > PlayerInput.TRIGGER_THRESHOLD
            || pad.getButtonValue(buttons.R2) > PlayerInput.TRIGGER_THRESHOLD);

        return isPadBoosting || (this._cursorKeys?.shift.isDown ?? false) || (this.touch?.isBoostHeld ?? false);
    }

    // Aim direction from the owner (radians): mouse cursor, right stick, or right touch joystick
    public getAimRotation(ownerX: number, ownerY: number): number {
        const pointer: Input.Pointer = this._scene.input.activePointer;
        if (!pointer.wasTouch && pointer.moveTime > this._lastMouseMoveTime) {
            this._lastMouseMoveTime = pointer.moveTime;
            this._aimSource = 'mouse';
        }

        const rightStick = this.gamepad?.rightStick;
        if (rightStick && rightStick.length() > PlayerInput.STICK_DEAD_ZONE) {
            this._aimSource = 'gamepad';
            this._lastAimRotation = rightStick.angle();
        }

        const touchAim = this.touch?.aimVector;
        if (touchAim && Math.hypot(touchAim.x, touchAim.y) > PlayerInput.STICK_DEAD_ZONE) {
            this._aimSource = 'touch';
            this._lastAimRotation = Math.atan2(touchAim.y, touchAim.x);
        }

        if (this._aimSource === 'mouse') {
            // pointer.worldX/Y are only refreshed when the mouse moves: recompute them as the camera follows the player
            const aimPoint: Phaser.Math.Vector2 = this._scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
            this._lastAimRotation = Phaser.Math.Angle.Between(ownerX, ownerY, aimPoint.x, aimPoint.y);
        }

        return this._lastAimRotation;
    }
}
