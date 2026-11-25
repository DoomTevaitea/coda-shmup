import {GameObjects, Scene} from "phaser";
import GameConstants from "../GameConstants.ts";
import BonusIcons from "../utils/BonusIcons.ts";
import type {BonusChoice} from "../gameData/ProgressionData.ts";

export type LevelUpSceneData = {
    choices: BonusChoice[];
}

// Shown over the paused game on level up: the player clicks one of the offered bonuses.
// It only reports the choice, applying the bonus is the game logic's job
export default class LevelUpScene extends Scene {
    private static readonly OVERLAY_COLOR: number = 0x05030a;
    private static readonly OVERLAY_ALPHA: number = 0.8;
    private static readonly TITLE_Y: number = 520;
    private static readonly CARDS_CENTER_Y: number = 1100;

    private static readonly CARD_WIDTH: number = 320;
    private static readonly CARD_HEIGHT: number = 640;
    private static readonly CARD_GAP: number = 24;
    private static readonly CARD_RADIUS: number = 28;
    private static readonly CARD_COLOR: number = 0x1d1630;
    private static readonly CARD_BORDER_WIDTH: number = 6;
    private static readonly CARD_PADDING: number = 32;
    private static readonly SHADOW_OFFSET: number = 12;
    private static readonly HEADER_HEIGHT: number = 72;
    private static readonly HEADER_TEXT_COLOR: string = '#14101f';

    private static readonly ICON_CENTER_Y: number = 200;
    private static readonly ICON_BADGE_RADIUS: number = 92;
    private static readonly NAME_Y: number = 316;
    private static readonly LEVEL_Y: number = 380;
    private static readonly PIPS_Y: number = 440;
    private static readonly DESCRIPTION_Y: number = 486;

    // One small block per bonus level: owned, gained with this card, still locked
    private static readonly PIP_MAX_SIZE: number = 28;
    private static readonly PIP_GAP: number = 6;
    private static readonly PIP_OWNED_COLOR: number = 0xe8e8f0;
    private static readonly PIP_LOCKED_COLOR: number = 0x3a3150;
    private static readonly HEALTH_PIP_COLOR: number = 0xe53935;

    private static readonly APPEAR_DURATION: number = 260;
    private static readonly APPEAR_STAGGER: number = 90;
    private static readonly HOVER_SCALE: number = 1.06;
    private static readonly HOVER_DURATION: number = 120;
    private static readonly CHOSEN_SCALE: number = 1.12;
    private static readonly CHOSEN_DURATION: number = 140;
    private static readonly GLOW_ALPHA: number = 0.35;
    private static readonly GLOW_SIZE: number = 18;
    private static readonly LEGENDARY_LEVELS: number = 4;
    private static readonly LEGENDARY_PULSE_DURATION: number = 600;

    private _choices: BonusChoice[];
    private _cards: GameObjects.Container[] = [];

    constructor() {
        super(GameConstants.SceneKeys.LEVEL_UP);
    }

    // noinspection JSUnusedGlobalSymbols
    init(data: LevelUpSceneData) {
        this._choices = data.choices;
        this._cards = [];
    }

    // noinspection JSUnusedGlobalSymbols
    create() {
        const width: number = this.scale.width;
        const height: number = this.scale.height;

        BonusIcons.createTextures(this);

        this.add.rectangle(0, 0, width, height, LevelUpScene.OVERLAY_COLOR, LevelUpScene.OVERLAY_ALPHA).setOrigin(0);
        this.add.text(width / 2, LevelUpScene.TITLE_Y, 'LEVEL UP!',
            {fontSize: '104px', color: '#ffe066', fontFamily: 'future', stroke: '#000', strokeThickness: 8})
            .setOrigin(0.5);
        this.add.text(width / 2, LevelUpScene.TITLE_Y + 100, 'Choose a bonus',
            {fontSize: '40px', color: '#ddd'}).setOrigin(0.5);

        // Center the row of cards horizontally
        const rowWidth: number = this._choices.length * LevelUpScene.CARD_WIDTH
            + (this._choices.length - 1) * LevelUpScene.CARD_GAP;
        const firstCardX: number = (width - rowWidth) / 2 + LevelUpScene.CARD_WIDTH / 2;

        this._choices.forEach((choice, index) => {
            const card = this.createCard(firstCardX + index * (LevelUpScene.CARD_WIDTH + LevelUpScene.CARD_GAP),
                LevelUpScene.CARDS_CENTER_Y, choice);
            this.playAppearAnimation(card, index);
            this._cards.push(card);
        });

        this.scene.bringToTop();
    }

