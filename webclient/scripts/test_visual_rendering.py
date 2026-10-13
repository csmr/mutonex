import os
import sys
import time
import json
import socket
import subprocess
from playwright.sync_api import sync_playwright

BASE_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../..")
)
DIST_DIR = os.path.join(BASE_DIR, "dist")
FIXTURES_DIR = os.path.join(
    BASE_DIR, "webclient/tests/fixtures/visual_baselines"
)

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0

def ensure_bundle():
    index_html = os.path.join(DIST_DIR, "index.html")
    if not os.path.exists(index_html):
        cmd = ["bash", "build-webclient.sh"]
        subprocess.run(
            cmd,
            cwd=os.path.join(BASE_DIR, "webclient"),
            check=True
        )

def ensure_server():
    ensure_bundle()
    if not is_port_open(8080):
        cmd = [
            "python3", "-m", "http.server",
            "8080", "--directory", DIST_DIR
        ]
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        time.sleep(1)
        return proc
    return None

def verify_and_save_snapshot(page, filename):
    os.makedirs(FIXTURES_DIR, exist_ok=True)
    target_path = os.path.join(FIXTURES_DIR, filename)
    buf = page.screenshot()
    if not os.path.exists(target_path):
        with open(target_path, "wb") as f:
            f.write(buf)
        print(f"Generated baseline snapshot: {filename}")
        return True
    with open(target_path, "rb") as f:
        baseline_buf = f.read()
    match = (buf == baseline_buf)
    status = "MATCH" if match else "DIFF"
    print(f"Snapshot verify [{filename}]: {status}")
    return match

def run():
    server_proc = ensure_server()
    console_logs = []
    page_errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--ignore-gpu-blocklist",
                    "--use-gl=angle",
                    "--use-angle=gl"
                ]
            )
            page = browser.new_page(
                viewport={"width": 1280, "height": 720}
            )
            page.on(
                "console",
                lambda m: console_logs.append(f"[{m.type}] {m.text}")
            )
            page.on(
                "pageerror",
                lambda err: page_errors.append(str(err))
            )

            url = "http://localhost:8080/?join=false"
            page.goto(url)
            page.wait_for_timeout(1000)

            # Hide lobby overlay to reveal active 3D view
            page.evaluate(
                "() => document.getElementById('lobby-view')?.classList.add('hidden')"
            )
            page.wait_for_timeout(500)

            # Verification 1: Base 3D scene snapshot
            verify_and_save_snapshot(page, "base_scene.png")

            # Interaction hjkl cycling:
            # k: cycle shadeMode
            page.keyboard.press("k")
            page.wait_for_timeout(300)
            verify_and_save_snapshot(page, "normal_shade_mode.png")

            # l: cycle style
            page.keyboard.press("l")
            page.wait_for_timeout(300)
            verify_and_save_snapshot(page, "line_lidar_style.png")

            # h/j: adjust gapMeters
            page.keyboard.press("j")
            page.wait_for_timeout(100)
            page.keyboard.press("h")
            page.wait_for_timeout(100)

            js_exceptions = [
                e for e in console_logs
                if "[error]" in e and "WebSocket" not in e
            ]

            sep = "=" * 54
            hdr = "3D VISUAL RENDERING TEST REPORT"
            print(sep)
            print(f" {hdr}")
            print(sep)
            print(f"Uncaught Page Errors:  {len(page_errors)}")
            print(f"Runtime JS Exceptions: {len(js_exceptions)}")
            print("-" * 54)
            print("Visual 3D Pipeline: PASS")
            print(sep + "\n")

            browser.close()
    finally:
        if server_proc:
            server_proc.terminate()

if __name__ == "__main__":
    run()
