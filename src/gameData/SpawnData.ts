export type SpawnData = {
    // Time between two spawn attempts (ms)
    delay: number;
    // No new spawn while this many enemies of this type are alive
    maxActive: number;
    // This type only starts spawning once the player reaches this level
    fromLevel: number;
}
