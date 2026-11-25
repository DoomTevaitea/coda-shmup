import {GameObjects, Scenes, Scene} from "phaser";
import Health from "../components/Health.ts";
import Player from "../entities/Player.ts";
import Boss from "../entities/Boss.ts";
import Booster from "../components/Booster.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import Minimap from "../ui/Minimap.ts";
import TouchControls from "../input/TouchControls.ts";
import type {MinimapSnapshot} from "../gameData/MinimapData.ts";
import type {WorldData} from "../gameData/WorldData.ts";

export default class MainUIScene extends Scene {
    private static readonly XP_BAR_HEIGHT: number = 16;
    private static readonly XP_BAR_BACKGROUND_COLOR: number = 0x222222;
    private static readonly XP_BAR_COLOR: number = 0x7ae582;
    private static readonly LEVEL_TEXT_Y: number = 208;
    private static readonly LEVEL_TEXT_SIZE: number = 64;
    // Health bar: one red block per life, side by side, separated by thin dark lines
    private static readonly HEALTH_BAR_X: number = 64;
    private static readonly HEALTH_BAR_Y: number = 80;
    private static readonly HEALTH_BLOCK_WIDTH: number = 88;
    private static readonly HEALTH_BLOCK_HEIGHT: number = 44;
    private static readonly HEALTH_COLOR: number = 0xe53935;
    private static readonly HEALTH_LOST_COLOR: number = 0x3a1414;
    private static readonly HEALTH_SEPARATOR_COLOR: number = 0x000000;
    private static readonly HEALTH_SEPARATOR_WIDTH: number = 6;
    private static readonly HEALTH_BORDER_COLOR: number = 0xffffff;
    private static readonly HEALTH_BORDER_WIDTH: number = 4;
    // Nitro bar, under the health bar once the nitro is unlocked
    private static readonly NITRO_BAR_GAP: number = 14;
    private static readonly NITRO_BAR_WIDTH: number = 264;
    private static readonly NITRO_BAR_HEIGHT: number = 18;
    private static readonly NITRO_COLOR: number = 0x4dd0e1;
    // Shown while the bar refills after running dry: the nitro can't be used yet
    private static readonly NITRO_EMPTY_COLOR: number = 0x5c6b7a;
    private static readonly NITRO_BACKGROUND_COLOR: number = 0x10262b;
    private static readonly NITRO_LABEL_GAP: number = 16;
    // Boss health bar, along the bottom of the screen during a boss fight
    private static readonly BOSS_BAR_WIDTH: number = 800;
    private static readonly BOSS_BAR_HEIGHT: number = 32;
    private static readonly BOSS_BAR_BOTTOM_MARGIN: number = 72;
    private static readonly BOSS_BAR_BACKGROUND_COLOR: number = 0x2a0f14;
    private static readonly BOSS_BAR_BORDER_COLOR: number = 0xffffff;
    private static readonly BOSS_BAR_BORDER_WIDTH: number = 4;
    private static readonly BOSS_NAME_GAP: number = 12;
    private static readonly WARNING_BLINK_DURATION: number = 250;
    private static readonly WARNING_BLINKS: number = 4;

    private _playerHealth: Health | undefined;
    private _booster: Booster | undefined;
    private _nitroBar: GameObjects.Graphics;
    private _nitroLabel: GameObjects.Text;
    private _boss: Boss | null = null;
    private _bossBar: GameObjects.Graphics;
    private _bossNameText: GameObjects.Text;
    private _healthBar: GameObjects.Graphics;
    private _scoreText: GameObjects.BitmapText;
    // Regular text: the bitmap font only has digits and "x"
    private _levelText: GameObjects.Text;
    private _xpBar: GameObjects.Graphics;
    private _minimap: Minimap | undefined;

    constructor() {
        super(GameConstants.SceneKeys.MAIN_UI);
    }

