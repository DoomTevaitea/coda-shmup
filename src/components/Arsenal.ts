import {Scene} from "phaser";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";
import type {WeaponId, WeaponsData} from "../gameData/WeaponsData.ts";
import CombatTargets from "../weapons/CombatTargets.ts";
import DroneWeapon from "../weapons/DroneWeapon.ts";
import MissileWeapon from "../weapons/MissileWeapon.ts";
import LaserWeapon from "../weapons/LaserWeapon.ts";
import ShieldWeapon from "../weapons/ShieldWeapon.ts";
import GameConstants from "../GameConstants.ts";

// The extra weapons of the player, next to the turret. Each one stays inactive until its level is above 0
export default class Arsenal implements IComponent {
    private static readonly MISSILE_EXPLOSION_SIZE: number = 60;

    public enabled: boolean = true;

    private readonly _targets: CombatTargets;
    private readonly _drones: DroneWeapon;
    private readonly _missiles: MissileWeapon;
    private readonly _laser: LaserWeapon;
    private readonly _shield: ShieldWeapon;

    public constructor(scene: Scene, data: WeaponsData, targets: CombatTargets) {
        this._targets = targets;
        this._drones = new DroneWeapon(scene, data.drones, targets);
        this._missiles = new MissileWeapon(scene, data.missiles, targets, (x, y) => {
            scene.events.emit(GameConstants.Events.EXPLOSION_EVENT, x, y, Arsenal.MISSILE_EXPLOSION_SIZE);
        });
        this._laser = new LaserWeapon(scene, data.piercingLaser, targets);
        this._shield = new ShieldWeapon(scene, data.shield);
    }

    public setLevels(owner: Entity, levels: Record<WeaponId, number>) {
        this._drones.setLevel(levels.drones);
        this._missiles.setLevel(levels.missiles);
        this._laser.setLevel(levels.piercingLaser);
        this._shield.setLevel(owner, levels.shield);
    }

    public update(owner: Entity, deltaTime: number, aimRotation: number) {
        if (!this.enabled)
            return;

        const enemies: Entity[] = this._targets.getDamageableEnemies();
        this._drones.update(owner, deltaTime, enemies);
        this._missiles.update(owner, deltaTime, enemies);
        this._laser.update(owner, deltaTime, enemies, aimRotation);
        this._shield.update(owner, deltaTime);
    }

    // When the owner dies
    public hide() {
        this._drones.hide();
        this._missiles.hide();
        this._laser.hide();
        this._shield.hide();
    }
}
