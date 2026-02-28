import os
import numpy as np
import rasterio
from rasterio.windows import Window
import cv2

# See docs/terrain_geodata.md for full specification and usage instructions.

# --- CONFIGURATION ---
# The source GEBCO GeoTIFF file (user must provide this).
# Download from Source Cooperative: https://source.coop/alexgleith/gebco-2024
INPUT_FILE = "GEBCO_2024.tif"
OUTPUT_DIR = "./slices"

# Grid Settings
SECTOR_DEG = 10      # 10x10 degree sectors
CHUNK_DEG = 1        # 1x1 degree chunks (optional subdivision)
PIXELS_PER_DEG = 240 # GEBCO definition (15 arc-sec interval)

# Elevation Offset
# GEBCO uses meters (approx -11,000 to +9,000).
# 16-bit PNG is unsigned (0-65535).
# We shift by +12,000 so that -12,000m becomes 0.
# 0m (Sea Level) becomes 12,000.
ELEVATION_OFFSET = 12000

def process_world():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: Could not find {INPUT_FILE}")
        print("Please place the GEBCO_2024.tif file in this directory.")
        return

    print(f"Opening {INPUT_FILE}...")

    with rasterio.open(INPUT_FILE) as src:
        print(f"Full World Size: {src.width}x{src.height}")
        print(f"Coordinate Reference System: {src.crs}")

        # Iterate Latitude from North (90) to South (-90)
        # GEBCO data is typically top-left origin.
        for lat in range(90, -90, -SECTOR_DEG):
            for lon in range(-180, 180, SECTOR_DEG):

                # Define the Sector Name (e.g., N50W010)
                # Convention: Center or Top-Left? Standard map tiles usually use Top-Left or Bottom-Left.
                # Here we stick to the provided naming: Nxx/Sxx based on the latitude band.
                # lat 90 -> N90 (Top edge). lat 0 -> N00 (or S00?).
                # If lat > 0: 'N', else 'S'.
                lat_prefix = 'N' if lat > 0 else 'S'
                lon_prefix = 'E' if lon >= 0 else 'W'
                sector_id = f"{lat_prefix}{abs(lat):02d}{lon_prefix}{abs(lon):03d}"

                sector_path = os.path.join(OUTPUT_DIR, sector_id)

                # Check resume
                # if os.path.exists(os.path.join(sector_path, "sector.png")):
                #     print(f"Skipping {sector_id}...")
                #     continue

                print(f"Processing Sector: {sector_id} (Top-Left Lat: {lat}, Lon: {lon})")

                # --- READ THE SECTOR (2400x2400) ---
                # Calculate pixel offsets for the Window
                # GEBCO: Top-Left is (-180, 90).
                # Row 0 is at Lat 90.
                row_off = (90 - lat) * PIXELS_PER_DEG
                col_off = (lon + 180) * PIXELS_PER_DEG
                width = SECTOR_DEG * PIXELS_PER_DEG
                height = SECTOR_DEG * PIXELS_PER_DEG

                # Clamp window to image bounds (just in case of rounding errors)
                if row_off + height > src.height: height = src.height - row_off
                if col_off + width > src.width: width = src.width - col_off

                window = Window(col_off, row_off, width, height)

                # Read data into numpy array (Band 1)
                sector_data = src.read(1, window=window)

                # Create output directory
                os.makedirs(sector_path, exist_ok=True)

                # --- PROCESS DATA ---
                # 1. Handle NoData (if any) -> defaults to very low negative
                sector_data = np.nan_to_num(sector_data, nan=-32768)

                # 2. Shift and Cast
                # chunk_shifted = sector_data.astype(np.int32) + ELEVATION_OFFSET
                # chunk_shifted = np.clip(chunk_shifted, 0, 65535).astype(np.uint16)

                # Optimization: Do it in place or on the full sector first
                full_sector_shifted = sector_data.astype(np.int32) + ELEVATION_OFFSET
                full_sector_shifted = np.clip(full_sector_shifted, 0, 65535).astype(np.uint16)

                # --- SAVE FULL SECTOR (Optional but Recommended) ---
                # Saves the single 2400x2400 texture
                full_sector_file = os.path.join(sector_path, "sector.png")
                cv2.imwrite(full_sector_file, full_sector_shifted)

                # --- SLICE INTO CHUNKS (Optional) ---
                # Only if needed for streaming or server logic
                chunks_per_side = SECTOR_DEG // CHUNK_DEG
                chunk_px = CHUNK_DEG * PIXELS_PER_DEG # 240

                for r in range(chunks_per_side):
                    for c in range(chunks_per_side):
                        y1, y2 = r * chunk_px, (r + 1) * chunk_px
                        x1, x2 = c * chunk_px, (c + 1) * chunk_px

                        # Verify bounds
                        if y1 >= full_sector_shifted.shape[0] or x1 >= full_sector_shifted.shape[1]:
                            continue

                        chunk_data = full_sector_shifted[y1:y2, x1:x2]

                        chunk_filename = f"chunk_{r}_{c}.png"
                        cv2.imwrite(os.path.join(sector_path, chunk_filename), chunk_data)

if __name__ == "__main__":
    process_world()
