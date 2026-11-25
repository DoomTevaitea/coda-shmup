import {Scene, GameObjects} from 'phaser';
import Health from "../components/Health.ts";
import RegistryConstants from "../RegistryConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import SaveConstants from "../SaveConstants.ts";
import EntityManager from "../managers/EntityManager.ts";
import ProgressionManager from "../managers/ProgressionManager.ts";
import GameConstants from "../GameConstants.ts";
import Player from "../entities/Player.ts";
import Boss from "../entities/Boss.ts";
import type {WorldData} from "../gameData/WorldData.ts";
import type {BonusChoice, PlayerBonuses} from "../gameData/ProgressionData.ts";
import type {LevelUpSceneData} from "./LevelUpScene.ts";
import type {MinimapPoint, MinimapSnapshot} from "../gameData/MinimapData.ts";

export default class MainGameScene extends Scene {
    private static readonly BG_TILE_SCALE: number = 2;
    // Extra size of the background around the screen, so the camera shake never shows its edges
    private static readonly BG_MARGIN: number = 512;
    private static readonly ZOOM_TRANSITION_DURATION: number = 1200;
    private static readonly BOSS_DEFEATED_SHAKE_DURATION: number = 600;
    private static readonly BOSS_DEFEATED_SHAKE_INTENSITY: number = 0.03;

    private bg: GameObjects.TileSprite;
    private worldData: WorldData;
    private player: Player;
    // The boss currently fought, null between boss fights
    private boss: Boss | null = null;
    private planetPosition: MinimapPoint;
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

        this.progressionManager.init();

        this.player = this.entityManager.initAndSpawnPlayer();
        this.player.getComponent(Health)?.once(Health.DEATH_EVENT, () => {
            // Ramming an enemy kills it and hurts the player at once: the kill may have just opened the level up screen.
            // A dead player chooses nothing, close it
            this.scene.stop(GameConstants.SceneKeys.LEVEL_UP);
            this.scene.resume();

            // Hide the player and let its explosion play before showing the game over screen
            this.player.disableBody(true, true);
            this.time.delayedCall(1000, this.endGame, [], this);
        }, this);

        this.boss = null;
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

        // Killing enemies gives XP, enough XP gives a level and a bonus to choose, some levels bring a boss
        this.events.on(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
        this.game.events.on(GameConstants.Events.BONUS_CHOSEN_EVENT, this.onBonusChosen, this);
        this.game.events.on(GameConstants.Events.BOSS_DEFEATED_EVENT, this.onBossDefeated, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.setDefaultCursor('default');
            this.events.off(GameConstants.Events.ENEMY_KILLED_EVENT, this.onEnemyKilled, this);
            this.game.events.off(GameConstants.Events.BONUS_CHOSEN_EVENT, this.onBonusChosen, this);
            this.game.events.off(GameConstants.Events.BOSS_DEFEATED_EVENT, this.onBossDefeated, this);
        });

        if (this.input.keyboard) {
            this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R).on('down', () => this.scene.restart());
        } else {
            console.error('No keyboard input');
        }

        this.registry.set(RegistryConstants.Keys.PLAYER_SCORE, 0);

        console.log("MainGameScene created");
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

    private onEnemyKilled(xp: number) {
        if (this.progressionManager.addXp(xp) && !this.showNextLevelUp())
            this.trySpawnBoss();
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
        this.entityManager.setRegularSpawnsPaused(true);
        this.updateCameraZoom(true);
    }

    private onBossDefeated(boss: Boss) {
        if (boss !== this.boss)
            return;

        this.boss = null;
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
        const bestScore: number = Number(this.saveManager.getData(SaveConstants.Keys.PLAYER_BEST_SCORE) ?? 0);
        const currentScore: number = Number(this.registry.get(RegistryConstants.Keys.PLAYER_SCORE) ?? 0);
        if (currentScore > bestScore) {
            this.saveManager.setData(SaveConstants.Keys.PLAYER_BEST_SCORE, currentScore);
            console.log("New Best Score: " + currentScore);
        }

        this.scene.start(GameConstants.SceneKeys.GAME_OVER);
    }

    update() {
        const camera = this.cameras.main;
        const parallax: number = this.worldData.background.parallax;
        this.bg.tilePositionX = camera.scrollX * parallax / MainGameScene.BG_TILE_SCALE;
        this.bg.tilePositionY = camera.scrollY * parallax / MainGameScene.BG_TILE_SCALE;
    }
}
