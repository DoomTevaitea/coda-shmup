export default class GameConstants {
    public static readonly Events = Object.freeze({
        PLAYER_SPAWNED_EVENT: "playerSpawned",
        ENEMY_SPAWNED_EVENT: "enemySpawned",
        // Emitted on the game scene events with the XP the enemy gives and the enemy itself
        ENEMY_KILLED_EVENT: "enemyKilled",
        // Emitted on the game scene events when an enemy loses health: x, y, amount
        DAMAGE_DEALT_EVENT: "damageDealt",
        // Emitted on the game scene events for an explosion with nothing dying, like a missile: x, y, size
        EXPLOSION_EVENT: "explosion",
        // Emitted on the game events by the level up screen with the chosen card (BonusChoice)
        BONUS_CHOSEN_EVENT: "bonusChosen",
        // Emitted on the game events with the Boss, for the UI to show its health bar
        BOSS_SPAWNED_EVENT: "bossSpawned",
        // Emitted on the game events with the Boss when it dies
        BOSS_DEFEATED_EVENT: "bossDefeated",
        // Emitted on the game scene events by a boss calling help: enemy data key, count, x, y
        BOSS_SUMMON_EVENT: "bossSummon",
        // Emitted on the game events a few times per second with a MinimapSnapshot, for the UI minimap
        MINIMAP_UPDATE_EVENT: "minimapUpdate",
        // Emitted on the game events by the touch pause button
        PAUSE_REQUESTED_EVENT: "pauseRequested",
    } as const);

    public static readonly SceneKeys = Object.freeze({
        HOME: "HomeScene",
        SHOP: "ShopScene",
        LEADERBOARD: "LeaderboardScene",
        CONTROLS: "ControlsScene",
        MAIN_GAME: "MainGameScene",
        MAIN_UI: "MainUIScene",
        LEVEL_UP: "LevelUpScene",
        PAUSE: "PauseScene",
        GAME_OVER: "GameOverScene",
    } as const);

    // Keys of the JSON files of public/assets/Data in the Phaser cache
    public static readonly DataKeys = Object.freeze({
        WORLD: "world",
        PLAYER: "player",
        PLAYER_SHIPS: "playerShips",
        WEAPONS: "weapons",
        ENEMY: "enemy",
        SINE_ENEMY: "sineEnemy",
        SPEED_ENEMY: "speedEnemy",
        TANK_ENEMY: "tankEnemy",
        MINI_BOSS: "miniBoss",
        BOSS: "boss",
        PROGRESSION: "progression",
        SHOP: "shop",
    } as const);

    // Every enemy type made with ConfigurableEnemy: add a JSON file and its key here to create a new one
    public static readonly CONFIGURABLE_ENEMY_KEYS: readonly string[] = Object.freeze([
        GameConstants.DataKeys.SINE_ENEMY,
        GameConstants.DataKeys.SPEED_ENEMY,
        GameConstants.DataKeys.TANK_ENEMY,
    ]);

    // Standard gamepad mapping, as a PS5 DualSense is seen by the browser
    public static readonly GamepadButtons = Object.freeze({
        CROSS: 0,
        CIRCLE: 1,
        L1: 4,
        R1: 5,
        L2: 6,
        R2: 7,
        OPTIONS: 9,
        DPAD_UP: 12,
        DPAD_DOWN: 13,
        DPAD_LEFT: 14,
        DPAD_RIGHT: 15,
    } as const);

    public static readonly MAX_SCORE_DIGITS: number = 6;
}
