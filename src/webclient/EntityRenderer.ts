import "./global_types.ts";
import { EntityData, EntityType } from "./types.ts";

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
    "player": ["🧙", "𐇑", "𐇒"],
    "fauna": ["🦗", "🌱", "🌲"],
    "unit": ["👷", "🤖", "🧕"],
    "building": ["🏛"],
    "society": ["🎪", "🏘", "🏙"],
    "mineral": ["⭓", "⬠", "💎"],
  };

  private colorMap: { [key in string]: number } = {
    "player": 0x1E90FF,
    "fauna": 0x228B22,
    "unit": 0xFFA500,
    "building": 0x8B4513,
    "society": 0x00CED1,
    "mineral": 0x800080,
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
    const chars = this.charMap[entity.type] || ["?"];
    const idLen = entity.id.length;
    const charIdx = entity.id.charCodeAt(idLen - 1);
    return chars[charIdx % chars.length];
  }

  private syncMesh(
    ent: EntityData,
    char: string,
    color: number,
  ) {
    let mesh = this.getOrCreate(ent.id, char, color);
    if (mesh) mesh.position.copy(ent.pos);
  }

  private getOrCreate(
    id: string,
    char: string,
    color: number,
  ): any {
    const cp = char.codePointAt(0);
    const hex = cp!.toString(16).toUpperCase();
    let mesh = this.meshes.get(id);

    if (!mesh) {
      const box = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      mesh = new THREE.Mesh(box, this.matFactory(color));
      this.scene.add(mesh);
      this.meshes.set(id, mesh);
      this.fetchGeo(id, hex);
      return mesh;
    }

    const cached = this.geoCache.get(hex);
    const isBox = mesh.geometry.type === "BoxGeometry";
    if (cached && !(cached instanceof Promise) && isBox) {
      return this.replaceGeo(id, cached);
    }
    return mesh;
  }

  private fetchGeo(id: string, hex: string) {
    if (this.geoCache.has(hex)) return;

    const url = `assets/geometry/${hex}.json`;
    this.geoCache.set(hex, new Promise(() => {}));

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) return;
        const geo = this.loader.parse(json);
        this.geoCache.set(hex, geo);
        this.replaceGeo(id, geo);
      })
      .catch((e) => console.error("Geo fetch fail", hex, e));
  }

  private replaceGeo(id: string, geo: any): any {
    const ex = this.meshes.get(id);
    if (!ex) return null;
    this.scene.remove(ex);
    ex.geometry.dispose();
    const next = new THREE.Mesh(geo, ex.material);
    next.position.copy(ex.position);
    this.scene.add(next);
    this.meshes.set(id, next);
    return next;
  }
}
