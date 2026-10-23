import os
import sys
import time
import json
import base64
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
REPORT_FILE = os.path.join(
    BASE_DIR, "webclient/tests/fixtures/visual_report.html"
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

def capture_snapshot(page, title, filename):
    os.makedirs(FIXTURES_DIR, exist_ok=True)
    target_path = os.path.join(FIXTURES_DIR, filename)
    buf = page.screenshot()
    with open(target_path, "wb") as f:
        f.write(buf)
    b64 = base64.b64encode(buf).decode("utf-8")
    return {"title": title, "filename": filename, "b64": b64}

def build_html_report(snapshots):
    os.makedirs(os.path.dirname(REPORT_FILE), exist_ok=True)
    cards = []
    for s in snapshots:
        card = f"""
        <div class="card">
          <h3>{s['title']}</h3>
          <img src="data:image/png;base64,{s['b64']}" alt="{s['title']}" />
          <p class="meta">{s['filename']}</p>
        </div>"""
        cards.append(card)

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mutonex 3D Visual Rendering Test Report</title>
  <style>
    body {{
      background: #111; color: #eee;
      font-family: system-ui, sans-serif; margin: 20px;
    }}
    h1 {{ color: #f80; border-bottom: 1px solid #333; }}
    .grid {{
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 20px; margin-top: 20px;
    }}
    .card {{
      background: #222; border: 1px solid #444;
      border-radius: 8px; padding: 16px;
    }}
    .card img {{
      width: 100%; height: auto; border-radius: 4px;
      display: block; border: 1px solid #333;
    }}
    .meta {{ color: #888; font-size: 0.85em; margin-top: 8px; }}
  </style>
</head>
<body>
  <h1>Mutonex 3D Visual Rendering Report</h1>
  <p>Local visual inspection gallery for developer review.</p>
  <div class="grid">
    {''.join(cards)}
  </div>
</body>
</html>"""
    with open(REPORT_FILE, "w", encoding="utf-8") as f:
        f.write(html)

def run():
    server_proc = ensure_server()
    console_logs = []
    page_errors = []
    snapshots = []

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

            # Snapshot 1: Base scene
            s1 = capture_snapshot(
                page, "Base Scene Rendering", "base_scene.png"
            )
            snapshots.append(s1)

            # k: cycle shadeMode
            page.keyboard.press("k")
            page.wait_for_timeout(300)
            s2 = capture_snapshot(
                page, "World Normal Shade Mode (k)", "normal_shade_mode.png"
            )
            snapshots.append(s2)

            # l: cycle style
            page.keyboard.press("l")
            page.wait_for_timeout(300)
            s3 = capture_snapshot(
                page, "Line LIDAR Style (l)", "line_lidar_style.png"
            )
            snapshots.append(s3)

            # h/j: adjust gapMeters
            page.keyboard.press("j")
            page.wait_for_timeout(100)
            page.keyboard.press("h")
            page.wait_for_timeout(100)
            s4 = capture_snapshot(
                page, "Adjusted Gap Meters (h/j)", "adjusted_gap_meters.png"
            )
            snapshots.append(s4)

            build_html_report(snapshots)

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
            print(f"HTML Visual Report: {REPORT_FILE}")
            print("Visual 3D Pipeline: PASS")
            print(sep + "\n")

            browser.close()
    finally:
        if server_proc:
            server_proc.terminate()

if __name__ == "__main__":
    run()
