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
  | 'item_conveyor_belt'
  | 'item_society_policy'
  | 'item_sunspot_cream'
  | 'item_fiber_optic'
  | 'item_attack_modifier'
  | 'mineral';

export interface EntityData {
  id: string;
  type: EntityType;
  pos: any; // THREE.Vector3
  char: string;
  isStationary?: boolean;
  facing?: 'front' | 'side' | 'top';
  charm?: number;
  rotY?: number;
  breath?: number;
}

export interface Terrain {
  type: 'heightmap';
  size: {
    width: number;
    height: number;
  };
  data: number[][];
}
