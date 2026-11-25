import {EliteData} from "./EliteData.ts";

export type BonusId = 'zoom' | 'boost' | 'speed' | 'damage' | 'multishot' | 'bulletSpeed'
    | 'drones' | 'missiles' | 'piercingLaser' | 'shield';
// Everything that can be offered on level up: the upgrades, plus the life bonus
export type ChoiceId = BonusId | 'health';

export type ProgressionData = {
    xp: {
        // XP needed to reach level 2
        firstLevel: number;
        // Each level needs this much more XP than the previous one (5, 10, 15... so levels at 5, 15, 30 total XP)
        increasePerLevel: number;
    };
    // How many bonuses are offered on each level up, the life bonus included
    bonusChoices: number;
    // From the most common to the rarest
    rarities: RarityData[];
    health: HealthBonusData;
    nitro: NitroData;
    elites: EliteData;
    bosses: BossScheduleData;
    bonuses: Record<BonusId, BonusData>;
    difficultyPerLevel: DifficultyData;
}

export type RarityData = {
    name: string;
    color: string;
    // How many levels the bonus gains (or lives for the life bonus)
    levels: number;
    // Relative chance to be rolled, compared to the other rarities
    weight: number;
    // Can't be rolled before this player level, so the start of the game stays challenging
    fromLevel: number;
}

export type BossType = 'miniBoss' | 'boss';

export type BossScheduleData = {
    // A mini boss shows up on every level multiple of this...
    miniBossEvery: number;
    // ...and a boss instead on every level multiple of this one
    bossEvery: number;
}

export type HealthBonusData = {
    name: string;
    description: string;
    // Chance (0 to 1) that the life bonus is one of the choices
    chance: number;
    // The max health can't grow past this
    maxHealthCap: number;
}

// What a nitro upgrade improves, once the nitro is unlocked
export type NitroStat = 'speed' | 'duration';

export type NitroData = {
    // Speed bonus while boosting once unlocked (0.6 = +60%), and added by each speed upgrade
    baseSpeedBonus: number;
    speedBonusPerUpgrade: number;
    // How long a full nitro bar lasts (ms) once unlocked, and added by each duration upgrade
    baseDuration: number;
    durationPerUpgrade: number;
    // Time to refill an empty bar (ms)
    rechargeDuration: number;
    // Once empty, the bar must refill to this ratio (0 to 1) before boosting again
    minEnergyToRestart: number;
    // Card description of each kind of upgrade
    upgrades: Record<NitroStat, string>;
}

export type BonusData = {
    name: string;
    description: string;
    maxLevel: number;
    // The bonus value is level * valuePerLevel
    valuePerLevel: number;
}

export type DifficultyData = {
    // Spawn delays are multiplied by this on each player level...
    spawnDelayMultiplier: number;
    // ...but never go below this (ms)
    minSpawnDelay: number;
    // Extra enemies of each type allowed at once, per level (0.5 = one more every 2 levels)
    maxActiveIncrease: number;
    // Enemy speed is multiplied by this on each player level...
    enemySpeedMultiplier: number;
    // ...but never gets more than this many times faster than in the enemy JSON
    maxEnemySpeedMultiplier: number;
    // Enemies get +1 health every N player levels
    enemyHealthIncreaseEvery: number;
}

// A card of the level up screen
export type BonusChoice = {
    id: ChoiceId;
    name: string;
    description: string;
    rarity: RarityData;
    // Upgrades only: level before and after picking this card (0 = not unlocked yet)
    currentLevel: number;
    nextLevel: number;
    maxLevel: number;
    // Nitro only: what the upgrade levels of this card improve
    nitroStat?: NitroStat;
}

// Current value of every bonus, 0 when not unlocked. The nitro has its own stats, null until unlocked
export type PlayerBonuses = Record<Exclude<BonusId, 'boost'>, number> & {
    nitro: NitroStats | null;
}

export type NitroStats = {
    speedBonus: number;
    duration: number;
    rechargeDuration: number;
    minEnergyToRestart: number;
}

// How much tougher enemies spawned at the current level are
export type EnemyDifficulty = {
    speedMultiplier: number;
    healthBonus: number;
}
