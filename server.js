import express from "express";
import puppeteer from "puppeteer";

const app = express();

async function checkSites(query) {
  const ttUrl = "https://ads.tiktok.com/business/creativecenter/music?search=" + encodeURIComponent(query);
  const igUrl = "https://www.facebook.com/sound/collection/?search=" + encodeURIComponent(query);

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });
  const page = await browser.newPage();

  // TikTok CML
  await page.goto(ttUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  const ttFound = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const noRes = /no results/i.test(text);
    const card = document.querySelector('a[href*="/music/"], [data-e2e*="music"]');
    return !!card && !noRes;
  });

  // Meta Sound
  await page.goto(igUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  const igFound = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const hasDownloadWord = /Download/.test(text);
    const rows = document.querySelectorAll('[role="row"]');
    return hasDownloadWord || rows.length > 2;
  });

  await browser.close();
  return { ttFound, igFound, ttUrl, igUrl };
}

app.get("/check", async (req, res) => {
  try {
    const song = (req.query.song || "").toString().trim();
    const artist = (req.query.artist || "").toString().trim();
    if (!song) return res.status(400).json({ error: "song required" });
    const q = `${song} ${artist}`.trim();

    const r = await checkSites(q);
    res.json({
      tiktok: r.ttFound,
      meta: r.igFound,
      tiktokUrl: r.ttUrl,
      metaUrl: r.igUrl
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get("/", (_req, res) => res.send("OK"));
const port = process.env.PORT || 3000;
app.listen(port, () => console.log("listening on " + port));
