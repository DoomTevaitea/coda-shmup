import {ShipBodyData} from "./ShipBodyData.ts";

export type PlayerShipsData = {
    [key: string]: PlayerShipData
}

export type PlayerShipData = {
    movementSpeed: number;
    // Maximum rotation speed when steering toward the mouse cursor, in degrees per second
    turnSpeed: number;
    texture: string;
    body: ShipBodyData;
}