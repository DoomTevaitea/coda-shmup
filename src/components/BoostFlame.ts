import {GameObjects, Scene} from "phaser";
import Entity from "../entities/Entity.ts";
import IComponent from "./IComponent.ts";

// Flames coming out of the back of an entity while it boosts, with a burst when the boost starts.
// Particles are emitted in the world, so they stay behind as a trail while the entity moves on
export default class BoostFlame implements IComponent {
    private static readonly TEXTURE_KEY: string = 'boost-flame-particle';
    private static readonly TEXTURE_RADIUS: number = 8;
    // From hot yellow to dark red as the particle ages
    private static readonly COLORS: number[] = [0xffd166, 0xff8c1a, 0xff3d00, 0x5a1000];
    // Distance behind the entity center where flames come out
    private static readonly BACK_OFFSET: number = 44;
    private static readonly SPREAD_DEGREES: number = 14;
    private static readonly PARTICLES_PER_FRAME: number = 2;
    private static readonly START_BURST_COUNT: number = 18;
    // Same depth as the ships, above the background: the flames come out behind the ship anyway
    private static readonly DEPTH: number = 0;

    public enabled: boolean = true;

    private readonly _emitter: GameObjects.Particles.ParticleEmitter;
    private _wasBoosting: boolean = false;

    public constructor(scene: Scene) {
        BoostFlame.createTexture(scene);

        // The emitter never moves and never emits on its own: update() places each particle behind the entity
        this._emitter = scene.add.particles(0, 0, BoostFlame.TEXTURE_KEY, {
            lifespan: 380,
            speed: {min: 160, max: 320},
            scale: {start: 2.2, end: 0},
            alpha: {start: 1, end: 0},
            color: BoostFlame.COLORS,
            blendMode: Phaser.BlendModes.ADD,
            emitting: false
        }).setDepth(BoostFlame.DEPTH);
    }

    // The texture is shared by the whole game: only draw it once
    private static createTexture(scene: Scene) {
        if (scene.textures.exists(BoostFlame.TEXTURE_KEY))
            return;

        const size: number = BoostFlame.TEXTURE_RADIUS * 2;
        scene.make.graphics({}, false)
            .fillStyle(0xffffff)
            .fillCircle(BoostFlame.TEXTURE_RADIUS, BoostFlame.TEXTURE_RADIUS, BoostFlame.TEXTURE_RADIUS)
            .generateTexture(BoostFlame.TEXTURE_KEY, size, size)
            .destroy();
    }

    public update(entity: Entity, isBoosting: boolean) {
        const shouldEmit: boolean = this.enabled && isBoosting;
        if (shouldEmit) {
            // Flames go backwards, behind the entity
            const backAngle: number = entity.angle + 180;
            this._emitter.setEmitterAngle({
                min: backAngle - BoostFlame.SPREAD_DEGREES,
                max: backAngle + BoostFlame.SPREAD_DEGREES
            });

            const x: number = entity.x - Math.cos(entity.rotation) * BoostFlame.BACK_OFFSET;
            const y: number = entity.y - Math.sin(entity.rotation) * BoostFlame.BACK_OFFSET;
            const count: number = this._wasBoosting ? BoostFlame.PARTICLES_PER_FRAME : BoostFlame.START_BURST_COUNT;
            this._emitter.emitParticleAt(x, y, count);
        }

        this._wasBoosting = shouldEmit;
    }

    public stop() {
        this._wasBoosting = false;
    }
}
