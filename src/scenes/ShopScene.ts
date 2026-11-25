import {GameObjects, Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import SaveManager from "../managers/SaveManager.ts";
import MetaProgression from "../managers/MetaProgression.ts";
import MenuList, {MenuItem} from "../ui/MenuList.ts";
import MenuScreen from "../ui/MenuScreen.ts";
import type {PermanentUpgradeId, ShopData} from "../gameData/ShopData.ts";

// Permanent upgrades bought with the credits earned in previous games
export default class ShopScene extends Scene {
    private static readonly ITEM_WIDTH: number = 1000;
    private static readonly ITEM_HEIGHT: number = 120;
    private static readonly ITEM_GAP: number = 18;
    private static readonly ITEM_FONT_SIZE: number = 30;

    private saveManager: SaveManager;
    private _meta: MetaProgression;
    private _creditsText: GameObjects.Text;
    private _menu: MenuList;

    constructor() {
        super(GameConstants.SceneKeys.SHOP);
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        this._meta = new MetaProgression(this.saveManager, this.cache.json.get(GameConstants.DataKeys.SHOP) as ShopData);

        const height: number = this.scale.height;
        MenuScreen.addBackground(this);
        MenuScreen.addTitle(this, 'UPGRADES', height * 0.09);
        MenuScreen.addText(this, 'Permanent bonuses for every next game', height * 0.15, 32);
        this._creditsText = MenuScreen.addText(this, '', height * 0.2, 44, MenuScreen.TITLE_COLOR);

        const upgradeIds = Object.keys(this._meta.data.upgrades) as PermanentUpgradeId[];
        const items: MenuItem[] = upgradeIds.map(id => ({
            label: () => this.getUpgradeLabel(id),
            isEnabled: () => this.canBuy(id),
            onSelect: () => this.buy(id)
        }));
        items.push({label: 'BACK', onSelect: () => this.goBack()});

        this._menu = new MenuList(this, this.scale.width / 2, height * 0.3, items, {
            width: ShopScene.ITEM_WIDTH,
            itemHeight: ShopScene.ITEM_HEIGHT,
            gap: ShopScene.ITEM_GAP,
            fontSize: ShopScene.ITEM_FONT_SIZE,
            onBack: () => this.goBack()
        });
        this.updateCredits();
    }

    private getUpgradeLabel(id: PermanentUpgradeId): string {
        const upgrade = this._meta.data.upgrades[id];
        const level: number = this._meta.getLevel(id);
        const cost: number | null = this._meta.getNextCost(id);
        const price: string = cost === null ? 'MAX' : `${cost} CR`;

        return `${upgrade.name}  Lv ${level}/${this._meta.getMaxLevel(id)}  -  ${price}\n${upgrade.description}`;
    }

    private canBuy(id: PermanentUpgradeId): boolean {
        const cost: number | null = this._meta.getNextCost(id);
        return cost !== null && cost <= this._meta.credits;
    }

    private buy(id: PermanentUpgradeId) {
        if (this._meta.buy(id)) {
            this.updateCredits();
            this._menu.refresh();
        }
    }

    private updateCredits() {
        this._creditsText.setText(`${this._meta.credits} credits`);
    }

    private goBack() {
        this.scene.start(GameConstants.SceneKeys.HOME);
    }
}
