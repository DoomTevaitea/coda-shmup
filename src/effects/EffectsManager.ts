import {GameObjects, Scene} from "phaser";

// Visual feedback only: explosions, floating damage numbers and the red flash when the player is hit.
// The game logic tells it what happened, it never changes the game state
export default class EffectsManager {
    private static readonly PARTICLE_TEXTURE_KEY: string = 'effect-particle';
    private static readonly PARTICLE_RADIUS: number = 6;
    private static readonly EXPLOSION_COLORS: number[] = [0xffffff, 0xffd166, 0xff8c1a, 0xff3d00, 0x3a1000];
    // More particles for bigger entities, within these limits
    private static readonly PARTICLES_PER_PIXEL: number = 0.25;
    private static readonly MIN_PARTICLES: number = 12;
    private static readonly MAX_PARTICLES: number = 90;
    private static readonly DAMAGE_TEXT_RISE: number = 70;
    private static readonly DAMAGE_TEXT_DURATION: number = 600;
    private static readonly DAMAGE_TEXT_COLOR: string = '#ffe066';
    private static readonly BIG_DAMAGE: number = 5;
    private static readonly BIG_DAMAGE_COLOR: string = '#ff8c1a';
    private static readonly HIT_FLASH_DURATION: number = 160;
    private static readonly HIT_FLASH_RED: number = 255;
    private static readonly HIT_FLASH_GREEN: number = 30;
    private static readonly HIT_FLASH_BLUE: number = 30;
    // Above every entity
    private static readonly DEPTH: number = 5;

    private readonly _scene: Scene;
    private readonly _explosionEmitter: GameObjects.Particles.ParticleEmitter;

    public constructor(scene: Scene) {
        this._scene = scene;
        EffectsManager.createParticleTexture(scene);

        this._explosionEmitter = scene.add.particles(0, 0, EffectsManager.PARTICLE_TEXTURE_KEY, {
            lifespan: {min: 300, max: 700},
            speed: {min: 80, max: 420},
            scale: {start: 1.6, end: 0},
            alpha: {start: 1, end: 0},
            color: EffectsManager.EXPLOSION_COLORS,
            blendMode: Phaser.BlendModes.ADD,
            emitting: false
        }).setDepth(EffectsManager.DEPTH);
    }

    // Shared by the whole game: only drawn once
    public static createParticleTexture(scene: Scene) {
        if (scene.textures.exists(EffectsManager.PARTICLE_TEXTURE_KEY))
            return;

        const size: number = EffectsManager.PARTICLE_RADIUS * 2;
        scene.make.graphics({}, false)
            .fillStyle(0xffffff)
            .fillCircle(EffectsManager.PARTICLE_RADIUS, EffectsManager.PARTICLE_RADIUS, EffectsManager.PARTICLE_RADIUS)
            .generateTexture(EffectsManager.PARTICLE_TEXTURE_KEY, size, size)
            .destroy();
    }

    // size: width of the exploding entity, bigger entities explode with more particles
    public explode(x: number, y: number, size: number) {
        const count: number = Phaser.Math.Clamp(Math.round(size * EffectsManager.PARTICLES_PER_PIXEL),
            EffectsManager.MIN_PARTICLES, EffectsManager.MAX_PARTICLES);
        this._explosionEmitter.explode(count, x, y);
    }

    // Number rising and fading above what was hit
    public showDamage(x: number, y: number, amount: number) {
        const isBig: boolean = amount >= EffectsManager.BIG_DAMAGE;
        const text: GameObjects.Text = this._scene.add.text(x, y, Math.round(amount).toString(), {
            fontSize: isBig ? '40px' : '30px',
            color: isBig ? EffectsManager.BIG_DAMAGE_COLOR : EffectsManager.DAMAGE_TEXT_COLOR,
            fontFamily: 'future',
            stroke: '#000',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(EffectsManager.DEPTH);

        this._scene.tweens.add({
            targets: text,
            y: y - EffectsManager.DAMAGE_TEXT_RISE,
            alpha: {from: 1, to: 0},
            ease: 'Quad.easeOut',
            duration: EffectsManager.DAMAGE_TEXT_DURATION,
            onComplete: () => text.destroy()
        });
    }

    public flashPlayerHit() {
        this._scene.cameras.main.flash(EffectsManager.HIT_FLASH_DURATION,
            EffectsManager.HIT_FLASH_RED, EffectsManager.HIT_FLASH_GREEN, EffectsManager.HIT_FLASH_BLUE);
    }
}
