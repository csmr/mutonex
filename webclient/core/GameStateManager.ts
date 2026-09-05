// webclient/core/GameStateManager.ts
import "./global_types.ts";
import { GameStateProvider } from "./GameStateProvider.ts";
import { EntityData, EntityType } from "./types.ts";
import { sampleTerrainHeight } from "../render/TerrainMesh.ts";
import type {
  PlayerTuple
} from "../mocks/MockGameStateProvider.ts";

function stepFaunaVector(
  anch: THREE.Vector3,
  t: THREE.Vector3,
  dt: number
): THREE.Vector3 {
  return t.add(
    new THREE.Vector3()
      .subVectors(anch, t)
      .normalize()
      .multiplyScalar(0.5 * dt)
  );
}

function stepFauna(anch: any, t: any, dt: number): any {
  if (t.distanceTo(anch) > 5.0) {
    return stepFaunaVector(anch, t, dt);
  }
  t.x += (Math.random() - 0.5) * 0.25 * dt;
  t.z += (Math.random() - 0.5) * 0.25 * dt;
  return t;
}

function getEntityPos(terrain: any | null, pos: any) {
  const cloned = pos.clone();
  if (terrain) {
    cloned.y = sampleTerrainHeight(terrain, cloned.x, cloned.z);
  }
  return cloned;
}

function pushEntity(
  entities: EntityData[],
  id: string,
  type: EntityType,
  pos: any,
  terrain: any | null,
  charm = 0
): void {
  entities.push({
    id,
    type,
    pos: getEntityPos(terrain, pos),
    char: "",
    charm
  });
}

export class GameStateManager {
  public playerAnchors = new Map<string, any>();
  public playerCharm = new Map<string, number>();
  public faunaAnchors = new Map<string, any>();
  public faunaTargets = new Map<string, any>();
  public mineralAnchors = new Map<string, any>();
  public itemAnchors = new Map<string, any>();
  public entities: EntityData[] = [];

  constructor() {
    (window as any).itemAnchors = this.itemAnchors;
  }

  public updateFauna(dt: number): Map<string, any> {
    const interp = new Map<string, any>();
    this.faunaAnchors.forEach((anch, id) => {
      let t = this.faunaTargets.get(id);
      if (!t) {
        t = anch.clone();
        this.faunaTargets.set(id, t);
      }
      interp.set(id, stepFauna(anch, t, dt));
    });
    return interp;
  }

  public computeEntities(
    terrain: any | null,
    interpolation?: Map<string, any>
  ): EntityData[] {
    const ents: EntityData[] = [];
    this.playerAnchors.forEach((p, id) => {
      const charm = this.playerCharm.get(id) || 0;
      pushEntity(ents, id, "player", p, terrain, charm);
    });
    this.faunaAnchors.forEach((p, id) => {
      const pos = interpolation?.get(id) || p;
      pushEntity(ents, id, "fauna", pos, terrain);
    });
    this.mineralAnchors.forEach((p, id) =>
      pushEntity(ents, id, "mineral", p, terrain)
    );
    this.itemAnchors.forEach((d: any, id: string) =>
      pushEntity(
        ents, id, `item_${d.type}` as EntityType, d.pos, terrain
      )
    );
    return ents;
  }

  public updateEntitiesList(
    activeView: any,
    provider: GameStateProvider | null,
    interp?: Map<string, any>
  ): void {
    const newEnts = this.computeEntities(
      activeView?.terrainMesh, interp
    );
    this.entities.length = 0;
    this.entities.push(...newEnts);
    activeView?.updateEntities(
      this.entities, provider?.playerId || undefined
    );
  }

  public syncPlayers(
    players: PlayerTuple[],
    hud: any,
    provider: GameStateProvider | null
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
        item.position.x, 1, item.position.z
      );
      this.itemAnchors.set(item.id, { pos: p, type: item.type });
    });
  }

  public getHUDData(
    avatar: any,
    mouse: THREE.Vector2,
    activeView: any
  ) {
    const nearby = Array.from(this.itemAnchors.entries())
      .map(([id, data]: any) => ({
        id,
        dist: avatar.position.distanceTo(data.pos)
      }))
      .filter((i) => i.dist <= 15.0)
      .sort((a, b) => a.dist - b.dist);

    const nearbyItem = nearby.length > 0
      ? {
        id: nearby[0].id,
        name: nearby[0].id.replace("item_", "")
      }
      : null;

    let hoveredItem = null;
    if (activeView?.raycastEnabled) {
      const rc = new THREE.Raycaster();
      rc.setFromCamera(mouse, activeView.camera);
      const hits = rc.intersectObjects(
        activeView.getInteractableObjects(), true
      );
      for (const h of hits) {
        const d = h.object.userData;
        const isItem = d?.entityId &&
          (d.entityType as string).startsWith("item");
        if (isItem) {
          hoveredItem = {
            id: d.entityId,
            name: d.entityId.replace("item_", "")
          };
          break;
        }
      }
    }

    return { nearbyItem, hoveredItem };
  }
}
