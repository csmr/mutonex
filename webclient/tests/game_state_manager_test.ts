// game_state_manager_test.ts
//
// Deno tests for GameStateManager charm & HUD bindings.
// Run: deno test webclient/tests/game_state_manager_test.ts

import {
  assertEquals,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

(globalThis as any).window = {
  ...(globalThis as any).window || {},
  addEventListener() {},
  removeEventListener() {},
};

const { GameStateManager } = await import(
  '../core/GameStateManager.ts'
);

class MockVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}
  distanceTo(v: MockVector3) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}

class MockAvatar {
  position = new MockVector3(0, 0, 0);
  getForwardVector() {
    return new MockVector3(0, 0, 1);
  }
}

class MockProvider {
  phase = 'gamein';
  playerId = 'player_local';
  lastAction: any = null;

  sendPlayerAction(
    act: string,
    targetId: string,
    payload?: any,
  ) {
    this.lastAction = { act, targetId, payload };
  }
}

class MockActionHUD {
  charmCb: any = null;
  pickUpCb: any = null;
  dropCb: any = null;

  setOnCharmClick(cb: any) {
    this.charmCb = cb;
  }
  setOnPickUpClick(cb: any) {
    this.pickUpCb = cb;
  }
  setOnDropClick(cb: any) {
    this.dropCb = cb;
  }
}

Deno.test(
  'GameStateManager: triggerCharmAction targets nearest',
  () => {
    const gsm = new GameStateManager();
    const avatar = new MockAvatar();
    const provider = new MockProvider();

    gsm.entities = [
      {
        id: 'player_local',
        type: 'player',
        pos: new MockVector3(0, 0, 0) as any,
        char: '',
        charm: 0,
      },
      {
        id: 'p2',
        type: 'player',
        pos: new MockVector3(5, 0, 0) as any,
        char: '',
        charm: 0,
      },
      {
        id: 'p3',
        type: 'player',
        pos: new MockVector3(2, 0, 0) as any,
        char: '',
        charm: 0,
      },
    ];

    gsm.triggerCharmAction(avatar, provider as any);
    assertEquals(provider.lastAction.act, 'charm');
    assertEquals(provider.lastAction.targetId, 'p3');
  },
);

Deno.test(
  'GameStateManager: bindActionHUD attaches callbacks',
  () => {
    const gsm = new GameStateManager();
    const avatar = new MockAvatar();
    const provider = new MockProvider();
    const hud = new MockActionHUD();

    gsm.entities = [
      {
        id: 'p2',
        type: 'player',
        pos: new MockVector3(3, 0, 0) as any,
        char: '',
        charm: 0,
      },
    ];

    gsm.bindActionHUD(
      hud as any,
      avatar as any,
      () => provider as any,
    );

    hud.charmCb();
    assertEquals(provider.lastAction.act, 'charm');
    assertEquals(provider.lastAction.targetId, 'p2');

    hud.pickUpCb('item_1');
    assertEquals(provider.lastAction.act, 'pick_up');
    assertEquals(provider.lastAction.targetId, 'item_1');

    hud.dropCb('item_2');
    assertEquals(provider.lastAction.act, 'drop_item');
    assertEquals(provider.lastAction.targetId, 'item_2');
    assertEquals(
      provider.lastAction.payload,
      { x: 0, y: 0, z: 1 },
    );
  },
);
