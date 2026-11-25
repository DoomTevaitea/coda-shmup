export type BulletData = {
    width: number;
    height: number;
    color: number;
    speed: number;
    damage: number;
}

// JSON has no hexadecimal literal: colors are written as "#rrggbb" strings
export type BulletJsonData = Omit<BulletData, 'color'> & {
    color: string;
}

export function toBulletData(json: BulletJsonData): BulletData {
    return {
        ...json,
        color: Phaser.Display.Color.HexStringToColor(json.color).color
    };
}
