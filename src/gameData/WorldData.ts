import {MinimapSettingsData} from "./MinimapData.ts";

export type WorldData = {
    width: number;
    height: number;
    border: {
        color: string;
        width: number;
    };
    camera: {
        // Between 0 and 1: the lower, the smoother the camera follows the player
        lerp: number;
        // Below 1, the camera shows more of the world. The wide view bonus zooms out further from here
        zoom: number;
    };
    background: {
        // Below 1, the background scrolls slower than the world, which gives a feeling of depth
        parallax: number;
    };
    enemies: {
        // Extra distance beyond the screen corners where enemies appear, so they never pop in on screen
        spawnMargin: number;
        // Enemies left this far behind the player are recycled
        despawnDistance: number;
    };
    minimap: MinimapSettingsData;
}
