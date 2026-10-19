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
    const buttons = Array.from(document.querySelectorAll("button, [role='tab'], [role='menuitem']")).map(b => ({
      text: (b.innerText || b.getAttribute("aria-label") || b.getAttribute("title") || "").trim().slice(0, 100),
      role: b.getAttribute("role") || b.tagName
    }));
    const dialogs = Array.from(document.querySelectorAll("[role='dialog'], [role='menu'], [data-radix-popper-content-wrapper]")).map(d => d.innerText.trim().slice(0, 2500));
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

  const cont = page.getByRole("button", { name: /^Continue$/i });
  if (await cont.isVisible()) {
    await cont.click();
    await page.waitForTimeout(600);
  }
  const startDes = page.getByRole("button", { name: /^Start Designing$/i });
  if (await startDes.isVisible()) {
    await startDes.click();
    await page.waitForTimeout(600);
  }

  // Click Screens tab
  await page.getByText("Screens", { exact: true }).first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/59_editor_screens_tab.png" });
  report.push(await dumpPageSummary(page, "59_editor_screens_tab"));

  // Click Code tab
  await page.getByText("Code", { exact: true }).first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/60_editor_code_tab.png" });
  report.push(await dumpPageSummary(page, "60_editor_code_tab"));

  // Click Export
  await page.getByText("Export", { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/61_editor_export_modal.png" });
  report.push(await dumpPageSummary(page, "61_editor_export_modal"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Click Share
  await page.getByText("Share", { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/62_editor_share_modal.png" });
  report.push(await dumpPageSummary(page, "62_editor_share_modal"));
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Also check Version History from Editor actions
  await page.getByRole("button", { name: /Editor actions/i }).click();
  await page.waitForTimeout(600);
  await page.getByText("Version History", { exact: true }).first().click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "/home/azadmin/magicpattern/screenshots/63_editor_version_history.png" });
  report.push(await dumpPageSummary(page, "63_editor_version_history"));

  fs.writeFileSync("/home/azadmin/magicpattern/exploration/part6_report.json", JSON.stringify(report, null, 2));
  console.log("Saved part6_report.json with", report.length, "entries");
  await browser.close();
})();
