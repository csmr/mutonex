// view_manager_test.ts
//
// Deno tests for ViewManager scope & visibility logic.
// Run: deno test webclient/tests/view_manager_test.ts

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

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
};

const { ViewManager } = await import(
  "../core/ViewManager.ts"
);

class MockView {
  scene = {};
  camera = {};
  isGlobeView = false;
  onActivate() {}
  onDeactivate() {}
  update() {}
  updateEntities() {}
  updateTerrain() {}
  getInteractableObjects() {
    return [];
  }
}

class MockLobby {
  visible = true;
  show() {
    this.visible = true;
  }
  hide() {
    this.visible = false;
  }
}

class MockHUD {
  visible = false;
  show() {
    this.visible = true;
  }
  hide() {
    this.visible = false;
  }
}

Deno.test(
  "ViewManager: constructor initializes renderer",
  () => {
    const canvas = {} as HTMLCanvasElement;
    const vm = new ViewManager(canvas);
    assertExists(vm);
  }
);

Deno.test(
  "ViewManager: getScope returns lobby when empty",
  () => {
    const canvas = {} as HTMLCanvasElement;
    const vm = new ViewManager(canvas);
    assertEquals(vm.getScope("lobby"), "lobby");
    assertEquals(vm.getScope("gamein"), "lobby");
  }
);

Deno.test(
  "ViewManager: getScope resolves local and globe scopes",
  () => {
    const canvas = {} as HTMLCanvasElement;
    const vm = new ViewManager(canvas);
    const view = new MockView();
    vm.setActiveView(view as any);

    assertEquals(vm.getScope("lobby"), "lobby");
    assertEquals(vm.getScope("gamein"), "game");

    view.isGlobeView = true;
    assertEquals(vm.getScope("gamein"), "globe");
  }
);

Deno.test(
  "ViewManager: updateHUDVisibility updates UI state",
  () => {
    const canvas = {} as HTMLCanvasElement;
    const vm = new ViewManager(canvas);
    const view = new MockView();
    const lobby = new MockLobby();
    const hud = new MockHUD();

    vm.setActiveView(view as any);

    vm.updateHUDVisibility("lobby", lobby, hud);
    assertEquals(lobby.visible, true);
    assertEquals(hud.visible, false);

    vm.updateHUDVisibility("gamein", lobby, hud);
    assertEquals(lobby.visible, false);
    assertEquals(hud.visible, true);

    view.isGlobeView = true;
    vm.updateHUDVisibility("gamein", lobby, hud);
    assertEquals(lobby.visible, false);
    assertEquals(hud.visible, false);
  }
);
