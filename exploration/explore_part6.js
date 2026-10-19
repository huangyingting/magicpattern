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
    const buttons = Array.from(document.querySelectorAll("button")).map(b => ({
      text: (b.innerText || b.getAttribute("aria-label") || b.getAttribute("title") || "").trim().slice(0, 100),
      disabled: b.disabled
    }));
    const dialogs = Array.from(document.querySelectorAll("[role='dialog'], [role='menu'], [data-radix-popper-content-wrapper]")).map(d => d.innerText.trim().slice(0, 2000));
    return {
      label: lbl,
      url: location.href,
      buttons,
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

  await page.goto("https://www.magicpatterns.com/c/tvajgfewuihg5kqchnvgxv", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(5000);

  // Dismiss Welcome modal ("Continue" -> "Start Designing")
  for (let i = 0; i < 4; i++) {
    const btn = page.getByRole("button", { name: /Continue|Start Designing|Got it|Close/i }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(700);
    } else {
      break;
    }
  }

  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/55_editor_clean_preview.png" });
  report.push(await dumpPageSummary(page, "55_editor_clean_preview"));

  // Screens tab
  try {
    await page.getByRole("button", { name: /^Screens$/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/56_editor_screens_tab.png" });
    report.push(await dumpPageSummary(page, "56_editor_screens_tab"));
  } catch (e) { console.log("Screens error:", e.message); }

  // Code tab
  try {
    await page.getByRole("button", { name: /^Code$/i }).click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/57_editor_code_tab.png" });
    report.push(await dumpPageSummary(page, "57_editor_code_tab"));
  } catch (e) { console.log("Code error:", e.message); }

  // Back to Preview tab
  try {
    await page.getByRole("button", { name: /^Preview$/i }).click();
    await page.waitForTimeout(1000);

    await page.getByRole("button", { name: /^Controls$/i }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/58_editor_controls_menu.png" });
    report.push(await dumpPageSummary(page, "58_editor_controls_menu"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /^Visual Edit$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/59_editor_visual_edit.png" });
    report.push(await dumpPageSummary(page, "59_editor_visual_edit"));

    await page.getByRole("button", { name: /^Comments$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/60_editor_comments.png" });
    report.push(await dumpPageSummary(page, "60_editor_comments"));

    await page.getByRole("button", { name: /^Export$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/61_editor_export_modal.png" });
    report.push(await dumpPageSummary(page, "61_editor_export_modal"));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    await page.getByRole("button", { name: /^Share$/i }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/62_editor_share_modal.png" });
    report.push(await dumpPageSummary(page, "62_editor_share_modal"));
    await page.keyboard.press("Escape");
  } catch (e) { console.log("Preview sub-controls error:", e.message); }

  fs.writeFileSync("/home/azadmin/magicpattern/exploration/part6_report.json", JSON.stringify(report, null, 2));
  console.log("Saved part6_report.json with", report.length, "entries");
  await browser.close();
})();
