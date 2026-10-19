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
    const dialogs = Array.from(document.querySelectorAll("[role='dialog'], [role='menu'], [data-radix-popper-content-wrapper]")).map(d => d.innerText.trim().slice(0, 2000));
    return {
      label: lbl,
      url: location.href,
      title: document.title,
      headings,
      links,
      buttons,
      inputs,
      dialogs,
      bodyText: document.body.innerText.slice(0, 6000)
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

  // 1. Explore Design System creation step 2 & editor
  console.log("1. Exploring Design System creation step 2...");
  await page.goto("https://www.magicpatterns.com/design-systems", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    await page.getByRole("button", { name: /^New$/i }).first().click();
    await page.waitForTimeout(1000);
    await page.fill("input[placeholder='My Design System']", "Acme Design System");
    await page.getByRole("button", { name: /No, start another way/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /Continue/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/34_design_systems_step2.png" });
    report.push(await dumpPageSummary(page, "34_design_systems_step2"));
  } catch (e) {
    console.log("Design system step 2 error:", e.message);
  }

  // 2. Explore New Design modal sub-menus (+ Add, Commands, Design System Base, Auto)
  console.log("2. Exploring New Design modal sub-menus...");
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);
  try {
    const closeBtn = page.getByRole("button", { name: /^Close$/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: /^Design$/i }).first().click();
    await page.waitForTimeout(1500);

    // Click Commands
    await page.getByRole("button", { name: /Commands/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/35_new_design_commands.png" });
    report.push(await dumpPageSummary(page, "35_new_design_commands"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Click Design System Base
    await page.getByRole("button", { name: /Design System\s*Base/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/36_new_design_system_picker.png" });
    report.push(await dumpPageSummary(page, "36_new_design_system_picker"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Click Auto
    await page.getByRole("button", { name: /^Auto$/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/37_new_design_model_picker.png" });
    report.push(await dumpPageSummary(page, "37_new_design_model_picker"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
  } catch (e) {
    console.log("New Design sub-menus error:", e.message);
  }

  // 3. Explore Slide Deck Outline tab
  console.log("3. Exploring Slide Deck Outline tab...");
  await page.goto("https://www.magicpatterns.com/dashboard", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  try {
    const closeBtn = page.getByRole("button", { name: /^Close$/i });
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
    await page.getByRole("button", { name: /^Slide Deck$/i }).first().click();
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: /^Outline$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/38_slide_deck_outline.png" });
    report.push(await dumpPageSummary(page, "38_slide_deck_outline"));
  } catch (e) {
    console.log("Slide Deck outline error:", e.message);
  }

  // 4. Explore Integrations Add Key modal
  console.log("4. Exploring Integrations Add Key modal...");
  await page.goto("https://www.magicpatterns.com/settings/integrations", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  try {
    await page.getByRole("button", { name: /Add Key/i }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/39_integrations_add_key_modal.png" });
    report.push(await dumpPageSummary(page, "39_integrations_add_key_modal"));
  } catch (e) {
    console.log("Integrations modal error:", e.message);
  }

  // 5. Explore Connectors full list & Add Custom modal
  console.log("5. Exploring Connectors full list & Add Custom modal...");
  await page.goto("https://www.magicpatterns.com/settings/connectors", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  try {
    report.push(await dumpPageSummary(page, "40_connectors_full_list"));
    await page.getByRole("button", { name: /Add Custom/i }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/40_connectors_add_custom_modal.png" });
    report.push(await dumpPageSummary(page, "40_connectors_add_custom_modal"));
  } catch (e) {
    console.log("Connectors modal error:", e.message);
  }

  // 6. Explore Skills full list, Install Skill modal, New Skill modal
  console.log("6. Exploring Skills full list & modals...");
  await page.goto("https://www.magicpatterns.com/settings/skills", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  try {
    report.push(await dumpPageSummary(page, "41_skills_full_list"));
    await page.getByRole("button", { name: /Install Skill/i }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/41_skills_install_modal.png" });
    report.push(await dumpPageSummary(page, "41_skills_install_modal"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /New Skill/i }).first().click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/42_skills_new_modal.png" });
    report.push(await dumpPageSummary(page, "42_skills_new_modal"));
  } catch (e) {
    console.log("Skills modal error:", e.message);
  }

  // 7. Explore Subscription Upgrade Plan
  console.log("7. Exploring Upgrade Plan...");
  await page.goto("https://www.magicpatterns.com/settings/subscription", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(2500);
  try {
    await page.getByRole("button", { name: /Upgrade Plan/i }).first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/43_upgrade_plan.png" });
    report.push(await dumpPageSummary(page, "43_upgrade_plan"));
  } catch (e) {
    console.log("Upgrade plan error:", e.message);
  }

  fs.writeFileSync("/home/azadmin/magicpattern/exploration/part3_report.json", JSON.stringify(report, null, 2));
  console.log("Saved part3_report.json with", report.length, "entries");
  await browser.close();
})();
