// scraper.js
const { chromium } = require("playwright");

// ⛔ CSV ไม่ต้องใช้แล้ว เพราะเราจะ return JSON
function normalizeSpaces(s = "") {
    return s.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();
}

module.exports = async function scrapeTrip(url, onProgress = () => { }) {
    console.log("🚀 เปิด Browser โหมด Stealth...");

    // ---------- Stealth Browser ----------
    const browser = await chromium.launch({
        headless: true,  // ⚠ ถ้า deploy บน Render ให้เปลี่ยนเป็น true
        args: ["--disable-blink-features=AutomationControlled"],
    });

    const context = await browser.newContext({
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 720 },
        locale: "th-TH",
        timezoneId: "Asia/Bangkok",
    });

    const page = await context.newPage();

    // ปิด navigator.webdriver
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
            get: () => undefined,
        });
    });

    console.log(`🌐 เปิด URL: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(4000);

    // ---------- Login Handling ----------
    if (page.url().includes("account/signin")) {
        console.log("⚠️ ถูกบังคับ Login — รอให้ boss login เอง");

        try {
            const emailInput = page.getByRole("textbox", { name: /อีเมล|โปรดระบุอีเมล/i });
            if (await emailInput.isVisible({ timeout: 3000 })) {
                await emailInput.fill("thanachok.suwan@gmail.com");

                const continueBtn = page.getByRole("button", { name: /ดำเนินการต่อ/i });
                if (await continueBtn.isVisible()) {
                    await continueBtn.click();
                }
            }
        } catch { }

        console.log("⏳ รอ Login 60 วินาที...");
        try {
            await page.waitForURL(/hotels\/.*detail/, { timeout: 60000 });
            console.log("✅ Login เสร็จ กลับมาหน้าโรงแรมแล้ว");
        } catch {
            console.log("⚠️ หมดเวลารอ login แต่จะพยายาม scraping ต่อ");
        }
    }

    // ---------- ปิด popup ----------
    try {
        const searchBtn = page.getByRole("button", { name: /ค้นหา/ });
        if (await searchBtn.isVisible({ timeout: 5000 })) {
            await searchBtn.click();
            console.log("✅ ปิด popup สำเร็จ");
            await page.waitForTimeout(2000);
        }
    } catch { }

    // Cookie Consent
    try {
        const cookieBtn = page.getByRole('button', { name: 'ยอมรับทั้งหมด' });
        if (await cookieBtn.isVisible({ timeout: 3000 })) {
            await cookieBtn.click();
        }
    } catch { }

    // ---------- เปิด Drawer รีวิว ----------
    try {
        console.log("🔍 กำลังหา heading รีวิว...");
        const reviewsHeading = page
            .locator("h2, h3, div")
            .filter({ hasText: /^รีวิวจากผู้เข้าพัก$/ })
            .first();

        await reviewsHeading.waitFor({ state: "visible", timeout: 15000 });
        await reviewsHeading.click();

        console.log("✅ เปิดรีวิวแล้ว");
        await page.waitForTimeout(2000);
    } catch (err) {
        console.log("❌ หา heading รีวิวไม่เจอ");
        await browser.close();
        throw new Error("หาเซคชั่นรีวิวไม่เจอ — Selector เปลี่ยนหรือยังไม่ login");
    }

    // ---------- เลือกเฉพาะภาษาไทย ----------
    try {
        const langAll = page.getByText(/^ภาษาทั้งหมด$/).first();
        if (await langAll.isVisible({ timeout: 5000 })) {
            await langAll.click();
            const thaiItem = page.getByRole("listitem").filter({ hasText: "ภาษาไทย" }).first();
            await thaiItem.click();
            console.log("🇹🇭 เลือกภาษาไทยแล้ว");
            await page.waitForTimeout(2000);
        }
    } catch { }

    // ---------- Selectors ----------
    const LIST_SELECTOR =
        '#hp_container > div.content > div.drawer_drawerMask__2coP_ > div > div.drawer_drawerContainer-content__lvpSp > div:nth-child(1) > div.dfoDA5kEcrM1Xd3n4SqY';

    const ITEM_SELECTOR = `${LIST_SELECTOR} > div`;
    const RIGHT_BOX = "div.RkvqTN_AeMa_BEIZyYbx";
    const SCORE_SEL = `${RIGHT_BOX} > div.MLiQc9R1hSDl3AuzxunL > div.BXp3tfose98_cm8Wn10x`;
    const TITLE_SEL = `${RIGHT_BOX} > div.MLiQc9R1hSDl3AuzxunL > div.EFcLi6rDxOtvi1MITNME`;
    const DATE_SEL = `${RIGHT_BOX} > div.MLiQc9R1hSDl3AuzxunL > div.LPPTO8g2RH0Fk19jYMOQ.nUgIw0PM47FsRYfjswPo`;
    const NAME_SEL = "div.fv1x8oSY77gj7tSX5QWM > div > div";
    const NEXT_BTN = `${LIST_SELECTOR} > ul > li:last-child`;
    const EXPAND_BTN = "div._4C4vyl1b7FKgXjT5ZCgx";
    const REPLY_SEL = "div.qUERH0dj6c94FltfokWY";

    console.log("🚀 เริ่มดึงข้อมูล...");

    await page.waitForSelector(LIST_SELECTOR, { timeout: 20000 });

    let pageIndex = 1;
    let total = 0;
    let allReviews = [];

    while (true) {
        console.log(`📄 หน้าที่ ${pageIndex}`);

        // ---- Expand ----
        const expandBtns = await page.$$(EXPAND_BTN);
        for (const btn of expandBtns) {
            try {
                await btn.click({ timeout: 500 });
            } catch { }
        }
        await page.waitForTimeout(1000);

        // ---- Extract ----
        const rows = await page.$$eval(
            ITEM_SELECTOR,
            (items, sel) => {
                const {
                    RIGHT_BOX,
                    SCORE_SEL,
                    TITLE_SEL,
                    DATE_SEL,
                    NAME_SEL,
                    REPLY_SEL,
                } = sel;

                const fixScore = (raw) => {
                    if (!raw) return "";
                    const compact = raw.replace(/\s+/g, "");
                    const m = compact.match(/(\d+(?:\.\d+)?)\/10/);
                    return m ? m[0] : raw.trim();
                };

                return items.map((el) => {
                    let name =
                        el.querySelector(NAME_SEL)?.textContent ||
                        el.querySelector('[class*="userName"]')?.textContent ||
                        "";

                    const box = el.querySelector(RIGHT_BOX) || el;

                    const scoreRaw = box.querySelector(SCORE_SEL)?.textContent || "";
                    const score = fixScore(scoreRaw);

                    const title = (box.querySelector(TITLE_SEL)?.textContent || "").trim();
                    const date = (box.querySelector(DATE_SEL)?.textContent || "").trim();

                    let all = (box.textContent || "")
                        .replace(/\s*\n\s*/g, " ")
                        .replace(/\s{2,}/g, " ")
                        .trim();

                    [title, scoreRaw, date].forEach((t) => {
                        if (t && t.length > 2) all = all.replace(t, " ");
                    });

                    let reply = "";
                    const replyBox = box.querySelector(REPLY_SEL);
                    if (replyBox) {
                        reply = replyBox.textContent
                            .replace(/\s*\n\s*/g, " ")
                            .replace(/\s{2,}/g, " ")
                            .trim();
                        all = all.replace(reply, " ");
                    }

                    all = all.replace(/\s{2,}/g, " ").trim();

                    return {
                        name,
                        score,
                        date,
                        title,
                        comment: all,
                        reply,
                    };
                });
            },
            { RIGHT_BOX, SCORE_SEL, TITLE_SEL, DATE_SEL, NAME_SEL, REPLY_SEL }
        );

        const cleaned = rows.map((r) => ({
            name: normalizeSpaces(r.name),
            score: normalizeSpaces(r.score),
            date: normalizeSpaces(r.date),
            title: normalizeSpaces(r.title),
            comment: normalizeSpaces(r.comment),
            reply: normalizeSpaces(r.reply),
        }));

        allReviews.push(...cleaned);
        total += cleaned.length;

        console.log(`   ✔ เก็บ ${cleaned.length} รายการ (รวม ${total})`);

        // ⭐⭐⭐ ส่ง progress ออกไปให้หน้าเว็บ ⭐⭐⭐
        onProgress({
            page: pageIndex,
            totalReviews: total,
            status: "scraping",
        });

        // ---- Next Page ----
        const nextBtn = page.locator(NEXT_BTN);
        const visible = await nextBtn.isVisible().catch(() => false);
        if (!visible) break;

        const cls = (await nextBtn.getAttribute("class")) || "";
        if (cls.includes("disabled") || cls.includes("wO8m2JJbMCAYZJt_tv8P")) break;

        await nextBtn.click();
        pageIndex++;
        await page.waitForTimeout(3000);
    }

    console.log(`🎉 เสร็จสิ้น รวม ${total} รีวิว`);

    await browser.close();

    return {
        url,
        total,
        pages: pageIndex,
        reviews: allReviews,
    };
};
