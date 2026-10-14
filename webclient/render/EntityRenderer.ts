import '../core/global_types.ts';
import { EntityData } from '../core/types.ts';
import {
  getCharForEntity,
  getColorForEntity,
  getEntityProfile,
} from '../core/EntityProfiles.ts';

interface GeoCacheEntry {
  state: 'loading' | 'ready' | 'failed';
  geo?: any;
}

/**
 * Manages 3D representation of game entities.
 */
export class EntityRenderer {
  private scene: any;
  private meshes: Map<string, any> = new Map();
  private geoCache: Map<string, GeoCacheEntry> = new Map();
  private loader: any;
  private matFactory: (color: number) => any;

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
      const color = getColorForEntity(entity.type);
      const char = getCharForEntity(entity.type, entity.id);
      this.syncMesh(entity, char, color);
    }

    for (const [id, mesh] of this.meshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
        this.meshes.delete(id);
      }
    }
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

    // Use deterministic derivation from character code point.
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
    if (cached?.state === 'ready' && isBox) {
      return this.replaceGeo(ent, cached.geo);
    }
    return mesh;
  }

  private fetchGeo(_id: string, hex: string) {
    const entry = this.geoCache.get(hex);
    if (entry?.state === 'loading' || entry?.state === 'ready') {
      return;
    }

    const url = `assets/entity_geometry/${hex}.json`;
    this.geoCache.set(hex, { state: 'loading' });

    fetch(url)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json) {
          console.warn('Failed to fetch model:', hex);
          this.geoCache.set(hex, { state: 'failed' });
          return;
        }
        const geo = this.loader.parse(json);
        if (json.mutonex_entity_metadata) {
          geo.userData.metadata = json.mutonex_entity_metadata;
          const matrix = new THREE.Matrix4().fromArray(
            json.mutonex_entity_metadata.transform.matrix,
          );
          geo.applyMatrix4(matrix);
        }

        this.geoCache.set(hex, { state: 'ready', geo });
      })
      .catch((e) => {
        console.error('Geo fetch fail', hex, e);
        this.geoCache.set(hex, { state: 'failed' });
      });
  }

  private replaceGeo(ent: EntityData, geo: any): any {
    const id = ent.id;
    const ex = this.meshes.get(id);
    if (!ex) return null;
    this.scene.remove(ex);

    if (ex.geometry) {
      ex.geometry.dispose();
    }

    const next = new THREE.Mesh(geo, ex.material);
    next.position.copy(ex.position);
    next.userData = ex.userData;

    this.scene.add(next);
    this.meshes.set(id, next);
    return next;
  }
}
