import os
import sys
import time
import json
import socket
import subprocess
from playwright.sync_api import sync_playwright

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

def ensure_server():
    if not is_port_open(8080):
        s_dir = os.path.dirname(__file__)
        dist_dir = os.path.abspath(
            os.path.join(s_dir, "dist")
        )
        cmd = [
            "python3", "-m", "http.server",
            "8080", "--directory", dist_dir
        ]
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(1)
        return proc
    return None

def run():
    server_proc = ensure_server()
    os.makedirs("/home/jules/verification", exist_ok=True)
    console_logs = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
            ]
        )
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on(
            "console",
            lambda m: console_logs.append(
                f"[{m.type}] {m.text}"
            )
        )

        page.goto("http://localhost:8080/?join=false")
        page.wait_for_timeout(1000)

        # Hide lobby overlay so 3D canvas is visible
        page.evaluate("() => document.getElementById('lobby-view')?.classList.add('hidden')")
        page.wait_for_timeout(500)

        # Capture pre-change (pointCloud mode) screenshot
        page.screenshot(path="/home/jules/verification/01_pre_change_pointcloud.png")

        # Press 'l' until we reach proceduralLidar mode
        for i in range(5):
            page.keyboard.press("l")
            page.wait_for_timeout(500)
            page.screenshot(path=f"/home/jules/verification/02_style_{i}.png")

        # Capture proceduralLidar mode with screen-space outlines
        page.screenshot(path="/home/jules/verification/03_procedural_lidar_outlines.png")

        # Toggle shadeMode ('k')
        page.keyboard.press("k")
        page.wait_for_timeout(500)
        page.screenshot(path="/home/jules/verification/04_shade_mode_normal.png")

        print("Captured Console Logs:")
        for log in console_logs:
            if "Active" in log or "LidarView" in log or "Shader" in log or "ViewManager" in log or "style" in log.lower():
                print("  ", log)

        browser.close()

    if server_proc:
        server_proc.terminate()

if __name__ == "__main__":
    run()
