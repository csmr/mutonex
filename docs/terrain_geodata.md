# Terrain Representation and Geodata Import

This document outlines the plan for transitioning from procedurally generated terrain to real-world geodata based on the GEBCO_2024 dataset.

## 1. Data Source

**Dataset:** [GEBCO_2024 Grid](https://www.gebco.net/data_and_products/gridded_bathymetry_data/)
**Type:** Global terrain model for ocean and land.
**Resolution:** 15 arc-second interval (~450m at equator).
**Format:** GeoTIFF (Float/Grey).

### Attribution
> GEBCO Compilation Group (2024) GEBCO 2024 Grid (doi:10.5285/1c44ce99-0a0d-5f4f-e063-7086abc0ea0f)

## 2. Technical Specification

### Grid Alignment
The game world uses 10-degree sectors. The GEBCO grid aligns perfectly with this:
*   **Resolution:** 15 arc-seconds = 240 pixels per degree.
*   **Sector Size:** 10 degrees = 2400 pixels.
*   **Full Map:** 43200 rows x 86400 columns (Total 3.7 billion points).

### Topology Selection
The "Under-Ice" topology is recommended for the "Post-Cataclysmic" lore.
*   **Ice Surface:** Includes current ice sheets (Antarctica, Greenland). Suitable for a frozen world or current day.
*   **Under-Ice:** Bedrock elevation. If sea levels are kept at current day (0m), Antarctica appears as a massive archipelago. This fits the Mutonex aesthetic of a changed world.

### Data Format
We utilize **16-bit Grayscale PNG** to store elevation data.
*   **Offset:** +12,000 meters.
*   **Mapping:** `Pixel Value = Elevation (m) + 12000`.
*   **Range:** Sea level (0m) is stored as 12,000. Ocean trenches (-11km) are ~1,000. High peaks (+8km) are ~20,000. This fits comfortably within the 16-bit unsigned integer range (0-65535).

## 3. Data Processing Workflow

The conversion tool is located at `src/res/geodata/slice_geodata.py`.

### Dependencies
*   Python 3
*   `rasterio` (requires GDAL)
*   `numpy`
*   `opencv-python-headless` (cv2)

### Execution
The easiest way to set up the data is to run the pipeline script, which handles downloading and slicing automatically.

1.  Navigate to `src/res/geodata/`.
2.  Install dependencies: `pip install -r requirements.txt`.
3.  Run the runner script:
    ```bash
    python3 import_geodata.py
    ```

The script will:
*   Check for `GEBCO_2024.tif`.
*   Check for sufficient disk space (~15GB).
*   Download the file from Source Cooperative if missing.
*   Run the slicing process.

**Manual Option:**
If the automated download fails, you can manually download `GEBCO_2024.tif` from [Source Cooperative](https://source.coop/alexgleith/gebco-2024), place it in `src/res/geodata/`, and run `python3 slice_geodata.py`.

### Output Structure
The script generates a `slices` directory structured by sector:
```
slices/
  ├── N50W010/
  │   ├── sector.png       # Full 2400x2400 heightmap
  │   ├── chunk_0_0.png    # 1-degree chunk (240x240)
  │   ├── ...
  └── S20E140/
      └── ...
```

## 4. Implementation Plan

### Phase 1: Data Preparation (Current)
*   [x] Create conversion script.
*   [ ] Acquire source GeoTIFF (User action).
*   [ ] Generate sector data for target gameplay regions.

### Phase 2: Server Consumption
The `GameSession` currently generates terrain procedurally (`Mutonex.Engine.TerrainGenerator`).
*   **Task:** Modify `TerrainGenerator` or create a new `TerrainLoader`.
*   **Mechanism:** When a sector initializes, load `sector.png` (or relevant chunks).
*   **Parsing:** Read the PNG into a binary heightmap or a list of integers.
    *   *Note:* Elixir image parsing libraries (like `ex_image` or calling out to a port) will be needed to read 16-bit PNGs. Alternatively, preprocess data into a raw binary format (`.bin`) for faster ingestion by Elixir.

### Phase 3: Client Consumption
The webclient (Three.js) needs to render the terrain.
*   **Task:** Update `GlobeView` or main renderer to load `sector.png` as a Displacement Map or Geometry.
*   **Technical Challenge (16-bit PNG):** Web browsers typically decode images to 8-bit per channel RGBA. Accessing raw 16-bit values in JavaScript is non-trivial with standard `Image` loaders.
*   **Solutions:**
    1.  **Custom Loader:** Use a JS PNG parser (e.g., `upng-js`) to read the raw buffer.
    2.  **Format Change:** If 16-bit PNG proves too heavy for the client, modify the script to output "Packed RGB" (R=High Byte, G=Low Byte), which is universally supported by browsers and standard texture loaders.
    3.  **Vertex Displacement:** Use the texture in a vertex shader. The shader will need to decode the value (e.g., `float height = texture.r * 65535.0` if using a float texture, or decode packed RGB).

### Phase 4: Gameplay Rules
*   Update movement cost calculators to use the real elevation data.
*   Ensure "Sea Level" logic handles the +12,000 offset correctly (i.e., `is_water = (value < 12000)`).
