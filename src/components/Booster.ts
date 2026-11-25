import IComponent from "./IComponent.ts";
import type {NitroStats} from "../gameData/ProgressionData.ts";

// A nitro tank: boosting empties it, it refills on its own when not boosting.
// Emits CHANGE_EVENT with the energy ratio (0 to 1) so the UI can show it
export default class Booster extends Phaser.Events.EventEmitter implements IComponent {
    public static readonly CHANGE_EVENT: string = 'change';

    public enabled: boolean = true;

    // null until the nitro bonus is unlocked
    private _stats: NitroStats | null = null;
    // Remaining boost time (ms)
    private _energy: number = 0;
    // Set when the tank runs dry: no boost until it refills enough
    private _isEmpty: boolean = false;
    private _isBoosting: boolean = false;

    public get isUnlocked(): boolean {
        return this._stats !== null;
    }

    public get isBoosting(): boolean {
        return this._isBoosting;
    }

    public get isEmpty(): boolean {
        return this._isEmpty;
    }

    public get energyRatio(): number {
        return this._stats ? this._energy / this._stats.duration : 0;
    }

    // Speed multiplier to apply this frame: 1 when not boosting
    public get speedMultiplier(): number {
        return this._isBoosting && this._stats ? 1 + this._stats.speedBonus : 1;
    }

    // A bigger tank starts full when the nitro is unlocked, and keeps its ratio when upgraded
    public setStats(stats: NitroStats | null) {
        const ratio: number = this._stats ? this.energyRatio : 1;
        this._stats = stats;
        this._energy = stats ? stats.duration * ratio : 0;
        this.emit(Booster.CHANGE_EVENT, this.energyRatio);
    }

    public update(wantsToBoost: boolean, deltaTime: number) {
        if (!this.enabled || !this._stats)
            return;

        const stats: NitroStats = this._stats;
        const previousEnergy: number = this._energy;

        this._isBoosting = wantsToBoost && !this._isEmpty && this._energy > 0;
        if (this._isBoosting) {
            this._energy = Math.max(0, this._energy - deltaTime);
            if (this._energy === 0)
                this._isEmpty = true;
        } else {
            // Refilling the whole tank always takes rechargeDuration, whatever its size
            this._energy = Math.min(stats.duration, this._energy + deltaTime * stats.duration / stats.rechargeDuration);
            if (this._isEmpty && this.energyRatio >= stats.minEnergyToRestart)
                this._isEmpty = false;
        }

        if (this._energy !== previousEnergy)
            this.emit(Booster.CHANGE_EVENT, this.energyRatio);
    }
}
