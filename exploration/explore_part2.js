const { chromium } = require("playwright");
const fs = require("fs");

function normalizeCookies(rawCookies) {
  return rawCookies
    .filter(c => c.name && c.value !== undefined)
    .map(c => {
      let sameSite = "Lax";
      if (c.sameSite) {
        const s = String(c.sameSite).toLowerCase();
        if (s === "strict") sameSite = "Strict";
        else if (s === "none" || s === "no_restriction") sameSite = "None";
        else if (s === "lax") sameSite = "Lax";
      }
      const cookie = {
        name: c.name,
        value: c.value,
        domain: c.domain || ".magicpatterns.com",
        path: c.path || "/",
        secure: Boolean(c.secure),
        httpOnly: Boolean(c.httpOnly),
        sameSite
      };
      if (c.expirationDate && typeof c.expirationDate === "number") {
        cookie.expires = Math.floor(c.expirationDate);
      }
      return cookie;
    });
}

async function dumpPageSummary(page, label) {
  return await page.evaluate((lbl) => {
    const links = Array.from(document.querySelectorAll("a[href]")).map(a => ({
      text: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 100),
      href: a.getAttribute("href")
    }));
    const buttons = Array.from(document.querySelectorAll("button")).map(b => ({
      text: (b.innerText || b.getAttribute("aria-label") || b.getAttribute("title") || "").trim().slice(0, 100),
      disabled: b.disabled
    }));
    const inputs = Array.from(document.querySelectorAll("input, textarea, select")).map(i => ({
      tag: i.tagName,
      type: i.getAttribute("type"),
      placeholder: i.getAttribute("placeholder"),
      value: i.value
    }));
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4")).map(h => ({
      tag: h.tagName,
      text: h.innerText.trim().slice(0, 120)
    }));
    const dialogs = Array.from(document.querySelectorAll("[role='dialog'], [role='menu'], [data-radix-popper-content-wrapper]")).map(d => d.innerText.trim().slice(0, 1500));
    return {
      label: lbl,
      url: location.href,
      title: document.title,
      headings,
      links,
      buttons,
      inputs,
      dialogs,
      bodyText: document.body.innerText.slice(0, 5000)
    };
  }, label);
}

(async () => {
  const raw = JSON.parse(fs.readFileSync("/home/azadmin/magicpattern/.cred", "utf8"));
  const cookies = normalizeCookies(raw);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
  });
  await context.addCookies(cookies);
  const page = await context.newPage();
  const report = [];

  // 1. Settings routes
  const settingsRoutes = [
    { url: "https://www.magicpatterns.com/settings/team", name: "18_settings_team_invite", clickInvite: true },
    { url: "https://www.magicpatterns.com/settings/subscription", name: "19_settings_subscription" },
    { url: "https://www.magicpatterns.com/settings/workspace", name: "20_settings_workspace" },
    { url: "https://www.magicpatterns.com/settings/usage-reports", name: "21_settings_usage_reports" },
    { url: "https://www.magicpatterns.com/settings/profile", name: "22_settings_profile" },
    { url: "https://www.magicpatterns.com/settings/integrations", name: "23_settings_integrations" },
    { url: "https://www.magicpatterns.com/settings/connectors", name: "24_settings_connectors" },
    { url: "https://www.magicpatterns.com/settings/skills", name: "25_settings_skills" },
    { url: "https://www.magicpatterns.com/settings/api-keys", name: "26_settings_api_keys" }
  ];

  for (const sr of settingsRoutes) {
    console.log("Visiting", sr.url);
    await page.goto(sr.url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);
    if (sr.clickInvite) {
      try {
        await page.getByRole("button", { name: /^Invite$/i }).click();
        await page.waitForTimeout(800);
      } catch (e) {
        console.log("Invite button error:", e.message);
      }
    }
    await page.screenshot({ path: `/home/azadmin/magicpattern/screenshots/${sr.name}.png`, fullPage: false });
    report.push(await dumpPageSummary(page, sr.name));
  }

  // 2. Check New Folder modal & Filter/Sort on /dashboard/files
  console.log("Visiting /dashboard/files for New Folder & Filter...");
  await page.goto("https://www.magicpatterns.com/dashboard/files", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    await page.getByRole("button", { name: /Filter/i }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/27_files_filter_popover.png" });
    report.push(await dumpPageSummary(page, "27_files_filter_popover"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /Last Updated/i }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/28_files_sort_popover.png" });
    report.push(await dumpPageSummary(page, "28_files_sort_popover"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /New Folder/i }).first().click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/29_files_new_folder_modal.png" });
    report.push(await dumpPageSummary(page, "29_files_new_folder_modal"));
    await page.keyboard.press("Escape");
  } catch (e) {
    console.log("Files popovers error:", e.message);
  }

  // 3. Check Design Systems "+ New" flow
  console.log("Visiting /design-systems and clicking New...");
  await page.goto("https://www.magicpatterns.com/design-systems", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    await page.getByRole("button", { name: /^New$/i }).first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/30_design_systems_new.png" });
    report.push(await dumpPageSummary(page, "30_design_systems_new"));
  } catch (e) {
    console.log("Design systems New error:", e.message);
  }

  // 4. Visit /dashboard and click "Design"
  console.log("Visiting /dashboard and clicking Design...");
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    const closeModal = page.getByRole("button", { name: /^Close$/i });
    if (await closeModal.isVisible()) {
      await closeModal.click();
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: /^Design$/i }).first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/31_create_design_editor.png" });
    report.push(await dumpPageSummary(page, "31_create_design_editor"));
  } catch (e) {
    console.log("Click Design error:", e.message);
  }

  // 5. Visit /dashboard and click "Slide Deck"
  console.log("Visiting /dashboard and clicking Slide Deck...");
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    const closeModal = page.getByRole("button", { name: /^Close$/i });
    if (await closeModal.isVisible()) {
      await closeModal.click();
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: /^Slide Deck$/i }).first().click();
    await page.waitForTimeout(4000);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/32_create_slide_deck.png" });
    report.push(await dumpPageSummary(page, "32_create_slide_deck"));
  } catch (e) {
    console.log("Click Slide Deck error:", e.message);
  }

  // 6. Visit /os/new (MagicOS)
  console.log("Visiting /os/new (MagicOS)...");
  await page.goto("https://www.magicpatterns.com/os/new", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/33_magicos_new.png" });
  report.push(await dumpPageSummary(page, "33_magicos_new"));

  fs.writeFileSync("/home/azadmin/magicpattern/exploration/part2_report.json", JSON.stringify(report, null, 2));
  console.log("Saved part2_report.json with", report.length, "entries");
  await browser.close();
})();
