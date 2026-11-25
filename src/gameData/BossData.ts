import {BulletJsonData} from "./BulletData.ts";

export type BossData = {
    // Shown above the boss health bar
    name: string;
    texture: string;
    tint: string;
    scale: number;
    health: number;
    // Each new appearance of this boss has this much more health: 0.5 = +50% every time
    healthGrowthPerAppearance: number;
    xp: number;
    // Lives lost by the player when touching the boss
    contactDamage: number;
    // The camera zoom is multiplied by this during the fight, to see the whole boss and its attacks
    zoomMultiplier: number;
    movement: {
        speed: number;
        // Degrees per second
        turnSpeed: number;
    };
    bullet: BulletJsonData;
    // Pause between the end of an attack and the start of the next one (ms)
    attackDelay: number;
    // Played in this order, again and again
    attacks: BossAttackData[];
}

export type BossAttackData = SpiralAttackData | LaserAttackData | DashAttackData | SummonAttackData;

// Rings of bullets all around the boss, each ring a bit rotated from the previous one
export type SpiralAttackData = {
    type: 'spiral';
    waves: number;
    bulletsPerWave: number;
    // Time between two rings (ms)
    waveDelay: number;
    // Rotation added to each new ring (degrees)
    rotationPerWave: number;
}

// A thin blinking line shows where the laser will fire, then a beam sweeps across that area
export type LaserAttackData = {
    type: 'laser';
    color: string;
    warningDuration: number;
    fireDuration: number;
    width: number;
    // Total angle swept while firing (degrees), 0 for a fixed beam
    sweepAngle: number;
}

// The boss blinks, then charges in a straight line where the player was
export type DashAttackData = {
    type: 'dash';
    warningDuration: number;
    duration: number;
    speed: number;
}

// Calls enemies around the boss
export type SummonAttackData = {
    type: 'summon';
    // Key of a ConfigurableEnemy JSON, e.g. "speedEnemy"
    enemyKey: string;
    count: number;
}
