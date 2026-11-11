// Startseite (Sets), Rangliste, Grading und Handy-Layout
import { test } from "@playwright/test";
import { expect, openApp, waitAllData, watchErrors } from "./helpers.mjs";

test("Sets werden beim Scrollen nachgeladen", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page);
  await page.waitForSelector("section.set table");
  await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
  const start = await page.evaluate(() => ({ sets: document.querySelectorAll("section.set").length, tables: document.querySelectorAll("section.set table").length }));
  expect(start.sets).toBeGreaterThan(20);
  expect(start.tables).toBeLessThan(6); // nicht alles auf einmal
  // Zu Set 10 springen: Tabelle wird gefüllt, Position bleibt stabil
  const top = await page.evaluate(async () => {
    const s = document.querySelectorAll("section.set")[9];
    s.scrollIntoView();
    await new Promise((r) => setTimeout(r, 600));
    return { filled: Boolean(s.querySelector("table tbody tr")), top: Math.round(s.getBoundingClientRect().top) };
  });
  expect(top.filled).toBe(true);
  expect(Math.abs(top.top - 130)).toBeLessThan(40); // scroll-margin-top
  // Suchfeld filtert über alle Sets
  await page.fill("#search", "glurak");
  await expect(page.locator("section.set tbody tr").first()).toContainText(/Glurak/i);
  expect(errors).toEqual([]);
});

test("Rangliste zeigt 100 Karten", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, "#rangliste");
  await expect(page.locator("#ranking tbody tr")).toHaveCount(100);
  expect(errors).toEqual([]);
});

test("Grading-Suche verlinkt PriceCharting und eBay", async ({ page }) => {
  const errors = watchErrors(page);
  await openApp(page, "#grading");
  await waitAllData(page);
  await page.fill("#grade-input", "Glurak 199");
  const row = page.locator("#grade-results .grade-row").first();
  await expect(row).toContainText("Glurak");
  await expect(row.locator('a[href*="pricecharting.com"]')).toHaveCount(1);
  await expect(row.locator('a[href*="ebay.de"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("kein seitliches Scrollen am Handy (360 px)", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 360, height: 780 }, serviceWorkers: "block" });
  const errors = watchErrors(page);
  await openApp(page);
  await page.waitForSelector("section.set table");
  const wide = [];
  for (const id of ["view-sets", "view-all", "view-quick", "view-grade", "view-archive", "view-collection"]) {
    await page.click(`#${id}`);
    await page.waitForTimeout(500);
    const w = await page.evaluate(() => document.documentElement.scrollWidth);
    if (w > 361) wide.push(`${id}: ${w}px`);
  }
  expect(wide).toEqual([]);
  expect(errors).toEqual([]);
  await page.close();
});
