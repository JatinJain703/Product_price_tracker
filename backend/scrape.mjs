// scrape.mjs — Node 18+
// Usage:
//   node scrape.mjs <productId> [--headed] [--debug]   → scrape one product, print result
//   node scrape.mjs --all [--headed] [--debug]          → scrape all CronItems and save to DB

import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

const BASE = "https://demo.inelabteamdev.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const HEADED = process.argv.includes("--headed");
const DEBUG = process.argv.includes("--debug");
const ALL = process.argv.includes("--all");

async function dismissCookieBanner(page) {
    const overlay = page.locator(".cookie-overlay");
    try {
        await overlay.waitFor({ state: "visible", timeout: 8000 });
    } catch {
        return false;
    }
    if (DEBUG || HEADED) console.log("  → Cookie banner detected, dismissing…");
    for (let i = 0; i < 5; i++) {
        const btn = page
            .locator(".cookie-banner button", { hasText: /^(Accept|Decline)$/i })
            .first();
        try { await btn.click({ timeout: 2000 }); } catch { }
        await sleep(400);
        const gone = await page.evaluate(
            () => !document.querySelector(".cookie-overlay")
        );
        if (gone) {
            if (DEBUG || HEADED) console.log(`  ✓ Cookie dismissed after ${i + 1} click(s)`);
            return true;
        }
    }
    return false;
}

async function scrapeProduct(context, productId) {
    const page = await context.newPage();

    if (DEBUG || HEADED) {
        page.on("console", (msg) => console.log(`  [browser:${msg.type()}]`, msg.text()));
        page.on("pageerror", (e) => console.log(`  [pageerror]`, e.message));
        page.on("requestfailed", (req) =>
            console.log(`  [reqfail]`, req.url(), req.failure()?.errorText));
        page.on("response", (res) => {
            if (res.url().includes("/api/")) {
                console.log(`  [net] ${res.status()} ${res.url()}`);
            }
        });
    }

    await page.route("**/*", (route) => {
        const t = route.request().resourceType();
        if (["image", "font", "media"].includes(t)) return route.abort();
        return route.continue();
    });

    const url = `${BASE}/product/${productId}`;
    console.log(`→ ${url}`);

    try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForSelector(".price-block", { timeout: 15000 });
        if (DEBUG || HEADED) console.log("  ⏳ Settling page (2s)…");
        await sleep(2000);

        const bannerDismissed = await dismissCookieBanner(page);
        if (bannerDismissed) {
            if (DEBUG || HEADED) console.log("  ⏳ Settling after cookie dismissal (2s)…");
            await sleep(2000);
        }

        const revealBtn = page.locator("button.btn-primary", { hasText: /Reveal price/i });
        await revealBtn.waitFor({ state: "visible", timeout: 15000 });

        const box = await revealBtn.boundingBox();
        if (!box) throw new Error("no button box");

        for (let i = 0; i < 20; i++) {
            const x = box.x + 10 + Math.random() * Math.max(1, box.width - 20);
            const y = box.y + 5 + Math.random() * Math.max(1, box.height - 10);
            await page.mouse.move(x, y, { steps: 1 });
            await sleep(80 + Math.random() * 40);
        }
        await sleep(1200);

        await page.waitForSelector("button.btn-primary:not([disabled])", { timeout: 10000 });
        try {
            await revealBtn.click({ timeout: 5000 });
        } catch {
            await revealBtn.click({ force: true, timeout: 5000 });
        }

        if (DEBUG || HEADED) console.log("  ⏳ Waiting for price block to succeed (up to 60s)…");
        await page.waitForSelector(".price-block.price-success", { timeout: 60000 });

        await page.waitForFunction(
            () => {
                const main = document.querySelector(".price-main");
                if (!main) return false;
                const candidate = [...main.children].find((el) => {
                    const cs = getComputedStyle(el);
                    if (cs.display === "none") return false;
                    if (cs.visibility === "hidden") return false;
                    if (el.getAttribute("aria-hidden") === "true") return false;
                    if (cs.textDecorationLine.includes("line-through")) return false;
                    const t = el.textContent.trim();
                    if (!t) return false;
                    if (/%\s*off/i.test(t)) return false;
                    if (/deal price/i.test(t)) return false;
                    if (!/\d/.test(t)) return false;
                    if (parseFloat(cs.fontSize) < 24) return false;
                    return true;
                });
                return !!candidate;
            },
            undefined,
            { timeout: 20000, polling: 250 }
        );

        await sleep(300);

        const raw = await page.evaluate(() => {
            const main = document.querySelector(".price-main");
            if (!main) return { rawPrice: null, rawStock: null, mrpText: null, currency: null };

            const candidates = [...main.children].filter((el) => {
                const cs = getComputedStyle(el);
                if (cs.display === "none") return false;
                if (cs.visibility === "hidden") return false;
                if (el.getAttribute("aria-hidden") === "true") return false;
                if (cs.textDecorationLine.includes("line-through")) return false;
                const t = el.textContent.trim();
                if (!t) return false;
                if (/%\s*off/i.test(t)) return false;
                if (/deal price/i.test(t)) return false;
                if (!/\d/.test(t)) return false;
                return true;
            });

            candidates.sort(
                (a, b) =>
                    parseFloat(getComputedStyle(b).fontSize) -
                    parseFloat(getComputedStyle(a).fontSize)
            );
            const priceEl = candidates[0] || null;

            const stockEl = document.querySelector(".stock-badge");
            const mrpEl = [...main.querySelectorAll("span")].find((s) =>
                getComputedStyle(s).textDecorationLine.includes("line-through")
            );

            const priceText = priceEl?.textContent ?? "";
            const curMatch = priceText.match(/[₹$€£¥]/);

            return {
                rawPrice: priceText,
                rawStock: stockEl?.textContent?.trim() ?? null,
                mrpText: mrpEl?.textContent?.trim() ?? null,
                currency: curMatch ? curMatch[0] : null,
            };
        });

        const cleanNum = (s) => {
            if (!s) return null;
            return parseFloat(s.replace(/[^\d.,]/g, "").replace(/,/g, ""));
        };

        const price = cleanNum(raw.rawPrice);
        const mrp = cleanNum(raw.mrpText);
        let stock = null;
        if (raw.rawStock) {
            if (/out\s+of\s+stock/i.test(raw.rawStock)) stock = 0;
            else {
                const m = raw.rawStock.match(/(\d+)/);
                if (m) stock = parseInt(m[1], 10);
            }
        }

        if (price == null || isNaN(price)) {
            throw new Error(`Price not found (rawPrice="${raw.rawPrice}")`);
        }

        console.log(`  ✓ price=${price} ${raw.currency ?? ""}  stock=${stock}  mrp=${mrp ?? "-"}`);

        return {
            productId,
            price,
            currency: raw.currency,
            mrp,
            stock,
            rawPrice: raw.rawPrice,
            rawStock: raw.rawStock,
        };
    } catch (err) {
        console.error(`  ✗ ${err.message.split("\n")[0]}`);
        if (HEADED) {
            console.log("  ⏸  Headed mode: keeping window open for 15s after error…");
            await sleep(15000);
        }
        return { productId, error: err.message };
    } finally {
        await page.close();
    }
}

