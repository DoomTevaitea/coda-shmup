import {Loader} from "phaser";
import GameConstants from "../GameConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import MetaProgression from "../managers/MetaProgression.ts";
import MenuList from "../ui/MenuList.ts";
import MenuScreen from "../ui/MenuScreen.ts";
import type {ShopData} from "../gameData/ShopData.ts";

// Main menu: play, permanent upgrades, leaderboard and controls
export default class HomeScene extends Phaser.Scene {
    private saveManager: SaveManager;

    constructor() {
        super(GameConstants.SceneKeys.HOME);
    }

    preload() {
        const width: number = this.scale.width;
        const y: number = this.scale.height / 2;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(0, y, width, 64);
        this.load.on(Loader.Events.PROGRESS, function (value: number) { // 0-1
            console.log("Loading : " + value);

            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(0, y, width * value, 64);
        });
        this.load.on(Loader.Events.COMPLETE, function () {
            console.log("Loading complete");

            progressBar.destroy();
            progressBox.destroy();
        });

        this.load.setPath('assets');

        this.load.image('bg', 'Backgrounds/darkPurple.png');
        this.load.image('planet', 'Planets/planet00.png');
        this.load.atlas('sprites', 'Spritesheet/gameSprites.png', 'Spritesheet/gameSprites.json');
        this.load.bitmapFont('future-bmp', 'Fonts/kenvector_future.png', 'Fonts/kenvector_future.xml');
        this.load.font('future', 'Fonts/kenvector_future.ttf');
        this.load.json(GameConstants.DataKeys.WORLD, 'Data/world.json');
        this.load.json(GameConstants.DataKeys.PLAYER, 'Data/player.json');
        this.load.json(GameConstants.DataKeys.PLAYER_SHIPS, 'Data/playerShips.json');
        this.load.json(GameConstants.DataKeys.ENEMY, 'Data/enemy.json');
        this.load.json(GameConstants.DataKeys.MINI_BOSS, 'Data/miniBoss.json');
        this.load.json(GameConstants.DataKeys.BOSS, 'Data/boss.json');
        for (const key of GameConstants.CONFIGURABLE_ENEMY_KEYS) {
            this.load.json(key, `Data/${key}.json`);
        }
        this.load.json(GameConstants.DataKeys.PROGRESSION, 'Data/progression.json');
        this.load.json(GameConstants.DataKeys.WEAPONS, 'Data/weapons.json');
        this.load.json(GameConstants.DataKeys.SHOP, 'Data/shop.json');
        this.load.audio('sfx_laser1', 'Sounds/sfx_laser1.ogg');
        this.load.audio('sfx_laser2', 'Sounds/sfx_laser2.ogg');
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        this.saveManager.load();
        const meta = new MetaProgression(this.saveManager, this.cache.json.get(GameConstants.DataKeys.SHOP) as ShopData);
        const height: number = this.scale.height;

        MenuScreen.addBackground(this);
        MenuScreen.addTitle(this, 'NITRO SURVIVOR', height * 0.2, 120);
        MenuScreen.addText(this, 'Survive. Level up. Beat the bosses.', height * 0.28, 36);
        MenuScreen.addText(this, `Best score  ${meta.bestScore}      Credits  ${meta.credits}`, height * 0.34, 36, MenuScreen.TITLE_COLOR);

        new MenuList(this, this.scale.width / 2, height * 0.46, [
            {label: 'PLAY', onSelect: () => this.startGame()},
            {label: 'UPGRADES', onSelect: () => this.scene.start(GameConstants.SceneKeys.SHOP)},
            {label: 'LEADERBOARD', onSelect: () => this.scene.start(GameConstants.SceneKeys.LEADERBOARD)},
            {label: 'CONTROLS', onSelect: () => this.scene.start(GameConstants.SceneKeys.CONTROLS)},
        ]);

        MenuScreen.addText(this, 'Mouse, keyboard, PS5 controller or touch', height * 0.92, 28, '#999');
    }

    private startGame() {
        this.scene.launch(GameConstants.SceneKeys.MAIN_UI);
        this.scene.start(GameConstants.SceneKeys.MAIN_GAME);
    }
}
