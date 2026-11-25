import {BulletJsonData} from "./BulletData.ts";
import {SpawnData} from "./SpawnData.ts";

export type EnemyData = {
    health: number;
    // XP given to the player when killed
    xp: number;
    spawn: SpawnData;
    movement: {
        speed: number;
        // Degrees per second
        turnSpeed: number;
    };
    shoot: {
        // Each enemy picks a random delay between its shots in this range (ms)
        minDelay: number;
        maxDelay: number;
        bullet: BulletJsonData;
    };
}
