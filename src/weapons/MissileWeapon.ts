import {GameObjects, Scene} from "phaser";
import Entity from "../entities/Entity.ts";
import type {MissilesData} from "../gameData/WeaponsData.ts";
import CombatTargets, {nearestEnemy, valueAtLevel} from "./CombatTargets.ts";

type Missile = {
    image: GameObjects.Image;
    target: Entity | null;
    age: number;
    active: boolean;
}

// Salvos of homing missiles, each one flying toward the nearest enemy and exploding on it
export default class MissileWeapon {
    private static readonly TEXTURE_KEY: string = 'missile';
    private static readonly TEXTURE_WIDTH: number = 26;
    private static readonly TEXTURE_HEIGHT: number = 10;
    private static readonly MIN_DELAY: number = 400;
    // Missiles leave in a fan, not all on top of each other
    private static readonly LAUNCH_SPREAD_DEGREES: number = 30;
    private static readonly DEPTH: number = 1;

    private readonly _scene: Scene;
    private readonly _data: MissilesData;
    private readonly _targets: CombatTargets;
    private readonly _missiles: Missile[] = [];
    private readonly _onExplode: (x: number, y: number) => void;
    private _level: number = 0;
    private _timer: number = 0;

    public constructor(scene: Scene, data: MissilesData, targets: CombatTargets, onExplode: (x: number, y: number) => void) {
        this._scene = scene;
        this._data = data;
        this._targets = targets;
        this._onExplode = onExplode;
        MissileWeapon.createTexture(scene, Phaser.Display.Color.HexStringToColor(data.color).color);
    }

    // Shared by the whole game: only drawn once
    private static createTexture(scene: Scene, color: number) {
        if (scene.textures.exists(MissileWeapon.TEXTURE_KEY))
            return;

        const width: number = MissileWeapon.TEXTURE_WIDTH;
        const height: number = MissileWeapon.TEXTURE_HEIGHT;
        scene.make.graphics({}, false)
            .fillStyle(color)
            .fillRect(0, 0, width - height / 2, height)
            .fillStyle(0xffffff)
            .fillTriangle(width - height / 2, 0, width, height / 2, width - height / 2, height)
            .generateTexture(MissileWeapon.TEXTURE_KEY, width, height)
            .destroy();
    }

    public setLevel(level: number) {
        this._level = level;
    }

    public update(owner: Entity, deltaTime: number, enemies: Entity[]) {
        if (this._level > 0) {
            this._timer += deltaTime;
            const delay: number = Math.max(MissileWeapon.MIN_DELAY,
                valueAtLevel(this._data.delay, this._data.delayPerLevel, this._level));
            if (this._timer >= delay && enemies.length > 0) {
                this._timer = 0;
                this.fireSalvo(owner, enemies);
            }
        }

        for (const missile of this._missiles) {
            if (missile.active)
                this.updateMissile(missile, deltaTime, enemies);
        }
    }

    private fireSalvo(owner: Entity, enemies: Entity[]) {
        const count: number = 1 + Math.floor((this._level - 1) / this._data.countEveryLevels);
        for (let i: number = 0; i < count; i++) {
            const missile: Missile = this.getFreeMissile();
            const spread: number = count > 1 ? (i / (count - 1) - 0.5) * MissileWeapon.LAUNCH_SPREAD_DEGREES : 0;

            missile.active = true;
            missile.age = 0;
            missile.target = nearestEnemy(enemies, owner.x, owner.y);
            missile.image.setPosition(owner.x, owner.y).setVisible(true)
                .setRotation(owner.rotation + Phaser.Math.DegToRad(spread));
        }
    }

    private getFreeMissile(): Missile {
        const free: Missile | undefined = this._missiles.find(missile => !missile.active);
        if (free)
            return free;

        const missile: Missile = {
            image: this._scene.add.image(0, 0, MissileWeapon.TEXTURE_KEY).setDepth(MissileWeapon.DEPTH),
            target: null,
            age: 0,
            active: false
        };
        this._missiles.push(missile);

        return missile;
    }

    private updateMissile(missile: Missile, deltaTime: number, enemies: Entity[]) {
        const image: GameObjects.Image = missile.image;
        missile.age += deltaTime;
        if (missile.age >= this._data.lifetime) {
            this.explode(missile);
            return;
        }

        // The target died or was recycled: find another one
        if (!missile.target || !missile.target.active)
            missile.target = nearestEnemy(enemies, image.x, image.y);

        if (missile.target) {
            const targetRotation: number = Phaser.Math.Angle.Between(image.x, image.y, missile.target.x, missile.target.y);
            const maxTurn: number = Phaser.Math.DegToRad(this._data.turnSpeed) * deltaTime / 1000;
            image.rotation = Phaser.Math.Angle.RotateTo(image.rotation, targetRotation, maxTurn);
        }

        image.x += Math.cos(image.rotation) * this._data.speed * deltaTime;
        image.y += Math.sin(image.rotation) * this._data.speed * deltaTime;

        if (missile.target && Phaser.Math.Distance.Between(image.x, image.y, missile.target.x, missile.target.y)
            <= this._data.hitRadius + missile.target.displayWidth / 2) {
            this._targets.damageEnemy(missile.target, valueAtLevel(this._data.damage, this._data.damagePerLevel, this._level));
            this.explode(missile);
        }
    }

    private explode(missile: Missile) {
        this._onExplode(missile.image.x, missile.image.y);
        missile.active = false;
        missile.target = null;
        missile.image.setVisible(false);
    }

    public hide() {
        this._level = 0;
        for (const missile of this._missiles) {
            missile.active = false;
            missile.image.setVisible(false);
        }
    }
}
