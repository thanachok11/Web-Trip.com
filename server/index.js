const express = require("express");
const cors = require("cors");
const scrapeTrip = require("./scraper");

const app = express();
app.use(cors());
app.use(express.json());

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
      // callback ส่ง progress แบบ real-time
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
