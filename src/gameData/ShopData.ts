export type PermanentUpgradeId = 'hull' | 'thrusters' | 'cannon' | 'scholar' | 'nitroKit';

export type ShopData = {
    // Credits earned at the end of a game
    credits: {
        perKill: number;
        perLevel: number;
        perMiniBoss: number;
        perBoss: number;
    };
    leaderboardSize: number;
    upgrades: Record<PermanentUpgradeId, PermanentUpgradeData>;
}

export type PermanentUpgradeData = {
    name: string;
    description: string;
    // The upgrade value is level * valuePerLevel
    valuePerLevel: number;
    // Price of each level, so the max level is the number of costs
    costs: number[];
}

// Applied at the start of every game, from the upgrades bought in the shop
export type PermanentBonuses = {
    startHealth: number;
    speed: number;
    damage: number;
    xpMultiplier: number;
    hasNitro: boolean;
}

// What happened during a game, shown on the game over screen
export type RunStats = {
    score: number;
    level: number;
    kills: number;
    miniBosses: number;
    bosses: number;
    // Time survived, pauses excluded (ms)
    duration: number;
}

export type LeaderboardEntry = {
    name: string;
    score: number;
    level: number;
}
