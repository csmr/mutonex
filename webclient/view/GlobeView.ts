// webclient/view/GlobeView.ts
import { IView } from '../core/ViewManager.ts';
import {
  GameState,
  Unit,
} from '../mocks/MockGameStateProvider.ts';
import { EntityData, Terrain } from '../core/types.ts';

export const GLOBE_RADIUS = 5;
export const UNIT_RADIUS = 0.05;
export const OUTLINE_COLOR = 0x00ff00;
export const OUTLINE_HALO_COLOR = 0x0088aa;
export const OUTLINE_HALO_OPACITY = 0.5;
export const GRID_COLOR = 0x00ff00;
export const TARGET_SECTOR_SIZE = 0.6;

declare const THREE: typeof import('three');

/**
 * 3D globe view: cyber-noir outlines & weather diag.
 */
export class GlobeView implements IView {
  public scene: any;
  public camera: any;
  public isGlobeView = true;
  public raycastEnabled = false;
  public controls: any;
  public globeGroup: any;
  public unitMeshes: Record<string, any> = {};
  public sectorMeshes: Record<string, any> = {};
  public playerColors: Record<string, any> = {};

  public diagEnabled = false;
  public diagOverlay: HTMLElement | null = null;
  public targetSectorMesh: any = null;
  public currentLat = 60;
  public currentLon = 20;
  public weatherData: any = null;

  constructor(_geoData: any, domElement: HTMLCanvasElement) {
    this.initScene(domElement);
    this.loadOutlines();
    this.drawGrid();
  }

