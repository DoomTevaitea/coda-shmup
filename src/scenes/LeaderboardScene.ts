import {Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import MetaProgression from "../managers/MetaProgression.ts";
import MenuList from "../ui/MenuList.ts";
import MenuScreen from "../ui/MenuScreen.ts";
import type {LeaderboardEntry, ShopData} from "../gameData/ShopData.ts";

// Best local scores, saved in the browser
export default class LeaderboardScene extends Scene {
    private static readonly NAME_COLUMN_WIDTH: number = 14;
    private static readonly SCORE_COLUMN_WIDTH: number = 9;

    private saveManager: SaveManager;

    constructor() {
        super(GameConstants.SceneKeys.LEADERBOARD);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        const meta = new MetaProgression(this.saveManager, this.cache.json.get(GameConstants.DataKeys.SHOP) as ShopData);
        const entries: LeaderboardEntry[] = meta.getLeaderboard();
        const height: number = this.scale.height;

        MenuScreen.addBackground(this);
        MenuScreen.addTitle(this, 'LEADERBOARD', height * 0.12);

        const lines: string[] = entries.length === 0
            ? ['No score yet: play a game!']
            : entries.map((entry, index) => `${(index + 1).toString().padStart(2)}. `
                + `${entry.name.padEnd(LeaderboardScene.NAME_COLUMN_WIDTH)}`
                + `${entry.score.toString().padStart(LeaderboardScene.SCORE_COLUMN_WIDTH)}   Lv ${entry.level}`);
        MenuScreen.addText(this, lines.join('\n'), height * 0.45, 38, '#fff');

        new MenuList(this, this.scale.width / 2, height * 0.82, [
            {label: 'BACK', onSelect: () => this.scene.start(GameConstants.SceneKeys.HOME)},
        ], {onBack: () => this.scene.start(GameConstants.SceneKeys.HOME)});
    }
}
