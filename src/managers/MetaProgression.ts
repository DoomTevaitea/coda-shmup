import SaveManager from "./SaveManager.ts";
import SaveConstants from "../SaveConstants.ts";
import type {
    LeaderboardEntry,
    PermanentBonuses,
    PermanentUpgradeId,
    RunStats,
    ShopData
} from "../gameData/ShopData.ts";

// Everything kept from one game to the next, stored with the SaveManager: credits, shop upgrades, leaderboard
export default class MetaProgression {
    private readonly _saveManager: SaveManager;
    private readonly _data: ShopData;

    public constructor(saveManager: SaveManager, data: ShopData) {
        this._saveManager = saveManager;
        this._data = data;
    }

    public get data(): ShopData {
        return this._data;
    }

    public get credits(): number {
        return Number(this._saveManager.getData(SaveConstants.Keys.CREDITS) ?? 0);
    }

    public get bestScore(): number {
        return Number(this._saveManager.getData(SaveConstants.Keys.PLAYER_BEST_SCORE) ?? 0);
    }

    public getLevel(id: PermanentUpgradeId): number {
        const levels: Partial<Record<PermanentUpgradeId, number>> =
            this._saveManager.getData(SaveConstants.Keys.PERMANENT_UPGRADES) ?? {};
        return levels[id] ?? 0;
    }

    public getMaxLevel(id: PermanentUpgradeId): number {
        return this._data.upgrades[id].costs.length;
    }

    // null when the upgrade is maxed
    public getNextCost(id: PermanentUpgradeId): number | null {
        return this._data.upgrades[id].costs[this.getLevel(id)] ?? null;
    }

    public buy(id: PermanentUpgradeId): boolean {
        const cost: number | null = this.getNextCost(id);
        if (cost === null || cost > this.credits)
            return false;

        const levels: Partial<Record<PermanentUpgradeId, number>> =
            {...(this._saveManager.getData(SaveConstants.Keys.PERMANENT_UPGRADES) ?? {})};
        levels[id] = this.getLevel(id) + 1;

        this._saveManager.setData(SaveConstants.Keys.CREDITS, this.credits - cost, false);
        this._saveManager.setData(SaveConstants.Keys.PERMANENT_UPGRADES, levels);

        return true;
    }

    public getPermanentBonuses(): PermanentBonuses {
        const valueOf = (id: PermanentUpgradeId): number => this.getLevel(id) * this._data.upgrades[id].valuePerLevel;

        return {
            startHealth: valueOf('hull'),
            speed: valueOf('thrusters'),
            damage: valueOf('cannon'),
            xpMultiplier: 1 + valueOf('scholar'),
            hasNitro: this.getLevel('nitroKit') > 0
        };
    }

    public computeCredits(stats: RunStats): number {
        const credits = this._data.credits;
        return stats.kills * credits.perKill + (stats.level - 1) * credits.perLevel
            + stats.miniBosses * credits.perMiniBoss + stats.bosses * credits.perBoss;
    }

    // Saves the credits earned and the best score. Returns true for a new best score
    public endRun(stats: RunStats, creditsEarned: number): boolean {
        const isBestScore: boolean = stats.score > this.bestScore;
        this._saveManager.setData(SaveConstants.Keys.CREDITS, this.credits + creditsEarned, false);
        if (isBestScore)
            this._saveManager.setData(SaveConstants.Keys.PLAYER_BEST_SCORE, stats.score, false);
        this._saveManager.save();

        return isBestScore;
    }

    public getLeaderboard(): LeaderboardEntry[] {
        return this._saveManager.getData(SaveConstants.Keys.LEADERBOARD) ?? [];
    }

    public isLeaderboardScore(score: number): boolean {
        const leaderboard: LeaderboardEntry[] = this.getLeaderboard();
        return score > 0 && (leaderboard.length < this._data.leaderboardSize
            || score > leaderboard[leaderboard.length - 1].score);
    }

    public addToLeaderboard(entry: LeaderboardEntry) {
        const leaderboard: LeaderboardEntry[] = [...this.getLeaderboard(), entry]
            .sort((a, b) => b.score - a.score)
            .slice(0, this._data.leaderboardSize);
        this._saveManager.setData(SaveConstants.Keys.LEADERBOARD, leaderboard);
    }
}