    private createCard(x: number, y: number, choice: BonusChoice): GameObjects.Container {
        const width: number = LevelUpScene.CARD_WIDTH;
        const height: number = LevelUpScene.CARD_HEIGHT;
        const left: number = -width / 2;
        const top: number = -height / 2;
        const textWidth: number = width - LevelUpScene.CARD_PADDING * 2;
        const rarityColor: number = Phaser.Display.Color.HexStringToColor(choice.rarity.color).color;

        // Children are placed relative to the card center
        const card: GameObjects.Container = this.add.container(x, y);

        const glow: GameObjects.Graphics = this.add.graphics()
            .fillStyle(rarityColor, 1)
            .fillRoundedRect(left - LevelUpScene.GLOW_SIZE / 2, top - LevelUpScene.GLOW_SIZE / 2,
                width + LevelUpScene.GLOW_SIZE, height + LevelUpScene.GLOW_SIZE,
                LevelUpScene.CARD_RADIUS + LevelUpScene.GLOW_SIZE / 2)
            .setAlpha(0);

        const body: GameObjects.Graphics = this.add.graphics()
            .fillStyle(0x000000, 0.5)
            .fillRoundedRect(left + LevelUpScene.SHADOW_OFFSET, top + LevelUpScene.SHADOW_OFFSET, width, height,
                LevelUpScene.CARD_RADIUS)
            .fillStyle(LevelUpScene.CARD_COLOR)
            .fillRoundedRect(left, top, width, height, LevelUpScene.CARD_RADIUS)
            // Header band in the rarity color, only its top corners are rounded
            .fillStyle(rarityColor)
            .fillRoundedRect(left, top, width, LevelUpScene.HEADER_HEIGHT,
                {tl: LevelUpScene.CARD_RADIUS, tr: LevelUpScene.CARD_RADIUS, bl: 0, br: 0})
            .lineStyle(LevelUpScene.CARD_BORDER_WIDTH, rarityColor)
            .strokeRoundedRect(left, top, width, height, LevelUpScene.CARD_RADIUS)
            // Icon badge, tinted with the rarity color
            .fillStyle(rarityColor, 0.15)
            .fillCircle(0, top + LevelUpScene.ICON_CENTER_Y, LevelUpScene.ICON_BADGE_RADIUS)
            .lineStyle(4, rarityColor, 0.6)
            .strokeCircle(0, top + LevelUpScene.ICON_CENTER_Y, LevelUpScene.ICON_BADGE_RADIUS);

        const rarityText: GameObjects.Text = this.add.text(0, top + LevelUpScene.HEADER_HEIGHT / 2,
            `${choice.rarity.name.toUpperCase()}  +${choice.rarity.levels}`,
            {fontSize: '34px', color: LevelUpScene.HEADER_TEXT_COLOR, fontStyle: 'bold'})
            .setOrigin(0.5);

        const icon: GameObjects.Image = this.add.image(0, top + LevelUpScene.ICON_CENTER_Y,
            BonusIcons.getTextureKey(choice.id));

        const nameText: GameObjects.Text = this.add.text(0, top + LevelUpScene.NAME_Y, choice.name,
            {fontSize: '38px', color: '#fff', fontFamily: 'future', align: 'center', wordWrap: {width: textWidth}})
            .setOrigin(0.5, 0);

        const levelText: GameObjects.Text = this.add.text(0, top + LevelUpScene.LEVEL_Y, this.getLevelLabel(choice),
            {fontSize: '36px', color: choice.rarity.color, fontStyle: 'bold'})
            .setOrigin(0.5, 0);

        const pips: GameObjects.Graphics = this.createLevelPips(choice, top + LevelUpScene.PIPS_Y, textWidth);

        const descriptionText: GameObjects.Text = this.add.text(0, top + LevelUpScene.DESCRIPTION_Y, choice.description,
            {fontSize: '30px', color: '#c9c3dd', align: 'center', wordWrap: {width: textWidth}})
            .setOrigin(0.5, 0);

        card.add([glow, body, rarityText, icon, nameText, levelText, pips, descriptionText]);

        // The rarest cards pulse to catch the eye
        if (choice.rarity.levels >= LevelUpScene.LEGENDARY_LEVELS) {
            this.tweens.add({
                targets: glow, alpha: {from: 0.1, to: LevelUpScene.GLOW_ALPHA},
                duration: LevelUpScene.LEGENDARY_PULSE_DURATION, yoyo: true, repeat: -1
            });
        }

        card.setSize(width, height).setInteractive({useHandCursor: true});
        card.on(Phaser.Input.Events.POINTER_OVER, () => {
            glow.setAlpha(LevelUpScene.GLOW_ALPHA);
            this.tweens.add({targets: card, scale: LevelUpScene.HOVER_SCALE, duration: LevelUpScene.HOVER_DURATION});
        });
        card.on(Phaser.Input.Events.POINTER_OUT, () => {
            glow.setAlpha(0);
            this.tweens.add({targets: card, scale: 1, duration: LevelUpScene.HOVER_DURATION});
        });
        card.once(Phaser.Input.Events.POINTER_DOWN, () => this.choose(card, choice));

        return card;
    }