    // noinspection JSUnusedGlobalSymbols
    init() {
        this.game.events.on(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
        this.registry.events.on(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);
        this.registry.events.on(RegistryConstants.Events.PLAYER_LEVEL_CHANGE, this.updateLevel, this);
        this.registry.events.on(RegistryConstants.Events.PLAYER_XP_CHANGE, this.updateLevel, this);
        this.game.events.on(GameConstants.Events.BOSS_SPAWNED_EVENT, this.onBossSpawned, this);
        this.game.events.on(GameConstants.Events.BOSS_DEFEATED_EVENT, this.hideBossBar, this);
        this.game.events.on(GameConstants.Events.MINIMAP_UPDATE_EVENT, this.onMinimapUpdate, this);

        this.events.once(Scenes.Events.SHUTDOWN, () => {
            this.game.events.off(GameConstants.Events.MINIMAP_UPDATE_EVENT, this.onMinimapUpdate, this);
            this.game.events.off(GameConstants.Events.BOSS_SPAWNED_EVENT, this.onBossSpawned, this);
            this.game.events.off(GameConstants.Events.BOSS_DEFEATED_EVENT, this.hideBossBar, this);
            this._boss?.getComponent(Health)?.off(Health.CHANGE_EVENT, this.updateBossBar, this);
            this._boss = null;
            this.game.events.off(GameConstants.Events.PLAYER_SPAWNED_EVENT, this.onPlayerSpawned, this);
            this.registry.events.off(RegistryConstants.Events.PLAYER_SCORE_CHANGE, this.onPlayerScoreChanged, this);
            this.registry.events.off(RegistryConstants.Events.PLAYER_LEVEL_CHANGE, this.updateLevel, this);
            this.registry.events.off(RegistryConstants.Events.PLAYER_XP_CHANGE, this.updateLevel, this);
        }, this);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        this._healthBar = this.add.graphics();
        this.updateHealthBar();

        const nitroBarY: number = MainUIScene.HEALTH_BAR_Y + MainUIScene.HEALTH_BLOCK_HEIGHT + MainUIScene.NITRO_BAR_GAP;
        this._nitroBar = this.add.graphics();
        this._nitroLabel = this.add.text(MainUIScene.HEALTH_BAR_X + MainUIScene.NITRO_BAR_WIDTH + MainUIScene.NITRO_LABEL_GAP,
            nitroBarY + MainUIScene.NITRO_BAR_HEIGHT / 2, "NITRO",
            {fontSize: '24px', color: '#4dd0e1', fontFamily: 'future'})
            .setOrigin(0, 0.5).setVisible(false);
        this.updateNitroBar();

        const worldData = this.cache.json.get(GameConstants.DataKeys.WORLD) as WorldData;
        this._minimap = new Minimap(this, worldData.minimap);

        // On phones and tablets: virtual joysticks, nitro and pause buttons
        if (TouchControls.isSupported(this))
            new TouchControls(this);

        this._bossBar = this.add.graphics();
        this._bossNameText = this.add.text(this.scale.width / 2, 0, "",
            {fontSize: '44px', color: '#fff', fontFamily: 'future', stroke: '#000', strokeThickness: 6})
            .setOrigin(0.5, 1).setVisible(false);

        let scoreStr: string = "".padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        if (this.registry.has(RegistryConstants.Keys.PLAYER_SCORE))
            scoreStr = this.registry.get(RegistryConstants.Keys.PLAYER_SCORE).toString()
                .padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText = this.add.bitmapText(this.scale.width - 64, 64, "future-bmp", scoreStr, 128)
            .setOrigin(1, 0);

        // XP bar along the top edge of the screen, level written below the health and score
        this._xpBar = this.add.graphics();
        this._levelText = this.add.text(this.scale.width / 2, MainUIScene.LEVEL_TEXT_Y, "",
            {fontSize: MainUIScene.LEVEL_TEXT_SIZE + 'px', color: '#fff', fontFamily: 'future'}).setOrigin(0.5, 0);
        this.updateLevel();

        this.scene.bringToTop();

        console.log("MainUIScene created");
    }

    private onPlayerScoreChanged(_: any, value: number) {
        const scoreStr: string = value.toString().padStart(GameConstants.MAX_SCORE_DIGITS, "0");
        this._scoreText.setText(scoreStr);
    }

    private updateLevel() {
        // Registry events may arrive before create(), when the game scene starts first
        if (!this._levelText)
            return;

        const level: number = this.registry.get(RegistryConstants.Keys.PLAYER_LEVEL) ?? 1;
        const xp: number = this.registry.get(RegistryConstants.Keys.PLAYER_XP) ?? 0;
        const xpToNextLevel: number = this.registry.get(RegistryConstants.Keys.PLAYER_XP_TO_NEXT_LEVEL) ?? 1;

        this._levelText.setText("LVL " + level);

        const fillRatio: number = Phaser.Math.Clamp(xp / xpToNextLevel, 0, 1);
        this._xpBar.clear()
            .fillStyle(MainUIScene.XP_BAR_BACKGROUND_COLOR)
            .fillRect(0, 0, this.scale.width, MainUIScene.XP_BAR_HEIGHT)
            .fillStyle(MainUIScene.XP_BAR_COLOR)
            .fillRect(0, 0, this.scale.width * fillRatio, MainUIScene.XP_BAR_HEIGHT);
    }

    private onMinimapUpdate(snapshot: MinimapSnapshot) {
        this._minimap?.draw(snapshot);
    }

    private onBossSpawned(boss: Boss) {
        this._boss = boss;
        boss.getComponent(Health)?.on(Health.CHANGE_EVENT, this.updateBossBar, this);

        const title: string = boss.bossData.name.toUpperCase();
        this._bossNameText.setText(title).setVisible(true);
        this.updateBossBar();

        // Big blinking warning in the middle of the screen, in the boss color: purple for the mini boss, red for the boss
        const warning: GameObjects.Text = this.add.text(this.scale.width / 2, this.scale.height / 2,
            `WARNING\n${title}`,
            {fontSize: '120px', color: boss.bossData.tint, fontFamily: 'future', align: 'center',
                stroke: '#000', strokeThickness: 10})
            .setOrigin(0.5);
        this.tweens.add({
            targets: warning, alpha: 0, duration: MainUIScene.WARNING_BLINK_DURATION, yoyo: true,
            repeat: MainUIScene.WARNING_BLINKS - 1,
            onComplete: () => warning.destroy()
        });
    }

    private hideBossBar() {
        this._boss?.getComponent(Health)?.off(Health.CHANGE_EVENT, this.updateBossBar, this);
        this._boss = null;
        this._bossBar.clear();
        this._bossNameText.setVisible(false);
    }

    private updateBossBar() {
        const health = this._boss?.getComponent(Health);
        if (!health)
            return;

        const width: number = MainUIScene.BOSS_BAR_WIDTH;
        const height: number = MainUIScene.BOSS_BAR_HEIGHT;
        const x: number = (this.scale.width - width) / 2;
        const y: number = this.scale.height - MainUIScene.BOSS_BAR_BOTTOM_MARGIN - height;
        const bossColor: number = Phaser.Display.Color.HexStringToColor(this._boss!.bossData.tint).color;

        this._bossNameText.setY(y - MainUIScene.BOSS_NAME_GAP);
        this._bossBar.clear()
            .fillStyle(MainUIScene.BOSS_BAR_BACKGROUND_COLOR)
            .fillRect(x, y, width, height)
            .fillStyle(bossColor)
            .fillRect(x, y, width * health.current / health.max, height)
            .lineStyle(MainUIScene.BOSS_BAR_BORDER_WIDTH, MainUIScene.BOSS_BAR_BORDER_COLOR)
            .strokeRect(x, y, width, height);
    }

    private onPlayerSpawned(player: Player) {
        this._playerHealth = player.getComponent(Health);
        this.updateHealthBar();

        this._playerHealth?.on(Health.CHANGE_EVENT, this.updateHealthBar, this);

        this._booster = player.getComponent(Booster);
        this.updateNitroBar();
        this._booster?.on(Booster.CHANGE_EVENT, this.updateNitroBar, this);
    }

    // Hidden until the nitro bonus is unlocked
    private updateNitroBar() {
        // The player may spawn before create(), when the game scene starts first
        if (!this._nitroBar)
            return;

        this._nitroBar.clear();
        const isVisible: boolean = this._booster?.isUnlocked ?? false;
        this._nitroLabel.setVisible(isVisible);
        if (!isVisible || !this._booster)
            return;

        const x: number = MainUIScene.HEALTH_BAR_X;
        const y: number = MainUIScene.HEALTH_BAR_Y + MainUIScene.HEALTH_BLOCK_HEIGHT + MainUIScene.NITRO_BAR_GAP;
        const width: number = MainUIScene.NITRO_BAR_WIDTH;
        const height: number = MainUIScene.NITRO_BAR_HEIGHT;
        const fillColor: number = this._booster.isEmpty ? MainUIScene.NITRO_EMPTY_COLOR : MainUIScene.NITRO_COLOR;

        this._nitroBar
            .fillStyle(MainUIScene.NITRO_BACKGROUND_COLOR)
            .fillRect(x, y, width, height)
            .fillStyle(fillColor)
            .fillRect(x, y, width * this._booster.energyRatio, height)
            .lineStyle(MainUIScene.HEALTH_BORDER_WIDTH, MainUIScene.HEALTH_BORDER_COLOR)
            .strokeRect(x, y, width, height);
    }

    // Redrawn on every change: the max may grow too, with the life bonus
    private updateHealthBar() {
        // The player may spawn before create(), when the game scene starts first
        if (!this._healthBar || !this._playerHealth)
            return;

        const blockWidth: number = MainUIScene.HEALTH_BLOCK_WIDTH;
        const blockHeight: number = MainUIScene.HEALTH_BLOCK_HEIGHT;
        const x: number = MainUIScene.HEALTH_BAR_X;
        const y: number = MainUIScene.HEALTH_BAR_Y;
        const max: number = this._playerHealth.max;
        const current: number = this._playerHealth.current;

        this._healthBar.clear()
            .fillStyle(MainUIScene.HEALTH_LOST_COLOR)
            .fillRect(x, y, blockWidth * max, blockHeight)
            .fillStyle(MainUIScene.HEALTH_COLOR)
            .fillRect(x, y, blockWidth * current, blockHeight)
            .lineStyle(MainUIScene.HEALTH_SEPARATOR_WIDTH, MainUIScene.HEALTH_SEPARATOR_COLOR);

        for (let i: number = 1; i < max; i++) {
            this._healthBar.lineBetween(x + i * blockWidth, y, x + i * blockWidth, y + blockHeight);
        }

        this._healthBar.lineStyle(MainUIScene.HEALTH_BORDER_WIDTH, MainUIScene.HEALTH_BORDER_COLOR)
            .strokeRect(x, y, blockWidth * max, blockHeight);
    }
}