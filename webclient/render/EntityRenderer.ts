import '../core/global_types.ts';
import { EntityData, EntityType } from '../core/types.ts';
import {
  getEntityProfile,
  getGlyphChar,
} from '../core/EntityProfiles.ts';

/**
 * Manages 3D representation of game entities.
 */
export class EntityRenderer {
  private scene: any;
  private meshes: Map<string, any> = new Map();
  private geoCache: Map<string, any> = new Map();
  private loader: any;
  private matFactory: (color: number) => any;

  private charMap: { [key in EntityType]: string[] } = {
    'player': ['🧙', '𐇑', '𐇒', '👷', '🧕'],
    'fauna': [
      '🐀',
      '🐂',
      '🐆',
      '🐈',
      '🐊',
      '🐦',
      '🐜',
      '🐝',
      '🦗',
      '🐢',
      '🐕',
      '🕊',
      '🦔',
    ],
    'unit': ['🤖', '✈'],
    'building': ['🏛'],
    'building_tent': ['🎪'],
    'building_houses': ['🏘'],
    'building_cityscape': ['🏙'],
    'building_power_structure': ['🏛'],
    'building_spawn_hub': ['🏛'],
    'building_moyai': ['🗿'],
    'building_solar_panel': ['🎛'],
    'society': ['🎪', '🏘', '🏙', '🏰', '🗿', '💩'],
    'mineral': [
      '⭓',
      '⬠',
      '💎',
      '🌱',
      '🌲',
      '🌳',
      '🌴',
      '🌵',
      '🌾',
      '🍄',
      '🌺',
      '🌻',
    ],
    'item': ['💎', '📟', '🧴', '🤺'],
    'item_gem': ['💎'],
    'item_video_phone': ['📟'],
  };

  private colorMap: { [key in string]: number } = {
    'player': 0x1E90FF,
    'fauna': 0x228B22,
    'unit': 0xFFA500,
    'building': 0x8B4513,
    'building_tent': 0xE9967A,
    'building_houses': 0xCD853F,
    'building_cityscape': 0x708090,
    'building_power_structure': 0xDAA520,
    'building_spawn_hub': 0x8A2BE2,
    'building_moyai': 0x808080,
    'building_solar_panel': 0x4682B4,
    'society': 0x00CED1,
    'mineral': 0x800080,
    'item': 0xFFFF00,
    'item_gem': 0xFFFF00,
    'item_video_phone': 0x00FF00,
  };

  constructor(
    scene: any,
    matFactory: (color: number) => any,
  ) {
    this.scene = scene;
    this.matFactory = matFactory;
    this.loader = new THREE.BufferGeometryLoader();
  }

  public update(entities: EntityData[]) {
    const activeIds = new Set<string>();

    for (const entity of entities) {
      activeIds.add(entity.id);
      const color = this.colorMap[entity.type] || 0xffffff;
      const char = this.getChar(entity);
      this.syncMesh(entity, char, color);
    }

    for (const [id, mesh] of this.meshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.meshes.delete(id);
      }
    }
  }

  private getChar(entity: EntityData): string {
    let chars = this.charMap[entity.type];
    if (!chars && entity.type.startsWith('building_')) {
      chars = this.charMap['building'];
    }
    if (!chars) return getGlyphChar(entity.type);
    const idLen = entity.id.length;
    const charIdx = entity.id.charCodeAt(idLen - 1);
    return chars[charIdx % chars.length];
  }

  private syncMesh(
    ent: EntityData,
    char: string,
    color: number,
  ) {
    let mesh = this.getOrCreate(ent, char, color);
    if (mesh) {
      const isStationary = ent.isStationary ||
        mesh.geometry?.userData?.metadata?.isStationary;

      if (isStationary) {
        if (mesh.position.distanceTo(ent.pos) > 1.0) {
          mesh.position.copy(ent.pos);
        }
      } else {
        mesh.position.copy(ent.pos);
      }
    }
  }

  private getOrCreate(
    ent: EntityData,
    char: string,
    color: number,
  ): any {
    const id = ent.id;

    // Use deterministic derivation from the character pseudo-hash.
    const cp = char.codePointAt(0);
    const hex = cp!.toString(16).toUpperCase();

    let mesh = this.meshes.get(id);

    if (!mesh) {
      const prof = getEntityProfile(ent.type) ||
        getEntityProfile(hex);
      const s = prof?.scale ?? 2.0;
      const box = new THREE.BoxGeometry(s, s, s);
      mesh = new THREE.Mesh(box, this.matFactory(color));
      mesh.userData = { entityId: id, entityType: ent.type };
      this.scene.add(mesh);
      this.meshes.set(id, mesh);
      this.fetchGeo(id, hex);
      return mesh;
    }

    const cached = this.geoCache.get(hex);
    const isBox = mesh.geometry.type === 'BoxGeometry';
    if (cached && !(cached instanceof Promise) && isBox) {
      return this.replaceGeo(ent, cached);
    }
    return mesh;
  }

  private fetchGeo(id: string, hex: string) {
    if (this.geoCache.has(hex)) return;

    const url = `assets/entity_geometry/${hex}.json`;
    this.geoCache.set(hex, new Promise(() => {}));

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) {
          console.warn('Failed to fetch model:', hex);
          return;
        }
        const geo = this.loader.parse(json);
        // Apply JSON physical orientations and metadata
        if (json.mutonex_entity_metadata) {
          geo.userData.metadata = json.mutonex_entity_metadata;
          const matrix = new THREE.Matrix4().fromArray(
            json.mutonex_entity_metadata.transform.matrix,
          );
          geo.applyMatrix4(matrix);
        }

        this.geoCache.set(hex, geo);
        // replaceGeo called next tick by getOrCreate
      })
      .catch((e) => console.error('Geo fetch fail', hex, e));
  }

  private replaceGeo(ent: EntityData, geo: any): any {
    const id = ent.id;
    const ex = this.meshes.get(id);
    if (!ex) return null;
    this.scene.remove(ex);

    // Create new mesh with baked transformed geometry
    const next = new THREE.Mesh(geo, ex.material);
    next.position.copy(ex.position);
    next.userData = ex.userData;

    this.scene.add(next);
    this.meshes.set(id, next);
    return next;
  }
}
