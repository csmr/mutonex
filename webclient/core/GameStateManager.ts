// webclient/core/GameStateManager.ts
import './global_types.ts';
import { GameStateProvider } from './GameStateProvider.ts';
import { EntityData, EntityType, Terrain } from './types.ts';
import { sampleTerrainHeight } from '../render/TerrainMesh.ts';
import type {
  PlayerTuple,
} from '../mocks/MockGameStateProvider.ts';

const FAUNA_WIGGLE_THRESHOLD = 5.0;
const FAUNA_CULL_DISTANCE = 100.0;
const CHARM_MAX_DISTANCE = 20.0;
const PICKUP_MAX_DISTANCE = 15.0;
const RAYCAST_THROTTLE_MS = 32;

export interface ItemAnchorData {
  pos: THREE.Vector3;
  type: string;
}

export class GameStateManager {
  public playerAnchors = new Map<string, THREE.Vector3>();
  public playerCharm = new Map<string, number>();
  public faunaAnchors = new Map<string, THREE.Vector3>();
  public faunaTargets = new Map<string, THREE.Vector3>();
  public mineralAnchors = new Map<string, THREE.Vector3>();
  public itemAnchors = new Map<string, ItemAnchorData>();
  public entities: EntityData[] = [];

  private interpMap = new Map<string, THREE.Vector3>();
  private lastHUDUpdate = 0;
  private cachedHUDData: {
    nearbyItem: { id: string; name: string } | null;
    hoveredItem: { id: string; name: string } | null;
  } = { nearbyItem: null, hoveredItem: null };

  constructor() {}

  public clearSectorState(): void {
    this.playerAnchors.clear();
    this.playerCharm.clear();
    this.faunaAnchors.clear();
    this.faunaTargets.clear();
    this.mineralAnchors.clear();
    this.itemAnchors.clear();
    this.entities.length = 0;
  }

  private stepFaunaVector(
    anch: THREE.Vector3,
    t: THREE.Vector3,
    dt: number,
  ): THREE.Vector3 {
    return t.add(
      new THREE.Vector3()
        .subVectors(anch, t)
        .normalize()
        .multiplyScalar(0.5 * dt),
    );
  }

  private stepFauna(
    anch: THREE.Vector3,
    t: THREE.Vector3,
    dt: number,
  ): THREE.Vector3 {
    if (t.distanceTo(anch) > FAUNA_WIGGLE_THRESHOLD) {
      return this.stepFaunaVector(anch, t, dt);
    }
    t.x += (Math.random() - 0.5) * 0.25 * dt;
    t.z += (Math.random() - 0.5) * 0.25 * dt;
    return t;
  }

  private getEntityPos(
    terrain: Terrain | null,
    pos: THREE.Vector3,
  ) {
    const cloned = pos.clone();
    if (terrain) {
      cloned.y = sampleTerrainHeight(terrain, cloned.x, cloned.z);
    }
    return cloned;
  }

  private pushEntity(
    id: string,
    type: EntityType,
    pos: THREE.Vector3,
    terrain: Terrain | null,
    charm = 0,
  ): void {
    this.entities.push({
      id,
      type,
      pos: this.getEntityPos(terrain, pos),
      char: '',
      charm,
    });
  }

  private findCharmTargets(
    avatar: any,
    provider: GameStateProvider,
  ) {
    return this.entities
      .filter((ent) => ent.id !== provider.playerId)
      .map((ent) => ({
        id: ent.id,
        dist: avatar.position.distanceTo(ent.pos),
      }))
      .filter((t) => t.dist <= CHARM_MAX_DISTANCE)
      .sort((a, b) => a.dist - b.dist);
  }

  public triggerCharmAction(
    avatar: any,
    provider: GameStateProvider | null,
  ): void {
    if (!provider || provider.phase !== 'gamein') return;
    const targets = this.findCharmTargets(avatar, provider);
    if (targets.length > 0) {
      provider.sendPlayerAction('charm', targets[0].id);
    }
  }

  private handleDropItem(
    id: string,
    avatar: any,
    provider: GameStateProvider | null,
  ): void {
    const fwd = avatar.getForwardVector();
    provider?.sendPlayerAction('drop_item', id, {
      x: fwd.x,
      y: fwd.y,
      z: fwd.z,
    });
  }

  public bindActionHUD(
    hud: any,
    avatar: any,
    getProvider: () => GameStateProvider | null,
  ): void {
    hud.setOnCharmClick(() =>
      this.triggerCharmAction(avatar, getProvider())
    );
    hud.setOnPickUpClick((id: string) =>
      getProvider()?.sendPlayerAction('pick_up', id)
    );
    hud.setOnDropClick((id: string) =>
      this.handleDropItem(id, avatar, getProvider())
    );
  }

  private isFaunaCulled(
    anch: THREE.Vector3,
    avatarPos?: THREE.Vector3,
  ): boolean {
    return Boolean(
      avatarPos && (
        anch.distanceTo(avatarPos) > FAUNA_CULL_DISTANCE
      ),
    );
  }

