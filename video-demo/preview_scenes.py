"""Take screenshots of key frames from the Remotion preview to verify UI replica."""

from playwright.sync_api import sync_playwright

OUT = "public/previews"
URL = "http://localhost:3333"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        page.goto(URL)
        page.wait_for_timeout(4000)
        page.screenshot(path=f"{OUT}/studio.png")
        print("✓ studio.png")

        browser.close()

if __name__ == "__main__":
    import os
    os.makedirs(OUT, exist_ok=True)
    main()
