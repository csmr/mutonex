import os
import sys
import shutil
from pathlib import Path

# Configuration
GEBCO_FILENAME = "GEBCO_2024.tif"
# Direct S3 Download URL from Source Cooperative (Alex Leith's repository)
DOWNLOAD_URL = "https://s3.us-west-2.amazonaws.com/us-west-2.opendata.source.coop/alexgleith/gebco-2024/GEBCO_2024.tif"

# Disk Space Requirements
# ~4.3GB download + ~7.5GB raw pixel data (if unpacked) + ~3GB for PNG slices.
# We check for a safe 15GB.
REQUIRED_GB = 15

def check_disk_space(path=".", required_gb=REQUIRED_GB):
    """Checks if there is enough free space in the current directory."""
    try:
        total, used, free = shutil.disk_usage(path)
        free_gb = free / (2**30)

        if free_gb < required_gb:
            print(f"Error: Insufficient disk space. Required: {required_gb}GB, Available: {free_gb:.2f}GB")
            return False

        print(f"Disk Check Passed: {free_gb:.2f}GB available (Required: {required_gb}GB).")
        return True
    except Exception as e:
        print(f"Warning: Could not check disk space: {e}")
        return True # Proceed with caution

def download_file(url, filename):
    """Downloads a file with a progress bar."""
    try:
        import requests
        from tqdm import tqdm
    except ImportError:
        print("Error: 'requests' and 'tqdm' are required. Please run: pip install -r requirements.txt")
        return False

    print(f"\nDownloading {filename}...")
    print(f"Source: {url}")

    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        total_size = int(response.headers.get('content-length', 0))
        block_size = 1024 * 1024 # 1MB

        with open(filename, 'wb') as f, tqdm(total=total_size, unit='iB', unit_scale=True, unit_divisor=1024) as bar:
            for data in response.iter_content(block_size):
                bar.update(len(data))
                f.write(data)

        print("Download complete.")
        return True
    except KeyboardInterrupt:
        print("\nDownload cancelled by user.")
        if os.path.exists(filename):
            os.remove(filename)
        return False
    except Exception as e:
        print(f"\nDownload failed: {e}")
        if os.path.exists(filename):
            os.remove(filename) # Clean up partial file
        return False

def main():
    # Ensure we run from the script's directory so relative paths work
    script_dir = Path(__file__).parent.absolute()
    os.chdir(script_dir)
    print(f"Working Directory: {script_dir}")

    # 1. Check if file exists
    if os.path.exists(GEBCO_FILENAME):
        print(f"Found existing {GEBCO_FILENAME}. Skipping download.")
    else:
        # 2. Check Disk Space (Only if downloading)
        if not check_disk_space(path="."):
            sys.exit(1)

        # 3. Download
        print("File not found. Attempting download...")
        success = download_file(DOWNLOAD_URL, GEBCO_FILENAME)

        if not success:
            print("\nDownload failed or could not be completed.")
            print("Please manually download the file:")
            print(f"  URL: {DOWNLOAD_URL}")
            print(f"  Save as: {os.path.join(script_dir, GEBCO_FILENAME)}")
            sys.exit(1)

    # 4. Run Slicing
    print("\nStarting slicing process...")
    try:
        # Import slice_geodata dynamically or assumes it's in the same folder
        import slice_geodata
        slice_geodata.process_world()
        print("\nPipeline completed successfully.")
    except ImportError:
        print("Error: Could not import 'slice_geodata.py'. Is it in the same directory?")
        sys.exit(1)
    except Exception as e:
        print(f"Error during slicing: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
