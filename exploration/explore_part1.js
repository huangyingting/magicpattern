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
    const dialogs = Array.from(document.querySelectorAll("[role='dialog'], [role='menu'], [data-radix-popper-content-wrapper]")).map(d => d.innerText.trim().slice(0, 1000));
    return {
      label: lbl,
      url: location.href,
      title: document.title,
      headings,
      links,
      buttons,
      inputs,
      dialogs,
      bodyText: document.body.innerText.slice(0, 4000)
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

  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);

  // 1. Meet MagicOS Modal tabs
  try {
    const genBtn = page.getByRole("button", { name: /Generate variants/i });
    if (await genBtn.isVisible()) {
      await genBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/02_magicos_modal_step2.png" });
      const handoffBtn = page.getByRole("button", { name: /Hand it off/i });
      await handoffBtn.click();
      await page.waitForTimeout(800);
      await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/03_magicos_modal_step3.png" });
      const closeBtn = page.getByRole("button", { name: /^Close$/i });
      await closeBtn.click();
      await page.waitForTimeout(800);
    }
  } catch (e) {
    console.log("Modal interaction note:", e.message);
  }

  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/04_dashboard_clean.png" });
  report.push(await dumpPageSummary(page, "dashboard_clean"));

  // 2. Click "+ Create" button in sidebar
  try {
    const createBtn = page.getByRole("button", { name: /^Create$/i }).first();
    await createBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/05_dashboard_create_menu.png" });
    report.push(await dumpPageSummary(page, "dashboard_create_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("Create menu error:", e.message);
  }

  // 3. Click "Search" button in sidebar
  try {
    const searchBtn = page.getByRole("button", { name: /^Search$/i }).first();
    await searchBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/06_dashboard_search_modal.png" });
    report.push(await dumpPageSummary(page, "dashboard_search_modal"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("Search modal error:", e.message);
  }

  // 4. Click "Get free credits"
  try {
    const creditsBtn = page.getByRole("button", { name: /Get free credits/i }).first();
    await creditsBtn.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/07_get_free_credits_modal.png" });
    report.push(await dumpPageSummary(page, "get_free_credits_modal"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("Free credits error:", e.message);
  }

  // 5. Click Workspace switcher
  try {
    const wsBtn = page.getByRole("button", { name: /Workspace/i }).first();
    await wsBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/08_workspace_switcher.png" });
    report.push(await dumpPageSummary(page, "workspace_switcher"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("Workspace switcher error:", e.message);
  }

  // 6. Click Open account menu
  try {
    const acctBtn = page.getByRole("button", { name: /Open account menu/i }).first();
    await acctBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/09_account_menu.png" });
    report.push(await dumpPageSummary(page, "account_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("Account menu error:", e.message);
  }

  // 7. Dashboard tabs & filters ("Shared with Me", "Shared with Workspace", "Filter", "Last Updated", "List view")
  try {
    await page.getByRole("button", { name: /Shared with Me/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/10_dashboard_shared_with_me.png" });
    report.push(await dumpPageSummary(page, "dashboard_shared_with_me"));

    await page.getByRole("button", { name: /Shared with Workspace/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/11_dashboard_shared_with_workspace.png" });

    await page.getByRole("button", { name: /Filter/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/12_dashboard_filter_menu.png" });
    report.push(await dumpPageSummary(page, "dashboard_filter_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);

    await page.getByRole("button", { name: /Last Updated/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/13_dashboard_sort_menu.png" });
    report.push(await dumpPageSummary(page, "dashboard_sort_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  } catch (e) {
    console.log("Dashboard filter/tabs error:", e.message);
  }

  // 8. Navigate to /dashboard/files
  await page.goto("https://www.magicpatterns.com/dashboard/files", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/14_dashboard_files.png" });
  report.push(await dumpPageSummary(page, "dashboard_files"));

  // 9. Navigate to /dashboard/templates
  await page.goto("https://www.magicpatterns.com/dashboard/templates", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/15_dashboard_templates.png" });
  report.push(await dumpPageSummary(page, "dashboard_templates"));

  // 10. Navigate to /design-systems
  await page.goto("https://www.magicpatterns.com/design-systems", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/16_design_systems.png" });
  report.push(await dumpPageSummary(page, "design_systems"));

  // 11. Navigate to /settings/team
  await page.goto("https://www.magicpatterns.com/settings/team", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/17_settings_team.png" });
  report.push(await dumpPageSummary(page, "settings_team"));

  fs.writeFileSync("/home/azadmin/magicpattern/exploration/part1_report.json", JSON.stringify(report, null, 2));
  console.log("Saved part1_report.json with", report.length, "entries");
  await browser.close();
})();
