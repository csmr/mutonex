import {
  NormalMeshFragmentShader,
  NormalMeshVertexShader,
  OutlineFragmentShader,
  OutlineVertexShader,
} from './LidarShaders.ts';
import { OutlineConfig } from './LidarStyles.ts';

export class OutlinePass {
  public renderTarget: any;
  public normalRenderTarget: any;
  public outlineMaterial: any;
  public outlineMesh: any;
  private normalMaterial: any;

  constructor(cameraFar: number, defaultOutline?: OutlineConfig) {
    this.initRenderTargets();

    this.normalMaterial = new THREE.ShaderMaterial({
      uniforms: { far: { value: cameraFar } },
      vertexShader: NormalMeshVertexShader,
      fragmentShader: NormalMeshFragmentShader,
    });

    this.outlineMaterial = this.createOutlineMaterial(
      cameraFar,
      defaultOutline,
    );
    this.initOutlineQuad();
  }

  private initRenderTargets() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const opts = {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    };
    this.renderTarget = new THREE.WebGLRenderTarget(w, h, opts);
    this.normalRenderTarget = new THREE.WebGLRenderTarget(
      w,
      h,
      opts,
    );
  }

  private createOutlineMaterial(
    cameraFar: number,
    cfg?: OutlineConfig,
  ): any {
    const res = new THREE.Vector2(
      window.innerWidth,
      window.innerHeight,
    );
    return new THREE.ShaderMaterial({
      uniforms: {
        tScene: { value: null },
        tNormal: { value: null },
        resolution: { value: res },
        minWidth: { value: cfg?.minWidth ?? 1.0 },
        maxWidth: { value: cfg?.maxWidth ?? 15.0 },
        far: { value: cameraFar },
        shadeMode: { value: cfg?.shadeMode ?? 0.0 },
        nearEdgeColor: {
          value: new THREE.Color(
            cfg?.nearEdgeColor ?? '#b24d00',
          ),
        },
        farEdgeColor: {
          value: new THREE.Color(
            cfg?.farEdgeColor ?? '#000000',
          ),
        },
        gapMeters: { value: cfg?.gapMeters ?? 0.5 },
        outlineDebug: { value: 0.0 },
      },
      vertexShader: OutlineVertexShader,
      fragmentShader: OutlineFragmentShader,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });
  }

  private initOutlineQuad(): void {
    const geo = new THREE.PlaneGeometry(2, 2);
    this.outlineMesh = new THREE.Mesh(geo, this.outlineMaterial);
    this.outlineMesh.frustumCulled = false;
  }

  public updateUniforms(cfg?: OutlineConfig): void {
    if (!this.outlineMaterial || !cfg) return;
    const u = this.outlineMaterial.uniforms;
    u.minWidth.value = cfg.minWidth ?? 1.0;
    u.maxWidth.value = cfg.maxWidth ?? 15.0;
    u.shadeMode.value = cfg.shadeMode ?? 0.0;
    if (u.nearEdgeColor?.value?.set) {
      u.nearEdgeColor.value.set(cfg.nearEdgeColor ?? '#b24d00');
    }
    if (u.farEdgeColor?.value?.set) {
      u.farEdgeColor.value.set(cfg.farEdgeColor ?? '#000000');
    }
    u.gapMeters.value = cfg.gapMeters ?? 0.5;
  }

  public cycleShaderMode(): void {
    if (!this.outlineMaterial) return;
    const u = this.outlineMaterial.uniforms;
    const cur = u.shadeMode.value;
    const next = cur > 0.5 ? 0.0 : 1.0;
    u.shadeMode.value = next;
    const modeName = next > 0.5 ? 'World Normal' : 'Screen Space';
    console.log(`OutlinePass shadeMode toggled to: ${modeName}`);
  }

  public adjustGapMeters(delta: number): void {
    if (!this.outlineMaterial) return;
    const u = this.outlineMaterial.uniforms;
    const current = u.gapMeters.value || 0.5;
    const nextVal = Math.max(0.05, current + delta);
    u.gapMeters.value = Number(nextVal.toFixed(2));
    console.log(
      `OutlinePass gapMeters set to: ${u.gapMeters.value}`,
    );
  }

  public preRender(
    renderer: any,
    virtualScene: any,
    camera: any,
  ): void {
    const currentRT = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.setClearColor(0x000000, 1.0);
    renderer.clear();

    const prevBg = virtualScene.background;
    virtualScene.background = null;
    renderer.render(virtualScene, camera);

    renderer.setRenderTarget(this.normalRenderTarget);
    renderer.clear();
    virtualScene.overrideMaterial = this.normalMaterial;
    renderer.render(virtualScene, camera);
    virtualScene.overrideMaterial = null;

    virtualScene.background = prevBg;
    renderer.setRenderTarget(currentRT);

    if (this.outlineMaterial) {
      const u = this.outlineMaterial.uniforms;
      u.tScene.value = this.renderTarget.texture;
      u.tNormal.value = this.normalRenderTarget.texture;
      u.far.value = camera.far;
    }
  }

  public postRender(renderer: any, camera: any): void {
    if (this.outlineMesh) {
      const prevAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.render(this.outlineMesh, camera);
      renderer.autoClear = prevAutoClear;
    }
  }

  public setSize(w: number, h: number): void {
    this.renderTarget.setSize(w, h);
    this.normalRenderTarget.setSize(w, h);
    if (this.outlineMaterial) {
      this.outlineMaterial.uniforms.resolution.value.set(w, h);
    }
  }

  public dispose(): void {
    if (this.renderTarget) this.renderTarget.dispose();
    if (this.normalRenderTarget) this.normalRenderTarget.dispose();
    if (this.outlineMesh?.geometry) {
      this.outlineMesh.geometry.dispose();
    }
  }
}
