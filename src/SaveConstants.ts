export default class SaveConstants {
    public static readonly Keys = Object.freeze({
        PLAYER_BEST_SCORE: 'playerBestScore',
        CREDITS: 'credits',
        // Level of each permanent upgrade bought in the shop
        PERMANENT_UPGRADES: 'permanentUpgrades',
        LEADERBOARD: 'leaderboard',
    } as const);
}
