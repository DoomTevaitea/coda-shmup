export type MinimapSettingsData = {
    // Side of the square minimap on screen (px)
    size: number;
    // Distance from the bottom right corner of the screen (px)
    margin: number;
    // Time between two minimap refreshes (ms): the minimap doesn't need 60 refreshes per second
    refreshDelay: number;
}

export type MinimapPoint = {
    x: number;
    y: number;
}

// What the game sends to the UI on every minimap refresh, all positions in world coordinates
export type MinimapSnapshot = {
    worldWidth: number;
    worldHeight: number;
    player: MinimapPoint & {rotation: number};
    // Part of the world currently on screen
    view: MinimapPoint & {width: number; height: number};
    enemies: MinimapPoint[];
    boss: (MinimapPoint & {color: string}) | null;
    // Fixed places to find your way, like the planet
    landmarks: MinimapPoint[];
}
