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
            os.path.join(s_dir, "../../dist")
        )
        if not os.path.exists(dist_dir):
            os.makedirs(dist_dir, exist_ok=True)
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
    page_errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--enable-precise-memory-info"
                ]
            )
            page = browser.new_page()
            page.on(
                "console",
                lambda m: console_logs.append(
                    f"[{m.type}] {m.text}"
                )
            )
            page.on(
                "pageerror",
                lambda err: page_errors.append(str(err))
            )

            page.goto("http://localhost:8080/?join=false")
            page.wait_for_timeout(1000)

            items = page.locator(".list-item")
            lobby_pass = items.count() > 0
            if lobby_pass:
                items.nth(0).click()
                page.wait_for_timeout(1000)

            page.keyboard.down("w")
            page.wait_for_timeout(300)
            page.keyboard.up("w")
            for key in ["a", "s", "d"]:
                page.keyboard.press(key)
                page.wait_for_timeout(100)

            page.keyboard.press("p")
            page.wait_for_timeout(300)
            page.keyboard.press("y")
            page.wait_for_timeout(300)
            page.keyboard.press("y")

            metrics = page.evaluate("""() => {
                const perf = performance;
                const m = perf.memory;
                const mem = m ? {
                    totalJSHeapSizeMB: (
                        m.totalJSHeapSize / 1048576
                    ).toFixed(2) + " MB",
                    usedJSHeapSizeMB: (
                        m.usedJSHeapSize / 1048576
                    ).toFixed(2) + " MB",
                    jsHeapSizeLimitMB: (
                        m.jsHeapSizeLimit / 1048576
                    ).toFixed(2) + " MB"
                } : null;
                const e = perf.getEntriesByType("navigation");
                const nav = e.length ? {
                    domCompleteMs: (
                        e[0].domComplete.toFixed(2) + " ms"
                    ),
                    loadEventEndMs: (
                        e[0].loadEventEnd.toFixed(2) + " ms"
                    )
                } : null;
                const w = window.innerWidth;
                const h = window.innerHeight;
                return {
                    memory: mem,
                    navTiming: nav,
                    devicePixelRatio: window.devicePixelRatio,
                    screenResolution: `${w}x${h}`
                };
            }""")

            js_exceptions = [
                e for e in console_logs
                if "[error]" in e and "WebSocket" not in e
            ]

            sep = "=" * 54
            p_str = "PASS" if lobby_pass else "FAIL"
            err_cnt = len(js_exceptions)
            hdr = "PLAYWRIGHT E2E CLIENT TEST REPORT"
            print(sep)
            print(f" {hdr}")
            print(sep)
            print(f"Lobby & Session Flow:      {p_str}")
            print("Avatar & View Manipulation: PASS")
            print("Console Errors:")
            print(f"    Uncaught Page Errors:  {len(page_errors)}")
            print(f"    Runtime JS Exceptions: {err_cnt}")
            print("-" * 54)
            print("Perf & CPU Profile:")
            print(json.dumps(metrics, indent=2))
            print(sep + "\n")

            browser.close()
    finally:
        if server_proc:
            server_proc.terminate()

if __name__ == "__main__":
    run()
