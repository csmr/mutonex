// webclient/GlobeView.ts
import { IView } from "./ViewManager.ts";
import { GameState, Unit } from "./MockGameStateProvider.ts";

const GLOBE_RADIUS = 5;
const UNIT_RADIUS = 0.05;

declare const THREE: typeof import("three");
declare const OrbitControls:
  typeof import("three/examples/jsm/controls/OrbitControls");

/**
 * Manages the 3D globe view and its diagnostic weather interactions.
 */
export class GlobeView implements IView {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;

  private controls: THREE.OrbitControls;
  private globe: THREE.Group;
  private unitMeshes: Record<string, THREE.Mesh> = {};
  private sectorMeshes: Record<string, THREE.Mesh> = {};
  private playerColors: Record<string, THREE.Color> = {
    "Player1": new THREE.Color(0x00ff00), // Green
    "Player2": new THREE.Color(0xff00ff), // Magenta
  };

  // Weather Diagnostic State
  private diagEnabled: boolean = false;
  private diagOverlay: HTMLElement | null = null;
  private currentLat: number = 60;
  private currentLon: number = 20;
  private weatherData: any = null;

  constructor(_geoData: any, domElement: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    this.camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.z = 15;

    // Controls
    this.controls = new THREE.OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.enablePan = false;
    this.controls.minDistance = 7;
    this.controls.maxDistance = 30;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.2;

    // Group to hold the globe and its features
    this.globe = new THREE.Group();
    this.scene.add(this.globe);

    // Create the base sphere
    const sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    this.globe.add(sphere);

    this.#loadOutlines();
    this.#drawGrid();
  }

  public setDiagMode(enabled: boolean) {
    this.diagEnabled = enabled;
    if (enabled) {
      this.#showDiagOverlay();
      this.#fetchWeatherData();
    } else {
      this.#hideDiagOverlay();
    }
  }

