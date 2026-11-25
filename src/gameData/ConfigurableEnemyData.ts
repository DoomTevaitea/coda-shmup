import {BulletJsonData} from "./BulletData.ts";
import {SpawnData} from "./SpawnData.ts";

export type ConfigurableEnemyData = {
    texture: string;
    tint: string;
    scale: number;
    health: number;
    // XP given to the player when killed
    xp: number;
    spawn: SpawnData;
    movement: SineMovementData;
    spreadShot: SpreadShotData;
}

export type SineMovementData = {
    speed: number;
    // Degrees per second
    turnSpeed: number;
    // Sine weaving around the chase path (px), 0 to fly straight
    amplitude: number;
    period: number;
}

export type SpreadShotData = {
    delay: number;
    // 0 for an enemy that never shoots
    bulletCount: number;
    spreadAngle: number;
    bullet: BulletJsonData;
}
