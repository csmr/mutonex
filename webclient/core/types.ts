import './global_types.ts';

export type EntityType =
  | 'player'
  | 'fauna'
  | 'unit'
  | 'building'
  | 'building_tent'
  | 'building_houses'
  | 'building_cityscape'
  | 'building_power_structure'
  | 'building_spawn_hub'
  | 'building_moyai'
  | 'building_solar_panel'
  | 'society'
  | 'item'
  | 'item_gem'
  | 'item_video_phone'
  | 'mineral';

export interface EntityData {
  id: string;
  type: EntityType;
  pos: any; // THREE.Vector3
  char: string;
  isStationary?: boolean;
  facing?: 'front' | 'side' | 'top';
  charm?: number;
}

export interface Terrain {
  type: 'heightmap';
  size: {
    width: number;
    height: number;
  };
  data: number[][];
}