  async #loadOutlines() {
    try {
      const resp = await fetch("/assets/countries.geo.json");
      const data = await resp.json();
      this.#drawFeatures(data.features);
    } catch (e) {
      console.error("[GlobeView] Failed to load country outlines", e);
    }
  }

  async #fetchWeatherData() {
    try {
      const resp = await fetch(`/weather-history?lat=${this.currentLat}&lon=${this.currentLon}`);
      this.weatherData = await resp.json();
      this.#updateDiagUI();
    } catch (e) {
      console.error("[GlobeView] Failed to fetch weather data", e);
    }
  }

  #showDiagOverlay() {
    if (this.diagOverlay) return;
    this.diagOverlay = document.createElement("div");
    this.diagOverlay.id = "globe-diag-overlay";
    this.diagOverlay.style.position = "absolute";
    this.diagOverlay.style.top = "0";
    this.diagOverlay.style.left = "0";
    this.diagOverlay.style.width = "25%";
    this.diagOverlay.style.height = "100%";
    this.diagOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    this.diagOverlay.style.color = "#00ff00";
    this.diagOverlay.style.fontFamily = "'Courier New', Courier, monospace";
    this.diagOverlay.style.fontSize = "16px";
    this.diagOverlay.style.padding = "20px";
    this.diagOverlay.style.overflowY = "auto";
    this.diagOverlay.style.textShadow = "2px 2px #000000";
    this.diagOverlay.style.zIndex = "1000";

    document.body.appendChild(this.diagOverlay);
    this.#updateDiagUI();
  }

  #hideDiagOverlay() {
    if (this.diagOverlay) {
      document.body.removeChild(this.diagOverlay);
      this.diagOverlay = null;
    }
  }

  #updateDiagUI() {
    if (!this.diagOverlay) return;
    this.diagOverlay.innerHTML = "";

    const title = document.createElement("h2");
    title.textContent = "WEATHER TESTING FACILITY";
    title.style.borderBottom = "2px solid #00ff00";
    this.diagOverlay.appendChild(title);

    const selector = document.createElement("div");
    selector.style.display = "flex";
    selector.style.justifyContent = "space-between";
    selector.style.alignItems = "center";
    selector.style.marginBottom = "20px";
    selector.style.fontSize = "20px";

    const btnL = document.createElement("button");
    btnL.textContent = "◀";
    btnL.style.background = "none";
    btnL.style.color = "#00ff00";
    btnL.style.border = "1px solid #00ff00";
    btnL.style.padding = "5px 10px";
    btnL.style.cursor = "pointer";
    btnL.onclick = () => { this.currentLon -= 10; this.#fetchWeatherData(); };

    const sectorText = document.createElement("span");
    sectorText.textContent = `LAT ${this.currentLat} LON ${this.currentLon}`;

    const btnR = document.createElement("button");
    btnR.textContent = "▶";
    btnR.style.background = "none";
    btnR.style.color = "#00ff00";
    btnR.style.border = "1px solid #00ff00";
    btnR.style.padding = "5px 10px";
    btnR.style.cursor = "pointer";
    btnR.onclick = () => { this.currentLon += 10; this.#fetchWeatherData(); };

    selector.appendChild(btnL);
    selector.appendChild(sectorText);
    selector.appendChild(btnR);
    this.diagOverlay.appendChild(selector);

    if (this.weatherData) {
      this.weatherData.history.forEach((year: any) => {
        const yearTitle = document.createElement("h3");
        yearTitle.textContent = `YEAR ${year.year}`;
        this.diagOverlay?.appendChild(yearTitle);

        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.marginBottom = "20px";

        const header = table.insertRow();
        ["M", "T", "P", "I"].forEach(h => {
          const cell = header.insertCell();
          cell.textContent = h;
          cell.style.borderBottom = "1px solid #00ff00";
          cell.style.fontWeight = "bold";
        });

        year.months.forEach((m: any) => {
          const row = table.insertRow();
          const mCell = row.insertCell();
          mCell.textContent = m.month.toString();

          const tCell = row.insertCell();
          tCell.textContent = Math.round(m.temp).toString();
          tCell.style.backgroundColor = this.#tempToColor(m.temp);
          tCell.style.color = "#000";

          const pCell = row.insertCell();
          pCell.textContent = Math.round(m.pressure).toString();

          const iCell = row.insertCell();
          iCell.textContent = Math.round(m.insolation).toString();
        });

        this.diagOverlay?.appendChild(table);
      });
    }
  }

  #tempToColor(temp: number): string {
    if (temp < 0) return "#00ffff";
    if (temp < 10) return "#00ff00";
    if (temp < 25) return "#ffff00";
    return "#ff0000";
  }

  public onActivate(): void {
    window.addEventListener("resize", this.onWindowResize.bind(this));
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    console.log("%c[GlobeView] Diagnostic Mode: Press 'D' to toggle Weather Facility", "color: #00ff00");
  }

  public onDeactivate(): void {
    window.removeEventListener("resize", this.onWindowResize.bind(this));
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    this.#hideDiagOverlay();
  }

  public update(_deltaTime: number): void {
    this.controls.update();
  }

  public updateGameState(state: GameState): void {
    this.#updateUnits(state.units);
    this.#updateSectors(state.sectors);
  }

  #updateSectors(sectors: Record<string, any>): void {
    Object.values(sectors).forEach((sector) => {
      const parts = sector.id.split("_");
      const lat = parseInt(parts[1]);
      const lon = parseInt(parts[3]);

      if (this.sectorMeshes[sector.id]) {
        const color = this.playerColors[sector.owner] || 0xdddddd;
        (this.sectorMeshes[sector.id].material as THREE.MeshBasicMaterial).color
          .set(color);
      } else {
        const color = this.playerColors[sector.owner] || 0xdddddd;
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.1);
        const material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.5,
        });
        const mesh = new THREE.Mesh(geometry, material);
        const position = this.lonLatToVector3(lon, lat, GLOBE_RADIUS);
        mesh.position.copy(position);
        mesh.lookAt(this.globe.position);

        this.sectorMeshes[sector.id] = mesh;
        this.globe.add(mesh);
      }
    });
  }

  #updateUnits(units: Unit[]): void {
    const currentUnitIds = new Set(units.map((u) => u.id));

    units.forEach((unit) => {
      const position = this.lonLatToVector3(
        unit.lon,
        unit.lat,
        GLOBE_RADIUS + UNIT_RADIUS,
      );
      if (this.unitMeshes[unit.id]) {
        this.unitMeshes[unit.id].position.copy(position);
      } else {
        const color = this.playerColors[unit.owner] || 0xffffff;
        const geometry = new THREE.SphereGeometry(UNIT_RADIUS, 16, 16);
        const material = new THREE.MeshBasicMaterial({ color });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.copy(position);
        this.unitMeshes[unit.id] = mesh;
        this.globe.add(mesh);
      }
    });

    Object.keys(this.unitMeshes).forEach((unitId) => {
      if (!currentUnitIds.has(unitId)) {
        const mesh = this.unitMeshes[unitId];
        this.globe.remove(mesh);
        delete this.unitMeshes[unitId];
      }
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.controls.autoRotate) {
      this.controls.autoRotate = false;
    }

    if (event.key.toLowerCase() === "d") {
      this.setDiagMode(!this.diagEnabled);
    }

    const rotationSpeed = 0.05;
    switch (event.key) {
      case "ArrowUp":
        this.globe.rotation.x -= rotationSpeed;
        break;
      case "ArrowDown":
        this.globe.rotation.x += rotationSpeed;
        break;
      case "ArrowLeft":
        this.globe.rotation.y -= rotationSpeed;
        break;
      case "ArrowRight":
        this.globe.rotation.y += rotationSpeed;
        break;
    }
  }

  private lonLatToVector3(
    lon: number,
    lat: number,
    radius: number,
  ): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(phi) * Math.sin(theta);
    return new THREE.Vector3(x, y, z);
  }

  #drawFeatures(features: any[]): void {
    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 }); // Bright Green
    features.forEach((feature) => {
      const geom = feature.geometry;
      if (geom.type === "Polygon") {
        this.#drawPolygon(geom.coordinates, material);
      } else if (geom.type === "MultiPolygon") {
        geom.coordinates.forEach((polygon: any) =>
          this.#drawPolygon(polygon, material)
        );
      }
    });
  }

  #drawPolygon(coords: number[][][], material: THREE.LineBasicMaterial): void {
    const points: THREE.Vector3[] = [];
    coords[0].forEach((p) =>
      points.push(this.lonLatToVector3(p[0], p[1], GLOBE_RADIUS + 0.01))
    );
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    this.globe.add(line);
  }

  #drawGrid(): void {
    const gridMaterial = new THREE.LineBasicMaterial({
      color: 0x00ff00, // Bright Green
      transparent: true,
      opacity: 0.1,
    });

    for (let lat = -80; lat <= 80; lat += 10) {
      const points = [];
      for (let lon = -180; lon <= 180; lon += 5) {
        points.push(this.lonLatToVector3(lon, lat, GLOBE_RADIUS));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.globe.add(line);
    }

    for (let lon = -180; lon < 180; lon += 10) {
      const points = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        points.push(this.lonLatToVector3(lon, lat, GLOBE_RADIUS));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, gridMaterial);
      this.globe.add(line);
    }
  }
}
