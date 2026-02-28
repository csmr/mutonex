// lidar_view_test.ts
//
// Standalone Deno unit tests for LidarView.
// Mocks THREE globals so tests run without
// a browser or WebGL context.
//
// Run:  deno test src/webclient/tests/lidar_view_test.ts

import {
    assertEquals,
    assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

// ── THREE mock ──────────────────────────────
// Minimal stubs matching the Three.js API
// surface actually used by LidarView.

class MockVector2 {
    x: number; y: number;
    constructor(x = 0, y = 0) {
        this.x = x; this.y = y;
    }
    set(x: number, y: number) {
        this.x = x; this.y = y;
    }
}

class MockVector3 {
    x: number; y: number; z: number;
    constructor(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
    }
    set(x: number, y: number, z: number) {
        this.x = x; this.y = y; this.z = z;
    }
    copy(v: MockVector3) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
    }
}

class MockMatrix4 {
    copy(_m: MockMatrix4) { return this; }
}

class MockColor {
    constructor(public hex: number) { }
}

class MockScene {
    children: any[] = [];
    background: any = null;
    overrideMaterial: any = null;
    add(obj: any) {
        this.children.push(obj);
    }
    remove(obj: any) {
        const idx = this.children.indexOf(obj);
        if (idx >= 0) this.children.splice(idx, 1);
    }
    updateMatrixWorld(_force?: boolean) { }
}

class MockPerspectiveCamera {
    near = 0.1; far = 1000; aspect = 1;
    position = new MockVector3();
    matrixWorld = new MockMatrix4();
    projectionMatrixInverse = new MockMatrix4();
    updateProjectionMatrix() { }
}

class MockOrbitControls {
    enableDamping = false;
    autoRotate = false;
    target = new MockVector3();
    update() { }
}

function mockGeometry() {
    const attrs: Record<string, any> = {};
    return {
        type: 'BoxGeometry',
        setAttribute(name: string, val: any) {
            attrs[name] = val;
        },
        getAttribute(name: string) {
            return attrs[name];
        },
        dispose() { },
    };
}

class MockMesh {
    position = new MockVector3();
    rotation = { x: 0, y: 0, z: 0 };
    geometry: any;
    material: any;
    constructor(geo?: any, mat?: any) {
        this.geometry = geo || mockGeometry();
        this.material = mat || {};
    }
}

class MockPoints {
    frustumCulled = true;
    geometry: any;
    material: any;
    constructor(geo: any, mat: any) {
        this.geometry = geo;
        this.material = mat;
    }
}

// Install minimal THREE global stub.
const THREE_MOCK: any = {
    Scene: MockScene,
    Color: MockColor,
    Vector2: MockVector2,
    Vector3: MockVector3,
    Matrix4: MockMatrix4,
    PerspectiveCamera: MockPerspectiveCamera,
    Clock: class { getDelta() { return 0.016; } },
    OrbitControls: MockOrbitControls,
    BufferGeometry: class {
        attributes: Record<string, any> = {};
        setAttribute(n: string, v: any) {
            this.attributes[n] = v;
        }
        dispose() { }
    },
    Float32BufferAttribute: class {
        constructor(
            public array: number[],
            public itemSize: number,
        ) { }
    },
    Points: MockPoints,
    Mesh: MockMesh,
    BoxGeometry: class {
        type = 'BoxGeometry';
        dispose() { }
    },
    SphereGeometry: class {
        type = 'SphereGeometry';
        dispose() { }
    },
    PlaneGeometry: class {
        rotation: any = { x: 0 };
        dispose() { }
    },
    MeshBasicMaterial: class {
        constructor(public opts?: any) { }
    },
    ShaderMaterial: class {
        uniforms: any;
        constructor(opts: any) {
            this.uniforms = opts?.uniforms || {};
        }
    },
    WebGLRenderTarget: class {
        texture = {};
        setSize() { }
        constructor() { }
    },
    BufferGeometryLoader: class {
        load(
            _url: string,
            onLoad: (g: any) => void,
        ) {
            // Simulate async load completion
            setTimeout(
                () => onLoad(mockGeometry()),
                0,
            );
        }
    },
    NearestFilter: 1,
    RGBAFormat: 1,
    FloatType: 1,
    AdditiveBlending: 1,
};

