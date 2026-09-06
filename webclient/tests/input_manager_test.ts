// input_manager_test.ts
//
// Deno tests for InputManager context switching & UI sync.
// Run: deno test webclient/tests/input_manager_test.ts

import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

(globalThis as any).window = {
  ...(globalThis as any).window || {},
  addEventListener() {},
  removeEventListener() {},
  innerWidth: 1024,
  innerHeight: 768,
  devicePixelRatio: 1,
};

(globalThis as any).THREE = {
  WebGLRenderer: class {
    setSize() {}
    setPixelRatio() {}
    render() {}
  },
  Clock: class {
    getDelta() {
      return 0.016;
    }
  },
  Vector2: class {
    constructor(public x = 0, public y = 0) {}
  },
};

const { InputManager } = await import(
  '../input/InputManager.ts'
);

class MockViewManager {
  activeScope = 'lobby';
  updatedPhase = '';

  getScope(phase: string) {
    return phase === 'gamein' ? 'game' : 'lobby';
  }

  updateHUDVisibility(phase: string) {
    this.updatedPhase = phase;
  }
}

Deno.test(
  'InputManager: constructor initializes handlers',
  () => {
    const vm = new MockViewManager();
    const viewSet = { viewManager: vm } as any;
    const inputMgr = new InputManager(
      viewSet,
      () => null,
      {} as any,
      {} as any,
      () => {},
    );
    assertExists(inputMgr);
  },
);

Deno.test(
  'InputManager: syncUI updates context key and UI',
  () => {
    const vm = new MockViewManager();
    const viewSet = { viewManager: vm } as any;
    const lobby = {} as any;
    const hud = {} as any;

    const inputMgr = new InputManager(
      viewSet,
      () => null,
      lobby,
      hud,
      () => {},
    );

    const key = inputMgr.syncUI(vm as any, null);
    assertEquals(key, 'lobby:local');
    assertEquals(vm.updatedPhase, 'lobby');
  },
);

Deno.test(
  'InputManager: syncUI preserves pressedActions when scope stays same',
  () => {
    const vm = new MockViewManager();
    const viewSet = { viewManager: vm } as any;
    const provider = { phase: 'gamein' } as any;

    const inputMgr = new InputManager(
      viewSet,
      () => provider,
      {} as any,
      {} as any,
      () => {},
    );

    inputMgr.syncUI(vm as any, provider);
    inputMgr.pressedActions.add('move_fwd');
    assertEquals(inputMgr.isActionPressed('move_fwd'), true);

    // Re-sync UI without scope change
    inputMgr.syncUI(vm as any, provider);
    assertEquals(
      inputMgr.isActionPressed('move_fwd'),
      true,
      'pressedActions should persist across syncUI',
    );
  },
);

Deno.test(
  'InputManager: movement handler ignores keypress events',
  () => {
    const vm = new MockViewManager();
    const viewSet = { viewManager: vm } as any;
    const inputMgr = new InputManager(
      viewSet,
      () => null,
      {} as any,
      {} as any,
      () => {},
    );

    const handler = inputMgr.handlers.get('move_fwd');
    assertExists(handler);

    // Keydown adds action
    handler({} as any, { type: 'keydown' } as KeyboardEvent);
    assertEquals(inputMgr.isActionPressed('move_fwd'), true);

    // Keypress must NOT remove action
    handler({} as any, { type: 'keypress' } as KeyboardEvent);
    assertEquals(
      inputMgr.isActionPressed('move_fwd'),
      true,
      'keypress should not delete action',
    );

    // Keyup removes action
    handler({} as any, { type: 'keyup' } as KeyboardEvent);
    assertEquals(inputMgr.isActionPressed('move_fwd'), false);
  },
);
