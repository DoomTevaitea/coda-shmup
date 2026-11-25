// What makes an elite enemy different, one picked at random for each elite
export type ElitePower = 'shield' | 'haste' | 'nova';

export type EliteData = {
    // No elite before this player level
    fromLevel: number;
    // Chance (0 to 1) that a regular enemy spawns as an elite
    chance: number;
    // Elites are bigger, tougher and give much more XP than their regular version
    scale: number;
    healthMultiplier: number;
    xpMultiplier: number;
    // Golden aura around elites
    color: string;
    shield: {
        // Hits blocked before the elite starts losing health
        hits: number;
        color: string;
    };
    haste: {
        speedMultiplier: number;
    };
    nova: {
        // Ring of bullets all around the elite every delay (ms)
        delay: number;
        bulletCount: number;
    };
}
