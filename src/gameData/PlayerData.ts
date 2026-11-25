import {BulletJsonData} from "./BulletData.ts";

export type PlayerData = {
    health: number;
    // How long the ship can't be hit again after a hit (ms)
    hitInvulnerability: number;
    // Time between two automatic shots (ms)
    shootDelay: number;
    // Angle between two bullets of the same shot, once the multishot bonus is unlocked (degrees)
    multishotAngle: number;
    bullet: BulletJsonData;
    turret: TurretData;
}

export type TurretData = {
    color: string;
    baseRadius: number;
    barrelLength: number;
    barrelWidth: number;
}