  public updateFauna(
    dt: number,
    avatarPos?: THREE.Vector3,
  ): Map<string, THREE.Vector3> {
    this.interpMap.clear();
    this.faunaAnchors.forEach((anch, id) => {
      if (this.isFaunaCulled(anch, avatarPos)) return;
      let t = this.faunaTargets.get(id);
      if (!t) {
        t = anch.clone();
        this.faunaTargets.set(id, t);
      }
      this.interpMap.set(id, this.stepFauna(anch, t, dt));
    });
    return this.interpMap;
  }

  public computeEntities(
    terrain: Terrain | null,
    interpolation?: Map<string, THREE.Vector3>,
  ): EntityData[] {
    this.entities.length = 0;
    this.playerAnchors.forEach((p, id) => {
      const charm = this.playerCharm.get(id) || 0;
      this.pushEntity(id, 'player', p, terrain, charm);
    });
    this.faunaAnchors.forEach((p, id) => {
      const pos = interpolation?.get(id) || p;
      this.pushEntity(id, 'fauna', pos, terrain);
    });
    this.mineralAnchors.forEach((p, id) =>
      this.pushEntity(id, 'mineral', p, terrain)
    );
    this.itemAnchors.forEach((d, id) =>
      this.pushEntity(
        id,
        `item_${d.type}` as EntityType,
        d.pos,
        terrain,
      )
    );
    return this.entities;
  }

  public updateEntitiesList(
    activeView: any,
    provider: GameStateProvider | null,
    interp?: Map<string, THREE.Vector3>,
  ): void {
    const ents = this.computeEntities(
      activeView?.terrainMesh,
      interp,
    );
    activeView?.updateEntities(
      ents,
      provider?.playerId || undefined,
    );
  }

  public syncPlayers(
    players: PlayerTuple[],
    hud: any,
    provider: GameStateProvider | null,
  ) {
    players.forEach(([id, x, _y, z, charm, inv]) => {
      this.playerAnchors.set(id, new THREE.Vector3(x, 1, z));
      if (charm !== undefined) this.playerCharm.set(id, charm);
      if (provider && id === provider.playerId) {
        hud.setCharmLevel(charm);
        if (inv) hud.setInventory(inv);
      }
    });
  }

  public handleInitState(gs: any, viewSet: any) {
    this.clearSectorState();
    if (gs.terrain) {
      viewSet.lidarView.updateTerrain(gs.terrain);
      viewSet.sphereView.updateTerrain(gs.terrain);
    }
    if (gs.fauna) {
      gs.fauna.forEach(([id, x, _y, z]: any) =>
        this.faunaAnchors.set(id, new THREE.Vector3(x, 1, z))
      );
    }
    if (gs.minerals) {
      gs.minerals.forEach((m: any) => {
        const p = new THREE.Vector3(m.position.x, 1, m.position.z);
        this.mineralAnchors.set(m.id, p);
      });
    }
  }

  public handleUpdateItems(items: any[]) {
    this.itemAnchors.clear();
    items.forEach((item: any) => {
      const p = new THREE.Vector3(
        item.position.x,
        1,
        item.position.z,
      );
      this.itemAnchors.set(item.id, { pos: p, type: item.type });
    });
  }

  private findNearbyItems(avatar: any) {
    return Array.from(this.itemAnchors.entries())
      .map(([id, data]) => ({
        id,
        dist: avatar.position.distanceTo(data.pos),
      }))
      .filter((i) => i.dist <= PICKUP_MAX_DISTANCE)
      .sort((a, b) => a.dist - b.dist);
  }

  public getHUDData(
    avatar: any,
    mouse: THREE.Vector2,
    activeView: any,
  ) {
    const now = performance.now();
    if (
      this.lastHUDUpdate > 0 &&
      now - this.lastHUDUpdate < RAYCAST_THROTTLE_MS
    ) {
      return this.cachedHUDData;
    }
    this.lastHUDUpdate = now;

    const nearby = this.findNearbyItems(avatar);
    const nearbyItem = nearby.length > 0
      ? {
        id: nearby[0].id,
        name: nearby[0].id.replace('item_', ''),
      }
      : null;

    let hoveredItem = null;
    if (activeView?.raycastEnabled) {
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mouse, activeView.camera);
      const hits = rc.intersectObjects(
        activeView.getInteractableObjects(),
        true,
      );
      for (const h of hits) {
        const d = h.object.userData;
        const isItem = d?.entityId &&
          (d.entityType as string).startsWith('item');
        if (isItem) {
          hoveredItem = {
            id: d.entityId,
            name: d.entityId.replace('item_', ''),
          };
          break;
        }
      }
    }

    this.cachedHUDData = { nearbyItem, hoveredItem };
    return this.cachedHUDData;
  }
}
