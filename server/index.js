const express = require("express");
const cors = require("cors");
const scrapeTrip = require("./scraper");

const app = express();
app.use(cors());
app.use(express.json());

// 🏠 Default API Info Page
app.get("/", (req, res) => {
  res.send(`
    <pre style="font-family: monospace; line-height: 1.5;">
Trip.com Review Scraper API 🚀

สถานะ: API ทำงานพร้อมใช้งาน

📌 Endpoints:
-------------------------------------
GET  /                - (หน้านี้) API Info
GET  /scrape-stream   - ดึงรีวิวแบบ Real-Time (SSE)

📌 วิธีใช้งาน Scraper (SSE):
-------------------------------------
ตัวอย่าง:
https://web-trip-com.onrender.com/scrape-stream?url=YOUR_TRIP_COM_URL

ระบบจะส่ง event:
  • progress  → ความคืบหน้า (ดึงหน้าไหนอยู่)
  • done      → ดึงเสร็จพร้อมข้อมูลรีวิวทั้งหมด
  • error     → เกิดข้อผิดพลาด

📌 ตัวอย่าง event:
{
  "page": 3,
  "totalReviews": 42,
  "status": "scraping"
}

-------------------------------------
Dev: Boss
Version: 1.0.0
    </pre>
  `);
});

// ⭐ SSE STREAM
app.get("/scrape-stream", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const url = req.query.url;
  if (!url) {
    res.write(`event: error\ndata: ${JSON.stringify({ message: "กรุณาใส่ URL" })}\n\n`);
    return;
  }

  try {
    await scrapeTrip(
      url,
      (progress) => {
        res.write(`event: progress\ndata: ${JSON.stringify(progress)}\n\n`);
      }
    ).then((result) => {
      res.write(`event: done\ndata: ${JSON.stringify(result)}\n\n`);
      res.end();
    });
  } catch (err) {
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`
    );
    res.end();
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
