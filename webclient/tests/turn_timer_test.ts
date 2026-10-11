// turn_timer_test.ts
//
// Deno unit tests for TurnTimer UI element.
// Run: deno test webclient/tests/turn_timer_test.ts

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

class MockColor {
  constructor(public hex: number) {}
}

class MockVector3 {
  constructor(public x = 0, public y = 0, public z = 0) {}
  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

class MockMesh {
  visible = true;
  position = new MockVector3();
  constructor(public geo: any, public mat: any) {}
}

class MockShaderMaterial {
  uniforms: any;
  constructor(opts: any) {
    this.uniforms = opts.uniforms || {};
  }
}

class MockOrthographicCamera {
  position = new MockVector3();
  left = 0;
  right = 0;
  top = 0;
  bottom = 0;
  constructor(
    l: number,
    r: number,
    t: number,
    b: number,
    _near: number,
    _far: number,
  ) {
    this.left = l;
    this.right = r;
    this.top = t;
    this.bottom = b;
  }
  updateProjectionMatrix() {}
}

class MockScene {
  children: any[] = [];
  add(obj: any) {
    this.children.push(obj);
  }
}

(globalThis as any).THREE = {
  Scene: MockScene,
  OrthographicCamera: MockOrthographicCamera,
  ShaderMaterial: MockShaderMaterial,
  Mesh: MockMesh,
  RingGeometry: class {},
  PlaneGeometry: class {},
  Color: MockColor,
  DoubleSide: 2,
};

const { TurnTimer } = await import('../view/TurnTimer.ts');

Deno.test(
  'TurnTimer: constructor initializes mesh and camera',
  () => {
    const timer = new TurnTimer();
    assertExists(timer);
    assertEquals(timer.isTimerActive, false);
    assertEquals(timer.clockMesh.visible, false);
  },
);

Deno.test(
  'TurnTimer: startTimer activates timer and progress',
  () => {
    const timer = new TurnTimer();
    timer.startTimer(10000);
    assertEquals(timer.isTimerActive, true);
    assertEquals(timer.clockMesh.visible, true);
    assertEquals(timer.timerDuration, 10000);
    assertEquals(timer.clockMat.uniforms.uProgress.value, 1.0);
  },
);

Deno.test(
  'TurnTimer: update updates progress uniform',
  () => {
    const timer = new TurnTimer();
    timer.startTimer(10000);
    timer.timerStart = performance.now() - 2500;
    timer.update();
    assertEquals(timer.isTimerActive, true);
    assertEquals(timer.clockMat.uniforms.uProgress.value, 0.75);
  },
);

Deno.test(
  'TurnTimer: update loops when active or deactivates when interval is zero',
  () => {
    const timer = new TurnTimer();
    timer.startTimer(10000);
    timer.timerStart = performance.now() - 10001;
    timer.update();
    assertEquals(timer.isTimerActive, true);

    timer.setRules({ turnIntervalMs: 0 } as any);
    timer.startTimer(0);
    assertEquals(timer.isTimerActive, false);
    assertEquals(timer.clockMesh.visible, false);
  },
);

Deno.test(
  'TurnTimer: render executes render pass when active',
  () => {
    const timer = new TurnTimer();
    let renderCalled = false;
    let clearDepthCalled = false;
    const mockRenderer = {
      autoClear: true,
      clearDepth() {
        clearDepthCalled = true;
      },
      render() {
        renderCalled = true;
      },
    };

    timer.render(mockRenderer);
    assertEquals(renderCalled, false);

    timer.startTimer(5000);
    timer.render(mockRenderer);
    assertEquals(clearDepthCalled, true);
    assertEquals(renderCalled, true);
  },
);
