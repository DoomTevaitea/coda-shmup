import {GameObjects, Scene} from "phaser";
import type {ChoiceId} from "../gameData/ProgressionData.ts";

// Draws the level up bonus icons once into textures, there are no image files for them.
// Each icon is drawn in a SIZE x SIZE square, with a green "+" in the top right corner
export default class BonusIcons {
    public static readonly SIZE: number = 128;

    private static readonly TEXTURE_PREFIX: string = 'bonus-icon-';
    private static readonly PLUS_COLOR: number = 0x7ae582;
    private static readonly METAL_COLOR: number = 0xc9d1d9;
    private static readonly DARK_METAL_COLOR: number = 0x6b7785;
    private static readonly FLAME_COLOR: number = 0xff9f1c;
    private static readonly FLAME_CORE_COLOR: number = 0xffe066;
    private static readonly NITRO_COLOR: number = 0x2f80ed;
    private static readonly BULLET_COLOR: number = 0xffc93c;
    private static readonly BULLET_CASE_COLOR: number = 0xb8860b;
    private static readonly HEART_COLOR: number = 0xe53935;
    private static readonly CANNON_COLOR: number = 0xc62828;
    private static readonly DRONE_COLOR: number = 0x7ae582;
    private static readonly LASER_COLOR: number = 0x4dd0e1;
    private static readonly CANNON_DARK_COLOR: number = 0x7f1d1d;
    private static readonly OUTLINE_COLOR: number = 0x000000;

    public static getTextureKey(id: ChoiceId): string {
        return BonusIcons.TEXTURE_PREFIX + id;
    }

    // Textures are shared by the whole game: only draw the ones that don't exist yet
    public static createTextures(scene: Scene) {
        const painters: Record<ChoiceId, (graphics: GameObjects.Graphics) => void> = {
            zoom: BonusIcons.drawMagnifier,
            boost: BonusIcons.drawNitro,
            speed: BonusIcons.drawEngine,
            damage: BonusIcons.drawCannon,
            multishot: BonusIcons.drawBullets,
            bulletSpeed: BonusIcons.drawFastBullet,
            drones: BonusIcons.drawDrones,
            missiles: BonusIcons.drawMissile,
            piercingLaser: BonusIcons.drawLaser,
            shield: BonusIcons.drawShield,
            health: BonusIcons.drawHeart,
        };

        for (const id of Object.keys(painters) as ChoiceId[]) {
            const key: string = BonusIcons.getTextureKey(id);
            if (scene.textures.exists(key))
                continue;

            const graphics: GameObjects.Graphics = scene.make.graphics({}, false);
            painters[id](graphics);
            BonusIcons.drawPlus(graphics);
            graphics.generateTexture(key, BonusIcons.SIZE, BonusIcons.SIZE);
            graphics.destroy();
        }
    }

    private static drawPlus(graphics: GameObjects.Graphics) {
        const centerX: number = 104;
        const centerY: number = 24;
        const length: number = 36;
        const thickness: number = 12;

        graphics.fillStyle(BonusIcons.OUTLINE_COLOR)
            .fillRect(centerX - length / 2 - 3, centerY - thickness / 2 - 3, length + 6, thickness + 6)
            .fillRect(centerX - thickness / 2 - 3, centerY - length / 2 - 3, thickness + 6, length + 6)
            .fillStyle(BonusIcons.PLUS_COLOR)
            .fillRect(centerX - length / 2, centerY - thickness / 2, length, thickness)
            .fillRect(centerX - thickness / 2, centerY - length / 2, thickness, length);
    }

    // Wide view: a magnifying glass
    private static drawMagnifier(graphics: GameObjects.Graphics) {
        graphics.lineStyle(16, BonusIcons.DARK_METAL_COLOR)
            .lineBetween(78, 82, 112, 116)
            .lineStyle(10, BonusIcons.METAL_COLOR)
            .strokeCircle(54, 58, 32)
            .fillStyle(0x9fd3ff, 0.5)
            .fillCircle(54, 58, 27);
    }

    // Nitro: a gas bottle with a flame coming out of it
    private static drawNitro(graphics: GameObjects.Graphics) {
        graphics.fillStyle(BonusIcons.FLAME_COLOR)
            .fillTriangle(30, 116, 50, 72, 70, 116)
            .fillStyle(BonusIcons.FLAME_CORE_COLOR)
            .fillTriangle(40, 116, 50, 90, 60, 116)
            .fillStyle(BonusIcons.NITRO_COLOR)
            .fillRoundedRect(32, 30, 36, 60, 10)
            .fillStyle(BonusIcons.DARK_METAL_COLOR)
            .fillRect(42, 14, 16, 18)
            .fillStyle(0xffffff)
            .fillRect(32, 50, 36, 10);
    }

    // Engine: a jet engine with its exhaust flame
    private static drawEngine(graphics: GameObjects.Graphics) {
        graphics.fillStyle(BonusIcons.FLAME_COLOR)
            .fillTriangle(8, 72, 36, 52, 36, 92)
            .fillStyle(BonusIcons.FLAME_CORE_COLOR)
            .fillTriangle(20, 72, 36, 62, 36, 82)
            .fillStyle(BonusIcons.DARK_METAL_COLOR)
            .fillRect(32, 50, 20, 44)
            .fillStyle(BonusIcons.METAL_COLOR)
            .fillRoundedRect(48, 44, 52, 56, 12)
            .fillStyle(BonusIcons.DARK_METAL_COLOR)
            .fillCircle(100, 72, 22)
            .fillStyle(BonusIcons.OUTLINE_COLOR)
            .fillCircle(100, 72, 12);
    }

