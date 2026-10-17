const { test, expect } = require("@playwright/test");

const mode = process.env.BASICRUM_TEST_MODE;
if (!["disabled", "immediate", "consent"].includes(mode)) {
  throw new Error("Run through tests/platform/run.sh, or set BASICRUM_TEST_MODE to the configured store mode.");
}

const siteId = "550e8400-e29b-41d4-a716-446655440000";

async function observeMonitoring(page) {
  const beacons = [];
  const assets = [];
  page.on("response", (response) => {
    if (new URL(response.url()).pathname.startsWith("/js/basicrum/")) {
      assets.push({ url: response.url(), status: response.status() });
    }
  });
  await page.route("https://collector.example.test/beacon**", (route) => {
    const request = route.request();
    const data = request.postData() || new URL(request.url()).search.slice(1);
    beacons.push(new URLSearchParams(data));
    return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
  });
  return { beacons, assets };
}

if (mode === "disabled") {
  test("disabled Maho storefront emits no monitoring code or requests", async ({ page }) => {
    const { beacons, assets } = await observeMonitoring(page);
    expect((await page.goto("/")).status()).toBe(200);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.basicRumBoomerangConfig)).toBeUndefined();
    expect(assets).toHaveLength(0);
    expect(beacons).toHaveLength(0);
  });
}

if (mode === "immediate") {
  for (const [path, pageType] of [["/", "Home"], ["/checkout/cart/", "Cart"]]) {
    test(`Maho ${pageType} page delivers real assets and a Maho-tagged beacon`, async ({ page }) => {
      const { beacons, assets } = await observeMonitoring(page);
      expect((await page.goto(path)).status()).toBe(200);
      await expect.poll(() => beacons.length).toBeGreaterThan(0);
      expect(beacons[0].get("p_gen")).toBe("maho");
      expect(beacons[0].get("p_type")).toBe(pageType);
      expect(beacons[0].get("brum_site_id")).toBe(siteId);
      expect(assets.filter(({ url }) => url.includes("boomerang-loader-v15.min.js"))).toHaveLength(1);
      expect(assets.filter(({ url }) => url.includes("boomerang-1.815.60"))).toHaveLength(1);
      expect(assets.every(({ status }) => status === 200)).toBe(true);
    });
  }
}

if (mode === "consent") {
  test("Maho waits for consent, loads once, and stops after withdrawal", async ({ page, context }) => {
    const { beacons, assets } = await observeMonitoring(page);
    expect((await page.goto("/")).status()).toBe(200);
    await page.waitForFunction(() => typeof window.OPT_IN_BASICRUM_LOADER_WRAPPER === "function");
    await page.waitForTimeout(500);
    expect(assets).toHaveLength(1);
    expect(assets[0].url).toContain("consent-boomerang-loader-v1-15.min.js");
    expect(beacons).toHaveLength(0);
    expect(await page.evaluate(() => typeof window.BOOMR.init)).toBe("undefined");

    await page.evaluate(() => {
      window.OPT_IN_BASICRUM_LOADER_WRAPPER();
      window.OPT_IN_BASICRUM_LOADER_WRAPPER();
    });
    await expect.poll(() => beacons.length).toBeGreaterThan(0);
    expect(beacons[0].get("p_gen")).toBe("maho");
    expect(beacons[0].get("brum_site_id")).toBe(siteId);
    expect(assets.filter(({ url }) => url.includes("boomerang-1.815.60"))).toHaveLength(1);
    expect(assets.every(({ status }) => status === 200)).toBe(true);

    await page.evaluate(() => window.OPT_OUT_BASICRUM_LOADER_WRAPPER());
    const countAfterWithdrawal = beacons.length;
    await page.evaluate(() => window.BOOMR.sendBeacon());
    await page.waitForTimeout(500);
    expect(beacons).toHaveLength(countAfterWithdrawal);
    expect((await context.cookies()).filter(({ name }) => ["RT", "BA"].includes(name))).toHaveLength(0);

    await page.reload();
    await page.waitForFunction(() => typeof window.OPT_IN_BASICRUM_LOADER_WRAPPER === "function");
    await page.waitForTimeout(500);
    expect(beacons).toHaveLength(countAfterWithdrawal);
    expect(await page.evaluate(() => typeof window.BOOMR.init)).toBe("undefined");
  });

  test("Maho admin renders Basicrum configuration and serves the consent copy helper", async ({ page }) => {
    const assets = [];
    page.on("response", (response) => {
      if (response.url().includes("/js/basicrum/admin/consent-info.js")) {
        assets.push(response.status());
      }
    });
    await page.goto("/admin/");
    await page.locator("#username").fill("basicrum_admin");
    await page.locator("#login").fill("BasicrumAdmin123");
    await page.locator("#step1 input[type=submit]").click();
    await expect(page.locator("#loginForm")).toHaveCount(0);
    const configUrl = await page.locator('a[href*="/system_config/"]').first().getAttribute("href");
    expect(configUrl).toBeTruthy();
    await page.goto(configUrl);
    const basicrumUrl = await page.locator('a[href*="/section/basicrum_analytics/"]').first().getAttribute("href");
    expect(basicrumUrl).toBeTruthy();
    await page.goto(basicrumUrl);
    await expect(page.locator("#basicrum_analytics_general_beacon_endpoint")).toHaveValue("https://collector.example.test/beacon");
    await expect(page.locator("#basicrum_analytics_general_brum_site_id")).toHaveValue(siteId);
    await expect(page.locator("#basicrum_analytics_general_opt_in_required")).toHaveValue("1");
    await expect(page.locator(".basicrum-copy-consent-snippet")).toHaveCount(2);
    await expect.poll(() => assets.length).toBe(1);
    expect(assets).toEqual([200]);
    expect(await page.evaluate(() => window.basicRumBoomerangConfig)).toBeUndefined();
  });
}
