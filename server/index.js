const express = require("express");
const cors = require("cors");
const scrapeTrip = require("./scraper");

const app = express();
app.use(cors());
app.use(express.json());

// 🏠 Default API Info Page
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8" />
<title>Trip.com Scraper API</title>
<style>
  body {
    margin: 0;
    font-family: "Inter", sans-serif;
    background: #f4f6fb;
    color: #333;
  }

  .header {
    background: linear-gradient(135deg, #1976d2, #42a5f5);
    color: white;
    padding: 38px 20px;
    text-align: center;
    border-bottom-left-radius: 22px;
    border-bottom-right-radius: 22px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  }

  h1 {
    font-size: 36px;
    margin: 0;
    font-weight: 700;
  }

  .sub {
    font-size: 17px;
    opacity: 0.9;
    margin-top: 8px;
  }

  .section {
    max-width: 850px;
    margin: 40px auto;
    padding: 0 20px;
  }

  .card {
    background: white;
    border-radius: 14px;
    padding: 22px;
    box-shadow: 0 4px 14px rgba(0,0,0,0.06);
    margin-bottom: 26px;
    border-left: 6px solid #1976d2;
  }

  .card h2 {
    margin-top: 0;
    font-size: 22px;
    color: #1976d2;
  }

  code {
    background: #eef2f8;
    padding: 2px 6px;
    border-radius: 6px;
    font-size: 14px;
  }

  .endpoint {
    background: #f0f5ff;
    border: 1px solid #d6e4ff;
    border-left: 5px solid #1976d2;
    padding: 12px 16px;
    border-radius: 10px;
    margin-bottom: 12px;
    font-family: monospace;
  }

  .footer {
    text-align: center;
    padding: 30px;
    color: #555;
    font-size: 14px;
  }

</style>
</head>
<body>

<div class="header">
  <h1>Trip.com Review Scraper API 🚀</h1>
  <div class="sub">ระบบดึงรีวิวแบบ Real-Time ผ่าน Server-Sent Events (SSE)</div>
</div>

<div class="section">

  <div class="card">
    <h2>🔥 สถานะ API</h2>
    <p>API พร้อมทำงานปกติ สามารถใช้ในการ scrape รีวิวจาก Trip.com ได้ทันที</p>
  </div>

  <div class="card">
    <h2>📌 Endpoints</h2>

    <div class="endpoint">GET /</div>
    <p>หน้าแสดงข้อมูลการทำงานของ API</p>

    <div class="endpoint">GET /scrape-stream?url=...</div>
    <p>ดึงรีวิวแบบ Real-Time (SSE)</p>
  </div>

  <div class="card">
    <h2>🛠 วิธีใช้งาน Scraper (SSE)</h2>
    <p>ส่ง URL โรงแรมจาก Trip.com เช่น:</p>

    <div class="endpoint">
      https://web-trip-com.onrender.com/scrape-stream?url=YOUR_TRIP_URL
    </div>

    <p>ระบบจะส่ง Events:</p>
    <ul>
      <li><b>progress</b> — หน้าที่กำลังดึง + จำนวนรีวิวสะสม</li>
      <li><b>done</b> — ดึงเสร็จพร้อมรีวิวทั้งหมด</li>
      <li><b>error</b> — แจ้งข้อผิดพลาด</li>
    </ul>

    <p>ตัวอย่าง JSON:</p>
    <pre>{
  "page": 3,
  "totalReviews": 42,
  "status": "scraping"
}</pre>
  </div>

  <div class="card">
    <h2>👨‍💻 Developer</h2>
    <p>สร้างโดย <b>Boss</b></p>
    <p>เวอร์ชัน: <code>1.0.0</code></p>
  </div>

</div>

<div class="footer">
  © 2025 Trip.com Scraper API • Render Hosting
</div>

</body>
</html>
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