async function launchBrowser() {
    // Common args for both modes
    const commonArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
    ];

    // Extra args only needed in headless mode
    const headlessArgs = [
        "--disable-dev-shm-usage",
        "--use-gl=angle",
        "--use-angle=swiftshader",
    ];

    console.log(`Launching browser (${HEADED ? "HEADED" : "headless"})…`);
    const browser = await chromium.launch({
        headless: !HEADED,
        args: HEADED ? commonArgs : [...commonArgs, ...headlessArgs],
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        locale: "en-IN",
        timezoneId: "Asia/Kolkata",
        userAgent:
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        extraHTTPHeaders: { "Accept-Language": "en-GB,en;q=0.9" },
    });

    await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "hardwareConcurrency", { get: () => 8 });
    });

    return { browser, context };
}

async function runAll() {
    const prisma = new PrismaClient();

    try {
        const cronItems = await prisma.cronItems.findMany({
            select: { productId: true, name: true },
        });

        if (cronItems.length === 0) {
            console.log("No products in CronItems to scrape.");
            return;
        }

        console.log(`Scraping ${cronItems.length} tracked products…`);
        const { browser, context } = await launchBrowser();

        for (const cronItem of cronItems) {
            console.log(`\nScraping productId: ${cronItem.productId}`);
            const result = await scrapeProduct(context, cronItem.productId);
            const hasError = !!result.error;

            const record = await prisma.history.create({
                data: {
                    productId: cronItem.productId,
                    name: cronItem.name,
                    price: hasError ? null : (result.price ?? null),
                    stock: hasError ? null : (result.rawStock ?? null),
                    hasError,
                    errorText: hasError ? String(result.error) : null,
                },
            });

            console.log(`  → Saved history id=${record.id}`);
        }

        await browser.close();
        console.log("\nAll products scraped and saved to history.");
    } finally {
        await prisma.$disconnect();
    }
}

async function runOne(productId) {
    const { browser, context } = await launchBrowser();
    const result = await scrapeProduct(context, productId);
    await browser.close();
    process.stdout.write("SCRAPE_RESULT:" + JSON.stringify([result]) + "\n");
}

async function main() {
    if (ALL) {
        await runAll();
    } else {
        const productId = process.argv.find((a) => /^\d+$/.test(a));
        if (!productId) {
            console.error("Usage: node scrape.mjs <productId> [--headed] [--debug]");
            console.error("       node scrape.mjs --all [--headed] [--debug]");
            process.exit(1);
        }
        await runOne(productId);
    }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });