import {GameObjects, Plugins, Physics, Scene} from "phaser";
import Health from "../components/Health.ts";
import Bullet from "../entities/Bullet.ts";
import Enemy from "../entities/Enemy.ts";
import Entity from "../entities/Entity.ts";
import Player from "../entities/Player.ts";
import ConfigurableEnemy from "../entities/ConfigurableEnemy.ts";
import Boss from "../entities/Boss.ts";
import type {BossData} from "../gameData/BossData.ts";
import type {BossType} from "../gameData/ProgressionData.ts";
import type {EnemyData} from "../gameData/EnemyData.ts";
import type {ConfigurableEnemyData} from "../gameData/ConfigurableEnemyData.ts";
import type {SpawnData} from "../gameData/SpawnData.ts";
import type {MinimapPoint} from "../gameData/MinimapData.ts";
import type {WorldData} from "../gameData/WorldData.ts";
import GroupUtils from "../utils/GroupUtils.ts";
import GameConstants from "../GameConstants.ts";
import RegistryConstants from "../RegistryConstants.ts";
import ProgressionManager from "./ProgressionManager.ts";

export default class EntityManager extends Plugins.ScenePlugin {
    public static readonly PLUGIN_KEY: string = 'EntityManager';
    public static readonly MAPPING_NAME: string = 'entityManager';

    // Distance from the boss where its summoned minions appear
    private static readonly SUMMON_DISTANCE: number = 260;

    // noinspection JSUnusedGlobalSymbols
    private readonly bulletGroupConfig = {
        classType: Bullet,
        maxSize: 256,
        runChildUpdate: true,
        createCallback: (bullet: GameObjects.GameObject) => {
            (bullet as Bullet).init();
        }
    }

    private _worldData: WorldData;
    // Gives how hard the game currently is: spawn rate, enemy speed and health
    private _progression: ProgressionManager;
    private _player: Player;
    private _playerBullets: Physics.Arcade.Group;
    private _enemies: Physics.Arcade.Group;
    private _enemyData: EnemyData;
    private _enemyBullets: Physics.Arcade.Group;
    // One pooled group per ConfigurableEnemy type (sine, speed, tank...), by data key
    private _configurableEnemyGroups: Map<string, Physics.Arcade.Group>;
    private _bossGroups: Record<BossType, Physics.Arcade.Group>;
    // Regular enemies stop coming during a boss fight
    private _areRegularSpawnsPaused: boolean = false;

    constructor(scene: Scene, pluginManager: Plugins.PluginManager) {
        super(scene, pluginManager, EntityManager.PLUGIN_KEY);

        console.log("[EntityManager] Initialized");
    }

    destroy() {
        super.destroy();

        console.log("[EntityManager] Destroyed");
    }

    public initAndSpawnPlayer(): Player {
        this._playerBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(64, this._playerBullets);

        this._worldData = this.scene!.cache.json.get(GameConstants.DataKeys.WORLD) as WorldData;

        this._player = new Player(this.scene!, this._worldData.width / 2, this._worldData.height / 2);
        this._player.init(this._playerBullets);

        console.log("[EntityManager] Player spawned");

        this.game!.events.emit(GameConstants.Events.PLAYER_SPAWNED_EVENT, this._player);

        return this._player;
    }