    // Cannon: a red barrel on its wheel, with a dark muzzle ring
    private static drawCannon(graphics: GameObjects.Graphics) {
        graphics.fillStyle(BonusIcons.CANNON_COLOR)
            .fillRect(44, 54, 70, 26)
            .fillStyle(BonusIcons.CANNON_DARK_COLOR)
            .fillRect(44, 54, 70, 6)
            .fillRect(104, 48, 14, 38)
            .fillStyle(BonusIcons.CANNON_COLOR)
            .fillCircle(46, 68, 24)
            .fillStyle(BonusIcons.DARK_METAL_COLOR)
            .fillCircle(46, 92, 22)
            .fillStyle(BonusIcons.METAL_COLOR)
            .fillCircle(46, 92, 8)
            .fillStyle(BonusIcons.OUTLINE_COLOR)
            .fillRect(14, 112, 68, 8);
    }

    // Multishot: two bullets side by side
    private static drawBullets(graphics: GameObjects.Graphics) {
        for (const offsetX of [24, 64]) {
            graphics.fillStyle(BonusIcons.BULLET_COLOR)
                .fillRect(offsetX, 52, 30, 48)
                .fillCircle(offsetX + 15, 52, 15)
                .fillStyle(BonusIcons.BULLET_CASE_COLOR)
                .fillRect(offsetX, 86, 30, 22);
        }
    }

    // Bullet speed: a bullet flying right, with speed lines behind it
    private static drawFastBullet(graphics: GameObjects.Graphics) {
        graphics.fillStyle(BonusIcons.METAL_COLOR, 0.8)
            .fillRect(10, 50, 34, 6)
            .fillRect(18, 66, 26, 6)
            .fillRect(10, 82, 34, 6)
            .fillStyle(BonusIcons.BULLET_CASE_COLOR)
            .fillRect(50, 54, 22, 30)
            .fillStyle(BonusIcons.BULLET_COLOR)
            .fillRect(70, 54, 26, 30)
            .fillCircle(96, 69, 15);
    }

    // Drones: three green orbs around a ring
    private static drawDrones(graphics: GameObjects.Graphics) {
        graphics.lineStyle(4, BonusIcons.DRONE_COLOR, 0.5).strokeCircle(60, 70, 36);
        for (const angle of [0, Phaser.Math.PI2 / 3, Phaser.Math.PI2 * 2 / 3]) {
            const x: number = 60 + Math.cos(angle - Math.PI / 2) * 36;
            const y: number = 70 + Math.sin(angle - Math.PI / 2) * 36;
            graphics.fillStyle(BonusIcons.DRONE_COLOR).fillCircle(x, y, 13)
                .fillStyle(0xffffff).fillCircle(x, y, 5);
        }
    }

    // Missile: a rocket flying up right, with its flame
    private static drawMissile(graphics: GameObjects.Graphics) {
        graphics.fillStyle(BonusIcons.FLAME_COLOR).fillTriangle(14, 114, 30, 82, 46, 98)
            .fillStyle(BonusIcons.FLAME_CORE_COLOR).fillTriangle(22, 106, 32, 88, 40, 96)
            .fillStyle(BonusIcons.METAL_COLOR).fillTriangle(36, 92, 82, 46, 50, 106)
            .fillTriangle(36, 92, 82, 46, 22, 78)
            .fillStyle(BonusIcons.CANNON_COLOR).fillTriangle(82, 46, 100, 28, 90, 58)
            .fillTriangle(82, 46, 100, 28, 70, 38);
    }

    // Ion laser: a cyan beam with a white core going across the icon
    private static drawLaser(graphics: GameObjects.Graphics) {
        graphics.lineStyle(22, BonusIcons.LASER_COLOR, 0.5).lineBetween(10, 110, 110, 34)
            .lineStyle(12, BonusIcons.LASER_COLOR).lineBetween(10, 110, 110, 34)
            .lineStyle(4, 0xffffff).lineBetween(10, 110, 110, 34)
            .fillStyle(BonusIcons.DARK_METAL_COLOR).fillCircle(18, 104, 14);
    }

    // Shield: a cyan bubble with a highlight
    private static drawShield(graphics: GameObjects.Graphics) {
        graphics.fillStyle(BonusIcons.LASER_COLOR, 0.25).fillCircle(60, 70, 42)
            .lineStyle(7, BonusIcons.LASER_COLOR).strokeCircle(60, 70, 42)
            .lineStyle(5, 0xffffff, 0.8).beginPath()
            .arc(60, 70, 30, Phaser.Math.DegToRad(200), Phaser.Math.DegToRad(260)).strokePath();
    }

    // Life: a heart, two circles on top of a triangle
    private static drawHeart(graphics: GameObjects.Graphics) {
        graphics.fillStyle(BonusIcons.HEART_COLOR)
            .fillCircle(44, 58, 24)
            .fillCircle(84, 58, 24)
            .fillTriangle(21, 66, 107, 66, 64, 112);
    }
}
