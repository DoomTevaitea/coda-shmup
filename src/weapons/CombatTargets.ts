import Entity from "../entities/Entity.ts";

// What the player weapons need from the game: who can be hurt, and how to hurt them.
// The EntityManager provides it, the weapons don't need to know about enemy groups or the score
export default interface CombatTargets {
    getDamageableEnemies(): Entity[];
    damageEnemy(enemy: Entity, amount: number): void;
}

// Value of a stat at a weapon level: base at level 1, plus perLevel for each level above
export function valueAtLevel(base: number, perLevel: number, level: number): number {
    return base + perLevel * Math.max(0, level - 1);
}

export function nearestEnemy(enemies: Entity[], x: number, y: number): Entity | null {
    let nearest: Entity | null = null;
    let nearestDistance: number = Number.POSITIVE_INFINITY;
    for (const enemy of enemies) {
        const distance: number = Phaser.Math.Distance.Squared(x, y, enemy.x, enemy.y);
        if (distance < nearestDistance) {
            nearest = enemy;
            nearestDistance = distance;
        }
    }

    return nearest;
}