    public initEnemies(progression: ProgressionManager): Physics.Arcade.Group {
        this._progression = progression;

        this._enemyBullets = this.scene!.physics.add.group(this.bulletGroupConfig);
        GroupUtils.populate(256, this._enemyBullets);

        this._enemyData = this.scene!.cache.json.get(GameConstants.DataKeys.ENEMY) as EnemyData;

        this._enemies = this.scene!.physics.add.group({
            classType: Enemy,
            defaultKey: 'sprites',
            defaultFrame: 'ufoRed',
            createCallback: (enemy) => {
                (enemy as Enemy).init(this._enemyBullets, this._enemyData, this._player,
                    this._worldData.enemies.despawnDistance);
                this.listenToEnemyDeath(enemy as Entity, this._enemyData.xp);
            }
        });

        // Spawn enemies indefinitely
        this.scheduleSpawn(this._enemyData.spawn.delay,
            () => this.spawnFromGroup(this._enemies, this._enemyData.spawn));

        this._configurableEnemyGroups = new Map(GameConstants.CONFIGURABLE_ENEMY_KEYS
            .map(key => [key, this.initConfigurableEnemies(key)]));

        this._bossGroups = {
            miniBoss: this.initBosses(GameConstants.DataKeys.MINI_BOSS),
            boss: this.initBosses(GameConstants.DataKeys.BOSS),
        };

        this._areRegularSpawnsPaused = false;
        this.scene!.events.on(GameConstants.Events.BOSS_SUMMON_EVENT, this.onBossSummon, this);
        this.scene!.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scene!.events.off(GameConstants.Events.BOSS_SUMMON_EVENT, this.onBossSummon, this);
        });

        console.log("[EntityManager] Enemies initialized");

        return this._enemies;
    }

    private initBosses(dataKey: string): Physics.Arcade.Group {
        const data = this.scene!.cache.json.get(dataKey) as BossData;

        return this.scene!.physics.add.group({
            classType: Boss,
            defaultKey: 'sprites',
            defaultFrame: data.texture,
            createCallback: (boss) => {
                (boss as Boss).init(this._enemyBullets, data, this._player);
                this.listenToEnemyDeath(boss as Entity, data.xp);
                (boss as Boss).getComponent(Health)?.on(Health.DEATH_EVENT, () => {
                    this.game!.events.emit(GameConstants.Events.BOSS_DEFEATED_EVENT, boss);
                });
            }
        });
    }

    // Brings a boss just outside the screen. appearance: how many times this boss type already showed up
    public spawnBoss(type: BossType, appearance: number): Boss {
        const boss = this._bossGroups[type].get() as Boss;
        const spawnPosition: Phaser.Math.Vector2 = this.getSpawnPositionAroundPlayer();
        boss.enable(spawnPosition.x, spawnPosition.y, appearance);

        this.game!.events.emit(GameConstants.Events.BOSS_SPAWNED_EVENT, boss);

        return boss;
    }

    // Positions of every alive regular enemy, bosses excluded
    public getActiveEnemyPositions(): MinimapPoint[] {
        const positions: MinimapPoint[] = [];
        for (const group of [this._enemies, ...this._configurableEnemyGroups.values()]) {
            group.getMatching('active', true).forEach((enemy: Entity) => positions.push({x: enemy.x, y: enemy.y}));
        }

        return positions;
    }

    public setRegularSpawnsPaused(paused: boolean) {
        this._areRegularSpawnsPaused = paused;
    }

    // Minions called by a boss appear around it, whatever the spawn limits
    private onBossSummon(enemyKey: string, count: number, x: number, y: number) {
        const group = this._configurableEnemyGroups.get(enemyKey);
        if (!group)
            return;

        for (let i: number = 0; i < count; i++) {
            const enemy = group.get() as ConfigurableEnemy;
            if (!enemy)
                return;

            const offset: Phaser.Math.Vector2 = new Phaser.Math.Vector2(1, 0)
                .rotate(Phaser.Math.PI2 * i / count).scale(EntityManager.SUMMON_DISTANCE);
            enemy.enable(x + offset.x, y + offset.y, this._progression.getEnemyDifficulty());
        }
    }

    private initConfigurableEnemies(dataKey: string): Physics.Arcade.Group {
        const data = this.scene!.cache.json.get(dataKey) as ConfigurableEnemyData;

        const group: Physics.Arcade.Group = this.scene!.physics.add.group({
            classType: ConfigurableEnemy,
            defaultKey: 'sprites',
            defaultFrame: data.texture,
            createCallback: (enemy) => {
                (enemy as ConfigurableEnemy).init(this._enemyBullets, data, this._player,
                    this._worldData.enemies.despawnDistance);
                this.listenToEnemyDeath(enemy as Entity, data.xp);
            }
        });

        this.scheduleSpawn(data.spawn.delay, () => this.spawnFromGroup(group, data.spawn));

        return group;
    }

    // Calls spawn again and again. The delay is computed before each spawn, so it shrinks as the game gets harder
    private scheduleSpawn(baseDelay: number, spawn: () => void) {
        this.scene!.time.delayedCall(this._progression.getSpawnDelay(baseDelay), () => {
            spawn();
            this.scheduleSpawn(baseDelay, spawn);
        });
    }

    // Pooled enemies are created once: listen once to each of their deaths, for their whole life
    private listenToEnemyDeath(enemy: Entity, xp: number) {
        enemy.getComponent(Health)?.on(Health.DEATH_EVENT, () => {
            this.scene!.events.emit(GameConstants.Events.ENEMY_KILLED_EVENT, xp);
        });
    }

    public initGroupCollisions() {
        const enemyGroups: Physics.Arcade.Group[] = [this._enemies, ...this._configurableEnemyGroups.values()];
        const bossGroups: Physics.Arcade.Group[] = Object.values(this._bossGroups);

        this.scene!.physics.add.overlap(this._playerBullets, [...enemyGroups, ...bossGroups], (bullet, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            (bullet as Bullet).disable();
            (enemy as Entity).getComponent(Health)?.damage((bullet as Bullet).damage);
        });

        this.scene!.physics.add.overlap(this._player, this._enemyBullets, (player, bullet) => {
            (bullet as Bullet).disable();
            (player as Player).getComponent(Health)?.damage((bullet as Bullet).damage);

            this.scene?.cameras.main.shake(100, 0.01);
        });

        this.scene!.physics.add.overlap(this._player, enemyGroups, (player, enemy) => {
            this.scene!.registry.inc(RegistryConstants.Keys.PLAYER_SCORE);

            const enemyHealth = (enemy as Entity).getComponent(Health);
            enemyHealth?.damage(enemyHealth?.max);

            const playerHealth = (player as Player).getComponent(Health);
            playerHealth?.damage(1);

            this.scene?.cameras.main.shake(100, 0.03);
        });

        // A boss survives touching the player, only the player gets hurt
        this.scene!.physics.add.overlap(this._player, bossGroups, (player, boss) => {
            (player as Player).getComponent(Health)?.damage((boss as Boss).bossData.contactDamage);

            this.scene?.cameras.main.shake(100, 0.03);
        });

        console.log("[EntityManager] Group collisions initialized");
    }

    // Takes an enemy from its pool and places it around the player, if this type is unlocked and not too many are alive
    private spawnFromGroup(group: Physics.Arcade.Group, spawn: SpawnData) {
        if (this._areRegularSpawnsPaused || this._progression.level < spawn.fromLevel) {
            return;
        }

        if (group.countActive(true) >= this._progression.getMaxActive(spawn.maxActive)) {
            return;
        }

        const enemy = group.get() as Enemy | ConfigurableEnemy;
        if (!enemy) {
            return;
        }

        const spawnPosition: Phaser.Math.Vector2 = this.getSpawnPositionAroundPlayer();
        enemy.enable(spawnPosition.x, spawnPosition.y, this._progression.getEnemyDifficulty());

        this.game!.events.emit(GameConstants.Events.ENEMY_SPAWNED_EVENT, enemy);
    }

    // Random point on a circle around the player, just outside the screen corners: enemies come from every direction
    private getSpawnPositionAroundPlayer(): Phaser.Math.Vector2 {
        // Divide by the zoom: when the camera zooms out, it shows more of the world
        const camera = this.scene!.cameras.main;
        const spawnDistance: number = Math.hypot(camera.width, camera.height) / 2 / camera.zoom
            + this._worldData.enemies.spawnMargin;
        const spawnRotation: number = Phaser.Math.FloatBetween(-Math.PI, Math.PI);

        return new Phaser.Math.Vector2(1, 0).rotate(spawnRotation).scale(spawnDistance)
            .add(new Phaser.Math.Vector2(this._player.x, this._player.y));
    }
}