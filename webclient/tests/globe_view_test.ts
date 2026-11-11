// webclient/tests/globe_view_test.ts
import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';

class MockVector3 {
  constructor(
    public x = 0,
    public y = 0,
    public z = 0,
  ) {}
  copy(v: MockVector3) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
  }
  clone(): MockVector3 {
    return new MockVector3(this.x, this.y, this.z);
  }
  normalize(): this {
    const len = Math.sqrt(
      this.x * this.x + this.y * this.y + this.z * this.z,
    ) || 1;
    this.x /= len;
    this.y /= len;
    this.z /= len;
    return this;
  }
  subVectors(a: MockVector3, b: MockVector3): this {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
    this.z = a.z - b.z;
    return this;
  }
  crossVectors(a: MockVector3, b: MockVector3): this {
    const ax = a.x, ay = a.y, az = a.z;
    const bx = b.x, by = b.y, bz = b.z;
    this.x = ay * bz - az * by;
    this.y = az * bx - ax * bz;
    this.z = ax * by - ay * bx;
    return this;
  }
  multiplyScalar(s: number): this {
    this.x *= s;
    this.y *= s;
    this.z *= s;
    return this;
  }
}

class MockBufferAttribute {
  constructor(public array: any, public itemSize: number) {}
}

class MockColor {
  constructor(public val: any = 0) {}
  set(c: any) {
    this.val = c;
  }
}

class MockGroup {
  children: any[] = [];
  rotation = { x: 0, y: 0, z: 0 };
  position = new MockVector3();
  add(obj: any) {
    this.children.push(obj);
  }
  remove(obj: any) {
    const i = this.children.indexOf(obj);
    if (i >= 0) this.children.splice(i, 1);
  }
}

class MockScene extends MockGroup {
  background: any = null;
}

class MockBufferGeometry {
  points: any[] = [];
  static setFromPoints(pts: any[]) {
    const geo = new MockBufferGeometry();
    geo.points = pts;
    return geo;
  }
  setFromPoints(pts: any[]) {
    this.points = pts;
    return this;
  }
  dispose() {}
}

class MockMesh {
  position = new MockVector3();
  material: any;
  constructor(public geometry: any, material?: any) {
    this.material = material || { color: new MockColor() };
  }
  lookAt(_pos: any) {}
}

class MockOrbitControls {
  enableDamping = false;
  dampingFactor = 0;
  enablePan = false;
  minDistance = 0;
  maxDistance = 0;
  autoRotate = false;
  autoRotateSpeed = 0;
  update() {}
  dispose() {}
}

// Attach Mock THREE
(globalThis as any).THREE = {
  Scene: MockScene,
  Group: MockGroup,
  PerspectiveCamera: class {
    position = new MockVector3();
    aspect = 1;
    updateProjectionMatrix() {}
  },
  OrbitControls: MockOrbitControls,
  SphereGeometry: MockBufferGeometry,
  BoxGeometry: MockBufferGeometry,
  BufferGeometry: MockBufferGeometry,
  MeshBasicMaterial: class {
    color: MockColor;
    constructor(opts: any = {}) {
      this.color = new MockColor(opts.color);
    }
  },
  LineBasicMaterial: class {
    constructor(public opts: any = {}) {}
  },
  Mesh: MockMesh,
  Line: class {
    constructor(public geometry: any, public material: any) {}
  },
  Color: MockColor,
  Vector3: MockVector3,
};

(globalThis as any).document = {
  createElement: (_tag: string) => {
    return {
      style: {},
      appendChild: () => {},
      removeChild: () => {},
      insertRow: () => ({
        insertCell: () => ({ style: {}, textContent: '' }),
      }),
    };
  },
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
};

(globalThis as any).window = {
  innerWidth: 1024,
  innerHeight: 768,
  addEventListener: () => {},
  removeEventListener: () => {},
};

import {
  GlobeView,
  GLOBE_RADIUS,
  OUTLINE_COLOR,
  OUTLINE_HALO_COLOR,
  GRID_COLOR,
} from '../view/GlobeView.ts';

Deno.test('GlobeView: initializes scene and constants', () => {
  const dom = {} as any;
  const view = new GlobeView({}, dom);
  assertExists(view.scene);
  assertExists(view.camera);
  assertExists(view.globeGroup);
  assertEquals(GLOBE_RADIUS, 5);
  assertEquals(OUTLINE_COLOR, 0x00ff00);
  assertEquals(OUTLINE_HALO_COLOR, 0x0088aa);
  assertEquals(GRID_COLOR, 0x00ff00);
  view.dispose();
});

Deno.test('GlobeView: tempToColorVal maps thresholds', () => {
  const dom = {} as any;
  const view = new GlobeView({}, dom);
  assertEquals(view.tempToColorVal(-5), 0x00ffff);
  assertEquals(view.tempToColorVal(5), 0x00ff00);
  assertEquals(view.tempToColorVal(15), 0xffff00);
  assertEquals(view.tempToColorVal(30), 0xff0000);
  view.dispose();
});

Deno.test('GlobeView: lonLatToVector3 computes pos', () => {
  const dom = {} as any;
  const view = new GlobeView({}, dom);
  const vec = view.lonLatToVector3(0, 0, 5);
  assertExists(vec);
  assertEquals(typeof vec.x, 'number');
  assertEquals(typeof vec.y, 'number');
  assertEquals(typeof vec.z, 'number');
  view.dispose();
});

Deno.test('GlobeView: target sector marker lifecycle', () => {
  const dom = {} as any;
  const view = new GlobeView({}, dom);
  view.diagEnabled = true;
  view.weatherData = {
    history: [
      {
        year: 2026,
        months: [
          { month: 1, temp: -2, pressure: 1013, insolation: 200 },
          { month: 7, temp: 26, pressure: 1010, insolation: 800 },
        ],
      },
    ],
  };
  view.updateTargetSectorMarker();
  assertExists(view.targetSectorMesh);
  view.clearTargetSectorMesh();
  assertEquals(view.targetSectorMesh, null);
  view.dispose();
});

Deno.test('GlobeView: rotate steps rotation angles', () => {
  const dom = {} as any;
  const view = new GlobeView({}, dom);
  const rotX = view.globeGroup.rotation.x;
  const rotY = view.globeGroup.rotation.y;
  view.rotate('up');
  assertEquals(view.globeGroup.rotation.x, rotX - 0.05);
  view.rotate('left');
  assertEquals(view.globeGroup.rotation.y, rotY - 0.05);
  view.dispose();
});

Deno.test('GlobeView: appendRibbonQuads builds quads', () => {
  const dom = {} as any;
  const view = new GlobeView({}, dom);
  const ring = [
    [0, 0],
    [10, 0],
  ];
  const target: number[] = [];
  view.appendRibbonQuads(ring, 5.0, 0.02, target);
  assertEquals(target.length, 18);
});
