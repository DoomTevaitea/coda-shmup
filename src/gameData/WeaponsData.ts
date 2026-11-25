// Extra player weapons, unlocked and upgraded with the level up cards.
// "...PerLevel" values are added for each level above the first one
export type WeaponsData = {
    drones: DronesData;
    missiles: MissilesData;
    piercingLaser: PiercingLaserData;
    shield: ShieldData;
}

// Drones orbiting the ship, hurting enemies they touch. One more drone per level
export type DronesData = {
    radius: number;
    // Degrees per second
    rotationSpeed: number;
    size: number;
    color: string;
    damage: number;
    damagePerLevel: number;
    // The same enemy can't be hurt again by the drones before this delay (ms)
    hitCooldown: number;
}

// Homing missiles fired at the nearest enemies
export type MissilesData = {
    delay: number;
    delayPerLevel: number;
    // One more missile per salvo every N levels
    countEveryLevels: number;
    damage: number;
    damagePerLevel: number;
    speed: number;
    // Degrees per second
    turnSpeed: number;
    lifetime: number;
    hitRadius: number;
    color: string;
}

// A beam fired where the turret aims, hurting every enemy along it
export type PiercingLaserData = {
    delay: number;
    delayPerLevel: number;
    damage: number;
    damagePerLevel: number;
    width: number;
    widthPerLevel: number;
    length: number;
    // How long the beam stays visible (ms)
    duration: number;
    color: string;
}

// Blocks hits, then recharges
export type ShieldData = {
    rechargeDelay: number;
    rechargeDelayPerLevel: number;
    hits: number;
    // One more blocked hit every N levels
    extraHitEveryLevels: number;
    color: string;
}

export type WeaponId = keyof WeaponsData;