  private initScene(domElement: HTMLCanvasElement): void {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);
    this.initPlayerColors();
    this.camera = this.createCamera();
    this.controls = this.createControls(domElement);
    this.globeGroup = new THREE.Group();
    this.scene.add(this.globeGroup);
    this.globeGroup.add(this.createSphereMesh());
  }

  private initPlayerColors(): void {
    this.playerColors['Player1'] = new THREE.Color(0x00ff00);
    this.playerColors['Player2'] = new THREE.Color(0xff00ff);
  }

  private createCamera(): any {
    const cam = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    cam.position.z = 15;
    return cam;
  }

  private createControls(domElement: HTMLCanvasElement): any {
    const c = new THREE.OrbitControls(this.camera, domElement);
    c.enableDamping = true;
    c.dampingFactor = 0.05;
    c.enablePan = false;
    c.minDistance = 7;
    c.maxDistance = 30;
    this.configureOrbitSpeed(c);
    return c;
  }

  private configureOrbitSpeed(c: any): void {
    c.autoRotate = true;
    c.autoRotateSpeed = 0.2;
  }

  private createSphereMesh(): any {
    const geo = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0a0a0a,
      transparent: true,
      opacity: 0.92,
    });
    return new THREE.Mesh(geo, mat);
  }

  public setDiagMode(enabled: boolean): void {
    this.diagEnabled = enabled;
    if (enabled) {
      this.showDiagOverlay();
      this.fetchWeatherData();
      return;
    }
    this.hideDiagOverlay();
    this.clearTargetSectorMesh();
  }

  public async loadOutlines(): Promise<void> {
    try {
      const resp = await fetch('/assets/countries.geo.json');
      const data = await resp.json();
      this.drawFeatures(data.features);
    } catch (e) {
      console.error('[GlobeView] Outlines failed', e);
    }
  }

  public async fetchWeatherData(): Promise<void> {
    try {
      const resp = await fetch(this.getWeatherUrl());
      this.weatherData = await resp.json();
      this.updateDiagUI();
      this.updateTargetSectorMarker();
    } catch (e) {
      console.error('[GlobeView] Weather fetch failed', e);
    }
  }

  private getWeatherUrl(): string {
    const lat = this.currentLat;
    const lon = this.currentLon;
    return `/weather-history?lat=${lat}&lon=${lon}`;
  }

  public showDiagOverlay(): void {
    if (this.diagOverlay) return;
    this.diagOverlay = document.createElement('div');
    this.diagOverlay.id = 'globe-diag-overlay';
    this.applyOverlayBoxStyles(this.diagOverlay);
    this.applyOverlayFontStyles(this.diagOverlay);
    document.body.appendChild(this.diagOverlay);
    this.updateDiagUI();
  }

  private applyOverlayBoxStyles(el: HTMLElement): void {
    el.style.position = 'absolute';
    el.style.top = '0';
    el.style.left = '0';
    el.style.width = '25%';
    el.style.height = '100%';
    el.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    el.style.padding = '20px';
    el.style.overflowY = 'auto';
  }

  private applyOverlayFontStyles(el: HTMLElement): void {
    el.style.color = '#00ff00';
    el.style.fontFamily = "'Courier New', Courier, monospace";
    el.style.fontSize = '16px';
    el.style.textShadow = '2px 2px #000000';
    el.style.zIndex = '1000';
  }

  public hideDiagOverlay(): void {
    if (this.diagOverlay) {
      document.body.removeChild(this.diagOverlay);
      this.diagOverlay = null;
    }
  }

  public updateDiagUI(): void {
    if (!this.diagOverlay) return;
    this.diagOverlay.innerHTML = '';
    this.appendDiagTitle();
    this.diagOverlay.appendChild(this.createSectorSelector());
    if (this.weatherData?.history) {
      this.renderWeatherHistory(this.weatherData.history);
    }
  }

  private appendDiagTitle(): void {
    const title = document.createElement('h2');
    title.textContent = 'WEATHER TESTING FACILITY';
    title.style.borderBottom = '2px solid #00ff00';
    this.diagOverlay?.appendChild(title);
  }

  private createNavBtn(
    text: string,
    delta: number,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    this.styleNavBtn(btn);
    btn.onclick = () => {
      this.currentLon += delta;
      this.fetchWeatherData();
    };
    return btn;
  }

  private styleNavBtn(btn: HTMLButtonElement): void {
    btn.style.background = 'none';
    btn.style.color = '#00ff00';
    btn.style.border = '1px solid #00ff00';
    btn.style.padding = '5px 10px';
    btn.style.cursor = 'pointer';
  }

  private createSectorSelector(): HTMLElement {
    const sel = document.createElement('div');
    this.styleSectorSelector(sel);
    const span = this.createSectorLabel();
    sel.appendChild(this.createNavBtn('◀', -10));
    sel.appendChild(span);
    sel.appendChild(this.createNavBtn('▶', 10));
    return sel;
  }

  private createSectorLabel(): HTMLElement {
    const text = document.createElement('span');
    const lat = this.currentLat;
    const lon = this.currentLon;
    text.textContent = `LAT ${lat} ` + `LON ${lon}`;
    return text;
  }

  private styleSectorSelector(sel: HTMLElement): void {
    sel.style.display = 'flex';
    sel.style.justifyContent = 'space-between';
    sel.style.alignItems = 'center';
    sel.style.marginBottom = '20px';
    sel.style.fontSize = '20px';
  }

  private renderWeatherHistory(history: any[]): void {
    history.forEach((year: any) => {
      const yearTitle = document.createElement('h3');
      yearTitle.textContent = `YEAR ${year.year}`;
      this.diagOverlay?.appendChild(yearTitle);
      const table = this.createWeatherTable(year.months);
      this.diagOverlay?.appendChild(table);
    });
  }

  private createWeatherTable(months: any[]): HTMLTableElement {
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginBottom = '20px';
    this.appendTableHeader(table);
    months.forEach((m: any) => this.appendMonthRow(table, m));
    return table;
  }

  private appendTableHeader(table: HTMLTableElement): void {
    const header = table.insertRow();
    ['M', 'T', 'P', 'I'].forEach((h) => {
      const cell = header.insertCell();
      cell.textContent = h;
      cell.style.borderBottom = '1px solid #00ff00';
      cell.style.fontWeight = 'bold';
    });
  }

  private appendMonthRow(table: HTMLTableElement, m: any): void {
    const row = table.insertRow();
    row.insertCell().textContent = m.month.toString();
    const tCell = row.insertCell();
    tCell.textContent = Math.round(m.temp).toString();
    tCell.style.backgroundColor = this.tempToColorHex(m.temp);
    tCell.style.color = '#000';
    this.appendPressureInsolation(row, m);
  }

  private appendPressureInsolation(row: any, m: any) {
    row.insertCell().textContent = Math.round(m.pressure);
    row.insertCell().textContent = Math.round(m.insolation);
  }

  public tempToColorHex(temp: number): string {
    if (temp < 0) return '#00ffff';
    if (temp < 10) return '#00ff00';
    if (temp < 25) return '#ffff00';
    return '#ff0000';
  }

  public tempToColorVal(temp: number): number {
    if (temp < 0) return 0x00ffff;
    if (temp < 10) return 0x00ff00;
    if (temp < 25) return 0xffff00;
    return 0xff0000;
  }

  public updateTargetSectorMarker(): void {
    if (!this.diagEnabled) return;
    const avgTemp = this.computeAvgTemp();
    const color = this.tempToColorVal(avgTemp);
    this.syncTargetSectorMesh(color);
    this.positionTargetSectorMesh();
  }

  private syncTargetSectorMesh(color: number): void {
    if (!this.targetSectorMesh) {
      this.createTargetSectorMesh(color);
      return;
    }
    this.targetSectorMesh.material.color.set(color);
  }

  private computeAvgTemp(): number {
    if (!this.weatherData?.history?.length) return 15;
    const latest = this.weatherData.history[0];
    if (!latest?.months?.length) return 15;
    const sum = latest.months.reduce(
      (acc: number, m: any) => acc + (m.temp || 0),
      0,
    );
    return sum / latest.months.length;
  }

  private createTargetSectorMesh(color: number): void {
    const s = TARGET_SECTOR_SIZE;
    const geo = new THREE.BoxGeometry(s, s, 0.15);
    const mat = this.createTargetSectorMaterial(color);
    this.targetSectorMesh = new THREE.Mesh(geo, mat);
    this.globeGroup.add(this.targetSectorMesh);
  }

  private createTargetSectorMaterial(color: number): any {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
    });
  }

  private positionTargetSectorMesh(): void {
    const pos = this.lonLatToVector3(
      this.currentLon,
      this.currentLat,
      GLOBE_RADIUS + 0.08,
    );
    this.targetSectorMesh.position.copy(pos);
    this.targetSectorMesh.lookAt(this.globeGroup.position);
  }

  public clearTargetSectorMesh(): void {
    if (this.targetSectorMesh) {
      this.globeGroup.remove(this.targetSectorMesh);
      if (this.targetSectorMesh.geometry) {
        this.targetSectorMesh.geometry.dispose();
      }
      this.targetSectorMesh = null;
    }
  }

  public onActivate(): void {
    window.addEventListener(
      'resize',
      this.onWindowResize.bind(this),
    );
  }

  public onDeactivate(): void {
    window.removeEventListener(
      'resize',
      this.onWindowResize.bind(this),
    );
    this.hideDiagOverlay();
    this.clearTargetSectorMesh();
  }

  public update(_deltaTime: number): void {
    this.controls.update();
  }

  public updateEntities(
    _entities: EntityData[],
    _localPlayerId?: string,
  ): void {}

  public updateTerrain(_terrain: Terrain): void {}

  public rotate(dir: 'up' | 'down' | 'left' | 'right'): void {
    if (this.controls.autoRotate) {
      this.controls.autoRotate = false;
    }
    const speed = 0.05;
    this.applyRotationStep(dir, speed);
  }

  private applyRotationStep(dir: string, speed: number): void {
    const map: Record<string, () => void> = {
      up: () => (this.globeGroup.rotation.x -= speed),
      down: () => (this.globeGroup.rotation.x += speed),
      left: () => (this.globeGroup.rotation.y -= speed),
      right: () => (this.globeGroup.rotation.y += speed),
    };
    map[dir]?.();
  }

  public updateGameState(state: GameState): void {
    this.updateUnits(state.units);
    this.updateSectors(state.sectors);
  }

  private updateSectors(sectors: Record<string, any>): void {
    Object.values(sectors).forEach((sector) => {
      this.syncSectorInstance(sector);
    });
  }

  private syncSectorInstance(sector: any): void {
    const color = this.playerColors[sector.owner] || 0xdddddd;
    if (this.sectorMeshes[sector.id]) {
      this.sectorMeshes[sector.id].material.color.set(color);
      return;
    }
    this.spawnNewSectorMesh(sector, color);
  }

  private spawnNewSectorMesh(sector: any, color: any): void {
    const parts = sector.id.split('_');
    const lon = parseInt(parts[3]);
    const lat = parseInt(parts[1]);
    this.createSectorMesh(sector.id, lon, lat, color);
  }

  private createSectorMesh(
    id: string,
    lon: number,
    lat: number,
    color: any,
  ): void {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.1);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const pos = this.lonLatToVector3(lon, lat, GLOBE_RADIUS);
    mesh.position.copy(pos);
    mesh.lookAt(this.globeGroup.position);
    this.sectorMeshes[id] = mesh;
    this.globeGroup.add(mesh);
  }

  private updateUnits(units: Unit[]): void {
    const currentUnitIds = new Set(units.map((u) => u.id));
    units.forEach((unit) => this.syncUnitMesh(unit));
    Object.keys(this.unitMeshes).forEach((unitId) => {
      if (!currentUnitIds.has(unitId)) {
        this.globeGroup.remove(this.unitMeshes[unitId]);
        delete this.unitMeshes[unitId];
      }
    });
  }

  private syncUnitMesh(unit: Unit): void {
    const r = GLOBE_RADIUS + UNIT_RADIUS;
    const pos = this.lonLatToVector3(unit.lon, unit.lat, r);
    if (this.unitMeshes[unit.id]) {
      this.unitMeshes[unit.id].position.copy(pos);
      return;
    }
    this.createUnitMesh(unit, pos);
  }

  private createUnitMesh(unit: Unit, pos: any): void {
    const color = this.playerColors[unit.owner] || 0xffffff;
    const geo = new THREE.SphereGeometry(UNIT_RADIUS, 16, 16);
    const mat = this.createUnitMaterial(color);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.unitMeshes[unit.id] = mesh;
    this.globeGroup.add(mesh);
  }

  private createUnitMaterial(color: any): any {
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  public lonLatToVector3(
    lon: number,
    lat: number,
    radius: number,
  ): any {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  }

  private drawFeatures(features: any[]): void {
    const haloPos: number[] = [];
    const mainPos: number[] = [];
    features.forEach((f) => {
      this.collectFeatureVerts(f, haloPos, mainPos);
    });
    this.spawnOutlineMeshes(haloPos, mainPos);
  }

  private spawnOutlineMeshes(
    haloPos: number[],
    mainPos: number[],
  ): void {
    const hColor = OUTLINE_HALO_COLOR;
    const hAlpha = OUTLINE_HALO_OPACITY;
    this.spawnRibbonMesh(haloPos, hColor, hAlpha, false);
    this.spawnRibbonMesh(mainPos, OUTLINE_COLOR, 0.95, true);
  }

  private spawnRibbonMesh(
    pos: number[],
    color: number,
    opacity: number,
    depthWrite: boolean,
  ): void {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(pos, 3),
    );
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite,
      side: THREE.DoubleSide,
    });
    this.globeGroup.add(new THREE.Mesh(geo, mat));
  }

  private collectFeatureVerts(
    feature: any,
    haloPos: number[],
    mainPos: number[],
  ): void {
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      this.collectPolygonPair(geom.coordinates, haloPos, mainPos);
      return;
    }
    if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly: any) =>
        this.collectPolygonPair(poly, haloPos, mainPos)
      );
    }
  }

  private collectPolygonPair(
    coords: number[][][],
    haloPos: number[],
    mainPos: number[],
  ): void {
    // Outer cyan halo ribbon (width 0.028)
    this.appendRibbonQuads(
      coords[0],
      GLOBE_RADIUS + 0.012,
      0.028,
      haloPos,
    );
    // Inner bright neon outline ribbon (width 0.012)
    this.appendRibbonQuads(
      coords[0],
      GLOBE_RADIUS + 0.020,
      0.012,
      mainPos,
    );
  }

  public appendRibbonQuads(
    ring: number[][],
    radius: number,
    halfWidth: number,
    target: number[],
  ): void {
    for (let i = 0; i < ring.length - 1; i++) {
      this.buildSegmentQuad(
        ring[i],
        ring[i + 1],
        radius,
        halfWidth,
        target,
      );
    }
  }

  private buildSegmentQuad(
    p1: number[],
    p2: number[],
    radius: number,
    halfWidth: number,
    target: number[],
  ): void {
    const v1 = this.lonLatToVector3(p1[0], p1[1], radius);
    const v2 = this.lonLatToVector3(p2[0], p2[1], radius);
    const norm = v1.clone().normalize();
    const dir = new THREE.Vector3().subVectors(v2, v1).normalize();
    const side = new THREE.Vector3()
      .crossVectors(norm, dir)
      .normalize()
      .multiplyScalar(halfWidth);
    this.pushQuadVerts(v1, v2, side, target);
  }

  private pushQuadVerts(
    v1: any,
    v2: any,
    side: any,
    target: number[],
  ): void {
    const a = [v1.x + side.x, v1.y + side.y, v1.z + side.z];
    const b = [v1.x - side.x, v1.y - side.y, v1.z - side.z];
    const c = [v2.x - side.x, v2.y - side.y, v2.z - side.z];
    const d = [v2.x + side.x, v2.y + side.y, v2.z + side.z];
    target.push(...a, ...b, ...c, ...a, ...c, ...d);
  }

  private drawGrid(): void {
    const gridMaterial = new THREE.LineBasicMaterial({
      color: GRID_COLOR,
      transparent: true,
      opacity: 0.1,
    });
    this.drawLatitudeLines(gridMaterial);
    this.drawLongitudeLines(gridMaterial);
  }

  private drawLatitudeLines(material: any): void {
    for (let lat = -80; lat <= 80; lat += 10) {
      const points = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        points.push(this.lonLatToVector3(lon, lat, GLOBE_RADIUS));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      this.globeGroup.add(new THREE.Line(geo, material));
    }
  }

  private drawLongitudeLines(material: any): void {
    for (let lon = -180; lon < 180; lon += 10) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        points.push(this.lonLatToVector3(lon, lat, GLOBE_RADIUS));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      this.globeGroup.add(new THREE.Line(geo, material));
    }
  }

  public dispose(): void {
    if (this.controls) this.controls.dispose();
    this.hideDiagOverlay();
    this.clearTargetSectorMesh();
  }
}
