import {BulletData} from "./BulletData.ts";

export type SineEnemyData = {
    texture: string;
    tint: string;
    scale: number;
    health: number;
    spawn: SpawnData;
    movement: SineMovementData;
    spreadShot: SpreadShotData;
}

export type SpawnData = {
    delay: number;
    maxActive: number;
}

export type SineMovementData = {
    verticalSpeed: number;
    amplitude: number;
    period: number;
}

export type SpreadShotData = {
    delay: number;
    bulletCount: number;
    spreadAngle: number;
    bullet: BulletJsonData;
}

// JSON has no hexadecimal literal: colors are written as "#rrggbb" strings
export type BulletJsonData = Omit<BulletData, 'color'> & {
    color: string;
}
