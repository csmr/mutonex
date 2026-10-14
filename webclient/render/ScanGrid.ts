import { LidarStyleConfig } from './LidarStyles.ts';

export class ScanGrid {
  public lidarPoints: any = null;
  private isRebuilding = false;
  private pendingConfig: LidarStyleConfig | null = null;
  private scene: any;
  private lidarMaterial: any;

  constructor(scene: any, lidarMaterial: any) {
    this.scene = scene;
    this.lidarMaterial = lidarMaterial;
  }

  public setMaterial(material: any) {
    this.lidarMaterial = material;
    if (this.lidarPoints) {
      this.lidarPoints.material = material;
    }
  }

  public rebuild(config: LidarStyleConfig) {
    if (this.isRebuilding) {
      this.pendingConfig = config;
      return;
    }

    this.isRebuilding = true;
    this.pendingConfig = null;

    const gen = this.chunkedGeometryGenerator(
      config.samplesH,
      config.samplesV,
    );

    const processChunk = () => {
      const result = gen.next();
      if (!result.done) {
        requestAnimationFrame(processChunk);
      } else {
        this.isRebuilding = false;
        if (this.lidarPoints) {
          this.scene.remove(this.lidarPoints);
          this.lidarPoints.geometry.dispose();
        }
        this.lidarPoints = result.value as any;
        this.scene.add(this.lidarPoints);
        if (this.pendingConfig) {
          const next = this.pendingConfig;
          this.pendingConfig = null;
          this.rebuild(next);
        }
      }
    };

    requestAnimationFrame(processChunk);
  }

  private *chunkedGeometryGenerator(
    samplesH: number,
    samplesV: number,
  ): Generator<void, any, void> {
    const geometry = new THREE.BufferGeometry();
    const totalPoints = samplesH * samplesV;
    const positions = new Float32Array(totalPoints * 3);
    const uvs = new Float32Array(totalPoints * 2);

    const chunkSize = 50000;
    let currentIdx = 0;

    for (let y = 0; y < samplesV; y++) {
      for (let x = 0; x < samplesH; x++) {
        uvs[currentIdx * 2] = x / (samplesH - 1);
        uvs[currentIdx * 2 + 1] = y / (samplesV - 1);
        currentIdx++;
        if (currentIdx % chunkSize === 0) yield;
      }
    }

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const points = new THREE.Points(geometry, this.lidarMaterial);
    points.frustumCulled = false;
    return points;
  }

  public setVisible(visible: boolean) {
    if (this.lidarPoints) {
      this.lidarPoints.visible = visible;
    }
  }

  public dispose() {
    if (this.lidarPoints) {
      this.scene.remove(this.lidarPoints);
      if (this.lidarPoints.geometry) {
        this.lidarPoints.geometry.dispose();
      }
      this.lidarPoints = null;
    }
  }
}
