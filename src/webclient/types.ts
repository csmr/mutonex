import "./global_types.ts";

export type EntityType = 'player' | 'fauna' | 'building' | 'mineral';

export interface EntityData {
    id: string;
    type: EntityType;
    pos: any; // THREE.Vector3
    char: string; // The emoticon/character (optional for SphereView but kept for consistency)
}

export interface Terrain {
    type: "heightmap";
    size: {
      width: number;
      height: number;
    };
    data: number[][];
}
