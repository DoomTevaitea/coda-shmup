import {AUTO, Game, Scale, Types} from 'phaser';
import ControlsScene from "./scenes/ControlsScene.ts";
import GameOverScene from "./scenes/GameOverScene.ts";
import HomeScene from "./scenes/HomeScene.ts";
import LeaderboardScene from "./scenes/LeaderboardScene.ts";
import LevelUpScene from "./scenes/LevelUpScene.ts";
import MainGameScene from './scenes/MainGameScene.ts';
import MainUIScene from "./scenes/MainUIScene.ts";
import PauseScene from "./scenes/PauseScene.ts";
import ShopScene from "./scenes/ShopScene.ts";
import EntityManager from "./managers/EntityManager.ts";
import ProgressionManager from "./managers/ProgressionManager.ts";
import SaveManager from "./managers/SaveManager.ts";

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
    type: AUTO,
    width: 1440,
    height: 1440,
    parent: 'game-container',
    backgroundColor: '#000',
    scale: {
        mode: Scale.FIT,
        autoCenter: Scale.CENTER_BOTH
    },
    // Gamepads (PS5 DualSense...), and up to 3 fingers at once on touch screens: move, aim and nitro
    input: {
        gamepad: true,
        activePointers: 3
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
        }
    },
    plugins: {
        global: [
            {key: SaveManager.PLUGIN_KEY, plugin: SaveManager, mapping: SaveManager.MAPPING_NAME}
        ],
        scene: [
            {key: EntityManager.PLUGIN_KEY, plugin: EntityManager, mapping: EntityManager.MAPPING_NAME},
            {key: ProgressionManager.PLUGIN_KEY, plugin: ProgressionManager, mapping: ProgressionManager.MAPPING_NAME}
        ]
    },
    // fps: { forceSetTimeOut: true, target: 120 },
    scene: [
        HomeScene,
        ShopScene,
        LeaderboardScene,
        ControlsScene,
        MainGameScene,
        MainUIScene,
        LevelUpScene,
        PauseScene,
        GameOverScene
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    new Game(config);
});
