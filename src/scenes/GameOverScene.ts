import {Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import MetaProgression from "../managers/MetaProgression.ts";
import MenuList from "../ui/MenuList.ts";
import MenuScreen from "../ui/MenuScreen.ts";
import type {RunStats, ShopData} from "../gameData/ShopData.ts";

// End of a game: what happened, the credits earned for the shop, and a place in the leaderboard
export default class GameOverScene extends Scene {
    private static readonly DEFAULT_PILOT_NAME: string = 'PILOT';
    private static readonly MAX_NAME_LENGTH: number = 12;
    // Lets the screen show up before the browser name prompt freezes it
    private static readonly NAME_PROMPT_DELAY: number = 400;
    private static readonly NEW_RECORD_COLOR: string = '#7ae582';
    private static readonly MS_PER_SECOND: number = 1000;
    private static readonly SECONDS_PER_MINUTE: number = 60;

    private saveManager: SaveManager;
    private _stats: RunStats;

    constructor() {
        super(GameConstants.SceneKeys.GAME_OVER);
    }

    // noinspection JSUnusedGlobalSymbols
    init(stats: RunStats) {
        this._stats = stats;
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        this.scene.stop(GameConstants.SceneKeys.MAIN_UI);

        const meta = new MetaProgression(this.saveManager, this.cache.json.get(GameConstants.DataKeys.SHOP) as ShopData);
        const stats: RunStats = this._stats;
        const creditsEarned: number = meta.computeCredits(stats);
        const isBestScore: boolean = meta.endRun(stats, creditsEarned);

        const width: number = this.scale.width;
        const height: number = this.scale.height;
        MenuScreen.addBackground(this);
        MenuScreen.addTitle(this, 'GAME OVER', height * 0.12, 110);

        MenuScreen.addText(this, `SCORE  ${stats.score}`, height * 0.23, 60, '#fff');
        if (isBestScore)
            MenuScreen.addText(this, 'NEW BEST SCORE!', height * 0.28, 40, GameOverScene.NEW_RECORD_COLOR);

        MenuScreen.addText(this, [
            `Level reached      ${stats.level}`,
            `Enemies destroyed  ${stats.kills}`,
            `Mini bosses        ${stats.miniBosses}`,
            `Bosses             ${stats.bosses}`,
            `Time survived      ${this.formatDuration(stats.duration)}`,
        ].join('\n'), height * 0.4, 36);

        MenuScreen.addText(this, `+${creditsEarned} credits   (total ${meta.credits})`, height * 0.52, 40, '#ffe066');

        new MenuList(this, width / 2, height * 0.63, [
            {label: 'PLAY AGAIN', onSelect: () => this.playAgain()},
            {label: 'MAIN MENU', onSelect: () => this.scene.start(GameConstants.SceneKeys.HOME)},
        ], {onBack: () => this.scene.start(GameConstants.SceneKeys.HOME)});

        if (meta.isLeaderboardScore(stats.score)) {
            const rankText = MenuScreen.addText(this, 'New leaderboard score!', height * 0.84, 34, GameOverScene.NEW_RECORD_COLOR);
            this.time.delayedCall(GameOverScene.NAME_PROMPT_DELAY, () => {
                const name: string = this.askPilotName();
                meta.addToLeaderboard({name, score: stats.score, level: stats.level});
                const rank: number = meta.getLeaderboard().findIndex(entry => entry.score === stats.score && entry.name === name) + 1;
                rankText.setText(`${name} enters the leaderboard at #${rank}!`);
            });
        }
    }

    // The course tip: the browser prompt is the simplest text input
    private askPilotName(): string {
        const answer: string | null = window.prompt('New leaderboard score! Your pilot name:', GameOverScene.DEFAULT_PILOT_NAME);
        const name: string = (answer ?? '').trim().toUpperCase().slice(0, GameOverScene.MAX_NAME_LENGTH);
        return name || GameOverScene.DEFAULT_PILOT_NAME;
    }

    private formatDuration(duration: number): string {
        const totalSeconds: number = Math.floor(duration / GameOverScene.MS_PER_SECOND);
        const minutes: number = Math.floor(totalSeconds / GameOverScene.SECONDS_PER_MINUTE);
        const seconds: number = totalSeconds % GameOverScene.SECONDS_PER_MINUTE;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    private playAgain() {
        this.scene.launch(GameConstants.SceneKeys.MAIN_UI);
        this.scene.start(GameConstants.SceneKeys.MAIN_GAME);
    }
}