// Inject globals before importing LidarView.
(globalThis as any).THREE = THREE_MOCK;
(globalThis as any).window = {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: () => { },
    removeEventListener: () => { },
    // Fake OrbitControls via THREE global
    THREE: { OrbitControls: MockOrbitControls },
};

// Import after globals are ready.
const { LidarView } = await import(
    "../LidarView.ts"
);

// ── Tests ───────────────────────────────────

Deno.test(
    "LidarView: constructor creates scene " +
    "and camera",
    () => {
        const canvas = {} as HTMLCanvasElement;
        const lv = new LidarView(canvas);
        assertExists(lv.scene);
        assertExists(lv.camera);
        assertExists(lv.controls);
    },
);

Deno.test(
    "LidarView: setScanMode vertical sets " +
    "correct uniform",
    () => {
        const canvas = {} as HTMLCanvasElement;
        const lv = new LidarView(canvas);
        lv.setScanMode("vertical");
        assertEquals(lv.currentMode, "vertical");
        const u = (lv as any).lidarMaterial
            .uniforms;
        assertEquals(u.scanMode.value, 0.0);
    },
);

Deno.test(
    "LidarView: setScanMode horizontal sets " +
    "correct uniform",
    () => {
        const canvas = {} as HTMLCanvasElement;
        const lv = new LidarView(canvas);
        lv.setScanMode("horizontal");
        assertEquals(lv.currentMode, "horizontal");
        const u = (lv as any).lidarMaterial
            .uniforms;
        assertEquals(u.scanMode.value, 1.0);
    },
);

Deno.test({
    name:
        "LidarView: updateEntities adds " +
        "and removes virtual meshes",
    sanitizeOps: false,
    sanitizeResources: false,
    fn() {
        const canvas = {} as HTMLCanvasElement;
        const lv = new LidarView(canvas);

        // Add two entities
        const entities = [
            {
                id: "a1",
                type: "player" as const,
                pos: new MockVector3(1, 0, 1),
                char: "🧙",
            },
            {
                id: "b2",
                type: "fauna" as const,
                pos: new MockVector3(5, 0, 5),
                char: "🦗",
            },
        ];
        lv.updateEntities(entities);

        const vm = (lv as any).virtualMeshes;
        assertEquals(vm.size, 2);
        assertEquals(vm.has("a1"), true);
        assertEquals(vm.has("b2"), true);

        // Remove one entity
        lv.updateEntities([entities[0]]);
        assertEquals(vm.size, 1);
        assertEquals(vm.has("a1"), true);
        assertEquals(vm.has("b2"), false);
    },
});

Deno.test({
    name:
        "LidarView: updateEntities updates " +
        "mesh position",
    sanitizeOps: false,
    sanitizeResources: false,
    fn() {
        const canvas = {} as HTMLCanvasElement;
        const lv = new LidarView(canvas);

        const pos1 = new MockVector3(1, 0, 1);
        lv.updateEntities([
            {
                id: "x1",
                type: "unit" as const,
                pos: pos1,
                char: "🤖",
            },
        ]);

        const mesh = (lv as any).virtualMeshes
            .get("x1");
        assertEquals(mesh.position.x, 1);
        assertEquals(mesh.position.z, 1);

        // Update position
        const pos2 = new MockVector3(10, 0, 10);
        lv.updateEntities([
            {
                id: "x1",
                type: "unit" as const,
                pos: pos2,
                char: "🤖",
            },
        ]);
        assertEquals(mesh.position.x, 10);
        assertEquals(mesh.position.z, 10);
    },
});

Deno.test(
    "LidarView: entropy clamped by update",
    () => {
        const canvas = {} as HTMLCanvasElement;
        const lv = new LidarView(canvas);
        lv.entropy = 0.5;
        lv.update(0.016);
        const u = (lv as any).lidarMaterial
            .uniforms;
        assertEquals(u.entropy.value, 0.5);
    },
);