    // Owned levels in white, levels gained with this card in the rarity color, locked levels dark.
    // The life bonus shows one red block per life it gives
    private createLevelPips(choice: BonusChoice, y: number, availableWidth: number): GameObjects.Graphics {
        const isHealth: boolean = choice.id === 'health';
        const pipCount: number = isHealth ? choice.nextLevel : choice.maxLevel;
        const pipSize: number = Math.min(LevelUpScene.PIP_MAX_SIZE,
            (availableWidth - (pipCount - 1) * LevelUpScene.PIP_GAP) / pipCount);
        const rowWidth: number = pipCount * pipSize + (pipCount - 1) * LevelUpScene.PIP_GAP;
        const rarityColor: number = Phaser.Display.Color.HexStringToColor(choice.rarity.color).color;

        const pips: GameObjects.Graphics = this.add.graphics();
        for (let i: number = 0; i < pipCount; i++) {
            let color: number = LevelUpScene.PIP_LOCKED_COLOR;
            if (isHealth)
                color = LevelUpScene.HEALTH_PIP_COLOR;
            else if (i < choice.currentLevel)
                color = LevelUpScene.PIP_OWNED_COLOR;
            else if (i < choice.nextLevel)
                color = rarityColor;

            pips.fillStyle(color)
                .fillRoundedRect(-rowWidth / 2 + i * (pipSize + LevelUpScene.PIP_GAP), y, pipSize, pipSize, pipSize / 4);
        }

        return pips;
    }

    private playAppearAnimation(card: GameObjects.Container, index: number) {
        card.setScale(0.6).setAlpha(0);
        this.tweens.add({
            targets: card, scale: 1, alpha: 1, ease: 'Back.easeOut',
            duration: LevelUpScene.APPEAR_DURATION, delay: index * LevelUpScene.APPEAR_STAGGER
        });
    }

    private choose(chosenCard: GameObjects.Container, choice: BonusChoice) {
        // Only one card can be picked
        this._cards.forEach(card => card.disableInteractive());

        this.tweens.add({
            targets: chosenCard, scale: LevelUpScene.CHOSEN_SCALE, duration: LevelUpScene.CHOSEN_DURATION, yoyo: true,
            onComplete: () => {
                // Stop before reporting the choice: the game may show this scene again right away for a pending level up
                this.scene.stop();
                this.game.events.emit(GameConstants.Events.BONUS_CHOSEN_EVENT, choice);
            }
        });
    }

    // Lives for the life bonus, levels before and after for upgrades
    private getLevelLabel(choice: BonusChoice): string {
        if (choice.id === 'health')
            return choice.nextLevel === 1 ? '+1 life' : `+${choice.nextLevel} lives`;

        if (choice.currentLevel === 0)
            return `NEW  Lv ${choice.nextLevel} / ${choice.maxLevel}`;

        return `Lv ${choice.currentLevel} → ${choice.nextLevel} / ${choice.maxLevel}`;
    }
}
