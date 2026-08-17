import { chromium } from "playwright-core";
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await page.goto("http://127.0.0.1:8788/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);
await page.screenshot({ path: "/tmp/claude-0/-home-user/4d79cb5d-0abe-50f5-bbd2-b39b5b866544/scratchpad/shots/landing-noenter.png", fullPage: true });
await browser.close();
