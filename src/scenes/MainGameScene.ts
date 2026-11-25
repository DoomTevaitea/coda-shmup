import {Scene, GameObjects, Input} from 'phaser';
import Health from "../components/Health.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import EntityManager from "../managers/EntityManager.ts";
import ProgressionManager from "../managers/ProgressionManager.ts";
import MetaProgression from "../managers/MetaProgression.ts";
import EffectsManager from "../effects/EffectsManager.ts";
import GameConstants from "../GameConstants.ts";
import Entity from "../entities/Entity.ts";
import Player from "../entities/Player.ts";
import Boss from "../entities/Boss.ts";
import type {WorldData} from "../gameData/WorldData.ts";
import type {BonusChoice, BossType, PlayerBonuses} from "../gameData/ProgressionData.ts";
import type {PermanentBonuses, RunStats, ShopData} from "../gameData/ShopData.ts";
import type {LevelUpSceneData} from "./LevelUpScene.ts";
import type {MinimapPoint, MinimapSnapshot} from "../gameData/MinimapData.ts";

export default class MainGameScene extends Scene {
    private static readonly BG_TILE_SCALE: number = 2;
    // Extra size of the background around the screen, so the camera shake never shows its edges
    private static readonly BG_MARGIN: number = 512;
    private static readonly ZOOM_TRANSITION_DURATION: number = 1200;
    private static readonly BOSS_DEFEATED_SHAKE_DURATION: number = 600;
    private static readonly BOSS_DEFEATED_SHAKE_INTENSITY: number = 0.03;
    // Time left to watch the player explosion before the game over screen (ms)
    private static readonly GAME_OVER_DELAY: number = 1000;
    private static readonly PLAYER_EXPLOSION_SIZE: number = 300;

    private bg: GameObjects.TileSprite;
    private worldData: WorldData;
    private player: Player;
    private effects: EffectsManager;
    // The boss currently fought, null between boss fights
    private boss: Boss | null = null;
    private bossType: BossType | null = null;
    private planetPosition: MinimapPoint;
    // What happened during this game, for the game over screen
    private stats: Omit<RunStats, 'score' | 'level' | 'duration'>;
    private startTime: number;
    private saveManager: SaveManager;
    private entityManager: EntityManager;
    private progressionManager: ProgressionManager;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_GAME);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        if (!this.saveManager) {
            console.error('SaveManager plugin not found');
        }
        this.saveManager?.load();
        const meta = new MetaProgression(this.saveManager, this.cache.json.get(GameConstants.DataKeys.SHOP) as ShopData);
        const permanentBonuses: PermanentBonuses = meta.getPermanentBonuses();

        // The mouse aims the player turret: a crosshair is easier to aim with than an arrow
        this.input.setDefaultCursor('crosshair');

        // The background is fixed to the screen and only its texture scrolls with the camera, so it covers an endless area
        this.bg = this.add.tileSprite(this.cameras.main.centerX, this.cameras.main.centerY, 0, 0, 'bg')
            .setTileScale(MainGameScene.BG_TILE_SCALE).setScrollFactor(0);
        this.worldData = this.cache.json.get(GameConstants.DataKeys.WORLD) as WorldData;
        const worldWidth: number = this.worldData.width;
        const worldHeight: number = this.worldData.height;

        this.planetPosition = {x: worldWidth / 3, y: worldHeight / 3};
        this.add.image(this.planetPosition.x, this.planetPosition.y, 'planet');

        // Show the world limits, the player can't fly past them
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);
        this.add.graphics()
            .lineStyle(this.worldData.border.width, Phaser.Display.Color.HexStringToColor(this.worldData.border.color).color)
            .strokeRect(0, 0, worldWidth, worldHeight);

        if (!this.entityManager) {
            console.error('EntityManager plugin not found');
        }

        this.effects = new EffectsManager(this);
        this.stats = {kills: 0, miniBosses: 0, bosses: 0};
        this.startTime = this.time.now;
        this.progressionManager.init(permanentBonuses);

        this.player = this.entityManager.initAndSpawnPlayer(permanentBonuses.startHealth);
        this.player.on(Player.HIT_EVENT, () => this.effects.flashPlayerHit());
        this.player.getComponent(Health)?.once(Health.DEATH_EVENT, () => this.onPlayerDeath(), this);

        this.boss = null;
        this.bossType = null;
        this.cameras.main.setBounds(0, 0, worldWidth, worldHeight);
        this.cameras.main.startFollow(this.player, true, this.worldData.camera.lerp, this.worldData.camera.lerp);
        this.applyBonuses();

        this.entityManager.initEnemies(this.progressionManager);
        this.entityManager.initGroupCollisions();

        // The UI minimap only needs a few refreshes per second
        this.time.addEvent({
            delay: this.worldData.minimap.refreshDelay,
            callback: this.sendMinimapSnapshot,
            callbackScope: this,
            loop: true
        });

        this.listenToEvents();
        this.listenToPauseInputs();

        this.registry.set(RegistryConstants.Keys.PLAYER_SCORE, 0);

        console.log("MainGameScene created");
    }

    private listenToEvents() {
        // Killing enemies gives XP, enough XP gives a level and a bonus to choose, some levels bring a boss
        this.events.on(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        this.events.on(GameConstants.Events.DAMAGE_DEALT_EVENT, this.onDamageDealt, this);
        this.events.on(GameConstants.Events.EXPLOSION_EVENT, this.onExplosion, this);
        this.game.events.on(GameConstants.Events.BONUS_CHOSEN_EVENT, this.onBonusChosen, this);
        this.game.events.on(GameConstants.Events.BOSS_DEFEATED_EVENT, this.onBossDefeated, this);
        this.game.events.on(GameConstants.Events.PAUSE_REQUESTED_EVENT, this.openPauseMenu, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.setDefaultCursor('default');
            this.events.off(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
            this.events.off(GameConstants.Events.DAMAGE_DEALT_EVENT, this.onDamageDealt, this);
            this.events.off(GameConstants.Events.EXPLOSION_EVENT, this.onExplosion, this);
            this.game.events.off(GameConstants.Events.BONUS_CHOSEN_EVENT, this.onBonusChosen, this);
            this.game.events.off(GameConstants.Events.BOSS_DEFEATED_EVENT, this.onBossDefeated, this);
            this.game.events.off(GameConstants.Events.PAUSE_REQUESTED_EVENT, this.openPauseMenu, this);
        });
    }

    // ESC, the gamepad OPTIONS button, or the touch pause button (through PAUSE_REQUESTED_EVENT)
    private listenToPauseInputs() {
        this.input.keyboard?.on('keydown-ESC', (event: KeyboardEvent) => {
            if (!event.repeat)
                this.openPauseMenu();
        });
        this.input.gamepad?.on('down', (_pad: Input.Gamepad.Gamepad, button: Input.Gamepad.Button) => {
            if (button.index === GameConstants.GamepadButtons.OPTIONS)
                this.openPauseMenu();
        });

        if (this.input.keyboard) {
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.scene.restart());
        }
    }

    private openPauseMenu() {
        // Already paused by the level up screen, or the game is over
        if (this.scene.isPaused() || !this.player.active)
            return;

        this.scene.pause();
        this.scene.launch(GameConstants.SceneKeys.PAUSE);
    }

    private onPlayerDeath() {
        // Ramming an enemy kills it and hurts the player at once: the kill may have just opened the level up screen.
        // A dead player chooses nothing, close it
        this.scene.stop(GameConstants.SceneKeys.LEVEL_UP);
        this.scene.resume();

        // Hide the player and let its explosion play before showing the game over screen
        this.effects.explode(this.player.x, this.player.y, MainGameScene.PLAYER_EXPLOSION_SIZE);
        this.player.disableBody(true, true);
        this.time.delayedCall(MainGameScene.GAME_OVER_DELAY, this.endGame, [], this);
    }

    // Tells the UI where everything is. The game logic doesn't know how the UI draws it
    private sendMinimapSnapshot() {
        const view: Phaser.Geom.Rectangle = this.cameras.main.worldView;
        const snapshot: MinimapSnapshot = {
            worldWidth: this.worldData.width,
            worldHeight: this.worldData.height,
            player: {x: this.player.x, y: this.player.y, rotation: this.player.rotation},
            view: {x: view.x, y: view.y, width: view.width, height: view.height},
            enemies: this.entityManager.getActiveEnemyPositions(),
            boss: this.boss ? {x: this.boss.x, y: this.boss.y, color: this.boss.bossData.tint} : null,
            landmarks: [this.planetPosition]
        };

        this.game.events.emit(GameConstants.Events.MINIMAP_UPDATE_EVENT, snapshot);
    }

    private onEnemyKilled(xp: number, enemy: Entity) {
        this.stats.kills++;
        this.effects.explode(enemy.x, enemy.y, enemy.displayWidth);

        if (this.progressionManager.addXp(xp) && !this.showNextLevelUp())
            this.trySpawnBoss();
    }

    private onDamageDealt(x: number, y: number, amount: number) {
        this.effects.showDamage(x, y, amount);
    }

    private onExplosion(x: number, y: number, size: number) {
        this.effects.explode(x, y, size);
    }

    // Pauses the game and shows the bonuses to choose from, for the next level up waiting for its bonus.
    // Level ups with nothing left to offer (every bonus maxed) are skipped. Returns true if the screen is shown
    private showNextLevelUp(): boolean {
        if (!this.player.active)
            return false;

        while (this.progressionManager.hasPendingLevelUp) {
            const choices: BonusChoice[] = this.progressionManager.consumeLevelUp();
            if (choices.length > 0) {
                this.scene.pause();
                this.scene.launch(GameConstants.SceneKeys.LEVEL_UP, {choices} as LevelUpSceneData);
                return true;
            }
        }

        return false;
    }

    // Once every level up bonus is chosen, a boss shows up if a boss level was reached. One boss at a time
    private trySpawnBoss() {
        if (this.boss || !this.player.active)
            return;

        const pendingBoss = this.progressionManager.consumePendingBoss();
        if (!pendingBoss)
            return;

        this.boss = this.entityManager.spawnBoss(pendingBoss.type, pendingBoss.appearance);
        this.bossType = pendingBoss.type;
        this.entityManager.setRegularSpawnsPaused(true);
        this.updateCameraZoom(true);
    }

    private onBossDefeated(boss: Boss) {
        if (boss !== this.boss)
            return;

        if (this.bossType === 'boss')
            this.stats.bosses++;
        else
            this.stats.miniBosses++;

        this.boss = null;
        this.bossType = null;
        this.entityManager.setRegularSpawnsPaused(false);
        this.updateCameraZoom(true);
        this.cameras.main.shake(MainGameScene.BOSS_DEFEATED_SHAKE_DURATION, MainGameScene.BOSS_DEFEATED_SHAKE_INTENSITY);

        // The boss XP may have unlocked another boss level
        this.trySpawnBoss();
    }

    private onBonusChosen(choice: BonusChoice) {
        const levelsGained: number = choice.rarity.levels;
        if (choice.id === 'health') {
            this.player.repair(levelsGained, this.progressionManager.maxHealthCap);
        } else {
            this.progressionManager.applyUpgrade(choice);
            this.applyBonuses();
        }

        this.scene.resume();
        // Several levels may have been gained at once
        if (!this.showNextLevelUp())
            this.trySpawnBoss();
    }

    private applyBonuses() {
        this.player.setBonuses(this.progressionManager.getBonuses());
        this.updateCameraZoom(false);
    }

    // Default zoom, minus the wide view bonus, zoomed out even more during a boss fight to see the whole boss
    private updateCameraZoom(isAnimated: boolean) {
        const bonuses: PlayerBonuses = this.progressionManager.getBonuses();
        const bossZoomMultiplier: number = this.boss ? this.boss.bossData.zoomMultiplier : 1;
        const zoom: number = (this.worldData.camera.zoom - bonuses.zoom) * bossZoomMultiplier;

        // Zooming out shows more of the world: grow the background so it still covers the whole screen.
        // Never shrink it, it may still be needed while the zoom animation runs
        const camera = this.cameras.main;
        this.bg.setSize(Math.max(this.bg.width, (camera.width + MainGameScene.BG_MARGIN) / zoom),
            Math.max(this.bg.height, (camera.height + MainGameScene.BG_MARGIN) / zoom));

        if (isAnimated)
            camera.zoomTo(zoom, MainGameScene.ZOOM_TRANSITION_DURATION, 'Sine.easeInOut', true);
        else
            camera.setZoom(zoom);
    }

    private endGame() {
        const stats: RunStats = {
            ...this.stats,
            score: Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0),
            level: this.progressionManager.level,
            // The scene clock stops during pauses and level ups
            duration: this.time.now - this.startTime
        };

        this.scene.start(GameConstants.SceneKeys.GAME_OVER, stats);
    }

    update() {
        const camera = this.cameras.main;
        const parallax: number = this.worldData.background.parallax;
        this.bg.tilePositionX = camera.scrollX * parallax / MainGameScene.BG_TILE_SCALE;
        this.bg.tilePositionY = camera.scrollY * parallax / MainGameScene.BG_TILE_SCALE;
    }
}
