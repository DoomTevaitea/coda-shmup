import {Plugins, Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import type {
    BonusChoice,
    BonusId,
    BossType,
    DifficultyData,
    EnemyDifficulty,
    NitroStat,
    PlayerBonuses,
    ProgressionData,
    RarityData
} from "../gameData/ProgressionData.ts";

// Player XP, levels and bonuses. The current level, XP and XP goal are stored in the registry for the UI to display
export default class ProgressionManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'ProgressionManager';
    public static readonly MAPPING_NAME: string = 'progressionManager';

    private static readonly FIRST_LEVEL: number = 1;

    private _data: ProgressionData;
    private _level: number;
    private _xp: number;
    private _xpToNextLevel: number;
    // Level ups earned but whose bonus was not chosen yet, when several levels are gained at once
    private _pendingLevelUps: number;
    private _bonusLevels: Record<BonusId, number>;
    // Highest boss level already fought (5, 10, 15...)
    private _lastBossMilestone: number;
    // How many of each boss type showed up, they get tougher every time
    private _bossAppearances: Record<BossType, number>;
    // Nitro levels spent on each stat, the first nitro level only unlocks it
    private _nitroUpgrades: Record<NitroStat, number>;

    public get level(): number {
        return this._level;
    }

    public get hasPendingLevelUp(): boolean {
        return this._pendingLevelUps > 0;
    }

    public get maxHealthCap(): number {
        return this._data.health.maxHealthCap;
    }

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, ProgressionManager.PLUGIN_KEY);
    }

    // Must be called when a game starts: the plugin lives as long as its scene, so it is reused on restart
    public init() {
        this._data = this.scene!.cache.json.get(GameConstants.DataKeys.PROGRESSION) as ProgressionData;

        this._level = ProgressionManager.FIRST_LEVEL;
        this._xp = 0;
        this._xpToNextLevel = this._data.xp.firstLevel;
        this._pendingLevelUps = 0;
        this._bonusLevels = {zoom: 0, boost: 0, speed: 0, damage: 0, multishot: 0, bulletSpeed: 0};
        this._lastBossMilestone = 0;
        this._bossAppearances = {miniBoss: 0, boss: 0};
        this._nitroUpgrades = {speed: 0, duration: 0};

        this.updateRegistry();
    }

    // The boss due at the current level, or null. A mini boss every 5 levels, a boss instead every 10.
    // Gaining several levels at once only gives the last one
    public consumePendingBoss(): {type: BossType, appearance: number} | null {
        const schedule = this._data.bosses;
        const milestone: number = Math.floor(this._level / schedule.miniBossEvery) * schedule.miniBossEvery;
        if (milestone === 0 || milestone <= this._lastBossMilestone)
            return null;

        this._lastBossMilestone = milestone;

        const type: BossType = milestone % schedule.bossEvery === 0 ? 'boss' : 'miniBoss';
        const appearance: number = this._bossAppearances[type]++;

        return {type, appearance};
    }

    // Returns true when this XP makes the player reach at least one new level
    public addXp(amount: number): boolean {
        this._xp += amount;

        let hasLeveledUp: boolean = false;
        while (this._xp >= this._xpToNextLevel) {
            this._xp -= this._xpToNextLevel;
            this._xpToNextLevel += this._data.xp.increasePerLevel;
            this._level++;
            this._pendingLevelUps++;
            hasLeveledUp = true;
        }

        this.updateRegistry();

        return hasLeveledUp;
    }

    // Uses one pending level up and returns the cards to choose from: random upgrades (new ones or improvements,
    // never maxed ones), each with a random rarity, and most of the time the life bonus as the last card
    public consumeLevelUp(): BonusChoice[] {
        if (this._pendingLevelUps <= 0)
            return [];

        this._pendingLevelUps--;

        const upgradableIds: BonusId[] = (Object.keys(this._data.bonuses) as BonusId[])
            .filter(id => this._bonusLevels[id] < this._data.bonuses[id].maxLevel);

        // Always offer the life bonus when there is no upgrade left
        const offersHealth: boolean = upgradableIds.length === 0 || Math.random() < this._data.health.chance;
        const upgradeCount: number = this._data.bonusChoices - (offersHealth ? 1 : 0);

        const choices: BonusChoice[] = Phaser.Utils.Array.Shuffle(upgradableIds).slice(0, upgradeCount)
            .map(id => this.createUpgradeChoice(id));

        if (offersHealth)
            choices.push(this.createHealthChoice());

        return choices;
    }

    // Only for upgrades, the life bonus is applied to the player directly
    public applyUpgrade(choice: BonusChoice) {
        if (choice.id === 'health')
            return;

        const id: BonusId = choice.id;
        const previousLevel: number = this._bonusLevels[id];
        this._bonusLevels[id] = Math.min(choice.nextLevel, this._data.bonuses[id].maxLevel);

        // The first nitro level unlocks it, the following ones improve the stat shown on the card
        if (id === 'boost' && choice.nitroStat) {
            const unlockLevel: number = previousLevel === 0 ? 1 : 0;
            this._nitroUpgrades[choice.nitroStat] += this._bonusLevels[id] - previousLevel - unlockLevel;
        }
    }

    public getBonuses(): PlayerBonuses {
        const valueOf = (id: BonusId): number => this._bonusLevels[id] * this._data.bonuses[id].valuePerLevel;
        const nitro = this._data.nitro;

        return {
            zoom: valueOf('zoom'),
            speed: valueOf('speed'),
            damage: valueOf('damage'),
            multishot: valueOf('multishot'),
            bulletSpeed: valueOf('bulletSpeed'),
            nitro: this._bonusLevels.boost === 0 ? null : {
                speedBonus: nitro.baseSpeedBonus + nitro.speedBonusPerUpgrade * this._nitroUpgrades.speed,
                duration: nitro.baseDuration + nitro.durationPerUpgrade * this._nitroUpgrades.duration,
                rechargeDuration: nitro.rechargeDuration,
                minEnergyToRestart: nitro.minEnergyToRestart
            }
        };
    }

    // Enemies get faster and tougher as the player levels up, whatever bonuses the player picked
    public getEnemyDifficulty(): EnemyDifficulty {
        const levelsGained: number = this._level - ProgressionManager.FIRST_LEVEL;
        const difficulty: DifficultyData = this._data.difficultyPerLevel;

        return {
            speedMultiplier: Math.min(difficulty.maxEnemySpeedMultiplier,
                Math.pow(difficulty.enemySpeedMultiplier, levelsGained)),
            healthBonus: Math.floor(levelsGained / difficulty.enemyHealthIncreaseEvery)
        };
    }

    // Spawn more often and allow more enemies at once as the player levels up
    public getSpawnDelay(baseDelay: number): number {
        const levelsGained: number = this._level - ProgressionManager.FIRST_LEVEL;
        const difficulty: DifficultyData = this._data.difficultyPerLevel;

        return Math.max(difficulty.minSpawnDelay, baseDelay * Math.pow(difficulty.spawnDelayMultiplier, levelsGained));
    }

    public getMaxActive(baseMaxActive: number): number {
        const levelsGained: number = this._level - ProgressionManager.FIRST_LEVEL;
        return baseMaxActive + Math.floor(levelsGained * this._data.difficultyPerLevel.maxActiveIncrease);
    }

    private createUpgradeChoice(id: BonusId): BonusChoice {
        const bonus = this._data.bonuses[id];
        const currentLevel: number = this._bonusLevels[id];
        const rarity: RarityData = this.rollRarity(bonus.maxLevel - currentLevel);
        const nextLevel: number = currentLevel + rarity.levels;

        // Nitro upgrades improve either its speed or its duration, picked at random for each card
        let description: string = bonus.description;
        let nitroStat: NitroStat | undefined;
        if (id === 'boost' && nextLevel > 1) {
            nitroStat = Math.random() < 0.5 ? 'speed' : 'duration';
            const upgradeDescription: string = this._data.nitro.upgrades[nitroStat];
            description = currentLevel === 0 ? `${bonus.description}. ${upgradeDescription}` : upgradeDescription;
        }

        return {
            id,
            name: bonus.name,
            description,
            rarity,
            currentLevel,
            nextLevel,
            maxLevel: bonus.maxLevel,
            nitroStat
        };
    }

    private createHealthChoice(): BonusChoice {
        const rarity: RarityData = this.rollRarity(Number.POSITIVE_INFINITY);

        return {
            id: 'health',
            name: this._data.health.name,
            description: this._data.health.description,
            rarity,
            currentLevel: 0,
            nextLevel: rarity.levels,
            maxLevel: this._data.health.maxHealthCap
        };
    }

    // Weighted random rarity, among the ones already unlocked at this player level (no early epic or legendary)
    // and that don't give more levels than the bonus can still gain
    private rollRarity(maxLevels: number): RarityData {
        const allowed: RarityData[] = this._data.rarities
            .filter(rarity => rarity.fromLevel <= this._level && rarity.levels <= maxLevels);
        const totalWeight: number = allowed.reduce((sum, rarity) => sum + rarity.weight, 0);

        let roll: number = Math.random() * totalWeight;
        for (const rarity of allowed) {
            roll -= rarity.weight;
            if (roll < 0)
                return rarity;
        }

        return allowed[0];
    }

    private updateRegistry() {
        const registry = this.scene!.registry;
        registry.set(RegistryConstants.Keys.PLAYER_LEVEL, this._level);
        registry.set(RegistryConstants.Keys.PLAYER_XP_TO_NEXT_LEVEL, this._xpToNextLevel);
        registry.set(RegistryConstants.Keys.PLAYER_XP, this._xp);
    }
}
