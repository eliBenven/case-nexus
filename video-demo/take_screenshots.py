"""Take 1920x1080 screenshots of every key app state for the Remotion demo video."""

import time
from playwright.sync_api import sync_playwright

OUT = "public/screenshots"
URL = "http://localhost:5001"

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})

        # ── 1. Landing page (before sync, empty state) ──
        page.goto(URL)
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/landing.png")
        print("✓ landing.png")

        # ── 2. After sync — cases loaded ──
        # Cases are already in the DB, just reload
        page.goto(URL)
        page.wait_for_timeout(1000)

        # Click Sync Caseload if the button exists
        sync_btn = page.query_selector("#btn-load-demo")
        if sync_btn and sync_btn.is_visible():
            sync_btn.click()
            page.wait_for_timeout(3000)  # Wait for cases to load
        else:
            # Cases may already be showing, wait a bit
            page.wait_for_timeout(2000)

        page.screenshot(path=f"{OUT}/caseload-loaded.png")
        print("✓ caseload-loaded.png")

        # ── 3. Scroll down to show more cases ──
        sidebar = page.query_selector("#case-list")
        if sidebar:
            sidebar.evaluate("el => el.scrollTop = 300")
            page.wait_for_timeout(500)
        page.screenshot(path=f"{OUT}/caseload-scrolled.png")
        print("✓ caseload-scrolled.png")

        # ── 4. Case detail view — click a specific case ──
        # Click on the first case in the list
        case_item = page.query_selector(".case-item")
        if case_item:
            case_item.click()
            page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/case-detail.png")
        print("✓ case-detail.png")

        # ── 5. Try to find CR-2025-0012 specifically ──
        # Search for it
        search = page.query_selector("#case-search")
        if search:
            search.fill("0012")
            page.wait_for_timeout(800)
            # Click the matching case
            matching = page.query_selector(".case-item")
            if matching:
                matching.click()
                page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/case-detail-0012.png")
        print("✓ case-detail-0012.png")

        # Clear search
        if search:
            search.fill("")
            page.wait_for_timeout(500)

        # ── 6. Dashboard view (main content area) ──
        # Click on the logo/dashboard to go back to welcome view
        logo = page.query_selector(".logo")
        if logo:
            logo.click()
            page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUT}/dashboard.png")
        print("✓ dashboard.png")

        # ── 7. Header close-up with token bar ──
        header = page.query_selector("#header")
        if header:
            header.screenshot(path=f"{OUT}/header-bar.png")
            print("✓ header-bar.png")

        # ── 8. Just the sidebar ──
        sidebar_el = page.query_selector("#sidebar")
        if sidebar_el:
            sidebar_el.screenshot(path=f"{OUT}/sidebar.png")
            print("✓ sidebar.png")

        # ── 9. Action buttons area ──
        # Navigate to a case to see the action buttons
        case_items = page.query_selector_all(".case-item")
        if len(case_items) > 2:
            case_items[2].click()
            page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUT}/case-with-actions.png")
        print("✓ case-with-actions.png")

        browser.close()
        print("\nDone! All screenshots in public/screenshots/")


if __name__ == "__main__":
    main()
