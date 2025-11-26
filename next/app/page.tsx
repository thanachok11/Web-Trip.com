"use client";

import { useState, useMemo } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://web-trip-com.onrender.com";

interface ReviewItem {
  name: string;
  score: string;
  date: string;
  title: string;
  comment: string;
  reply: string;
}

interface ScrapeResult {
  url: string;
  total: number;
  pages: number;
  reviews: ReviewItem[];
}

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [meta, setMeta] = useState<ScrapeResult | null>(null);
  const [error, setError] = useState("");

  // ⭐ PROGRESS UI
  const [currentPage, setCurrentPage] = useState(0);
  const [totalReviewsProgress, setTotalReviewsProgress] = useState(0);
  const [totalPages, setTotalPages] = useState(1); // ⭐ เพิ่มใหม่

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const totalPagesClient = useMemo(() => {
    return Math.ceil(reviews.length / perPage);
  }, [reviews, perPage]);

  const paginatedReviews = useMemo(() => {
    const start = (page - 1) * perPage;
    return reviews.slice(start, start + perPage);
  }, [reviews, page, perPage]);

  // ----------------------------
  // ⭐ HANDLE SCRAPE via SSE
  // ----------------------------
  const handleScrape = () => {
    if (!url) return;

    setLoading(true);
    setError("");
    setReviews([]);
    setMeta(null);
    setPage(1);

    setCurrentPage(0);
    setTotalReviewsProgress(0);
    setTotalPages(1);

    const evt = new EventSource(
      `${API_URL}/scrape-stream?url=${encodeURIComponent(url)}`
    );

    // REAL-TIME PROGRESS
    evt.addEventListener("progress", (event) => {
      const data = JSON.parse(event.data);

      setCurrentPage(data.page || 1);
      setTotalReviewsProgress(data.totalReviews || 0);
    });

    // DONE EVENT
    evt.addEventListener("done", (event) => {
      const data: ScrapeResult = JSON.parse(event.data);

      setMeta(data);
      setReviews(data.reviews);
      setTotalPages(data.pages); // ⭐ ตั้งค่าหน้าจริง

      setLoading(false);
      evt.close();
    });

    // ERROR EVENT
    evt.addEventListener("error", () => {
      setError("เกิดข้อผิดพลาดระหว่างดึงข้อมูล");
      setLoading(false);
      evt.close();
    });
  };

  return (
    <main className="page">
      <div className="container">
        <h1 className="title">Trip.com Review Scraper</h1>
        <p className="subtitle">
          ดึงรีวิวแบบ Real-Time พร้อมแสดงความคืบหน้า
        </p>

        <div className="card input-card">
          <label className="label">Trip.com URL</label>
          <input
            className="input"
            placeholder="เช่น https://th.trip.com/hotels/..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <div className="theme-switch">
            <button onClick={() => document.body.className = ""} className="theme-btn">Light</button>
            <button onClick={() => document.body.className = "theme-dark"} className="theme-btn">Dark</button>
            <button onClick={() => document.body.className = "theme-sunset"} className="theme-btn">Sunset</button>
          </div>

          <button className="btn" onClick={handleScrape} disabled={loading || !url}>
            {loading ? "กำลังดึงข้อมูล..." : "เริ่มดึงรีวิว"}
          </button>

          {/* ⭐ PROGRESS UI */}
          {loading && (
            <div className="progress-box">
              <p>
                📄 หน้าที่กำลังดึง: <b>{currentPage}</b>
              </p>
              <p>
                ⭐ รีวิวที่ดึงแล้ว: <b>{totalReviewsProgress}</b>
              </p>

              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width:
                      currentPage === 0
                        ? "0%"
                        : `${Math.min((currentPage / totalPages) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {error && <p className="error">{error}</p>}

          {meta && (
            <div className="meta">
              <div>URL: {meta.url}</div>
              <div>รีวิวทั้งหมด: {meta.total} รายการ</div>
              <div>จำนวนหน้ารีวิว Trip.com: {meta.pages}</div>
            </div>
          )}
        </div>

        {/* PAGINATION */}
        {reviews.length > 0 && (
          <div className="card" style={{ marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                แสดง:
                <select
                  className="input"
                  style={{ width: "80px", marginLeft: "8px" }}
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                รายการต่อหน้า
              </div>

              <div>
                หน้า:
                <select
                  className="input"
                  style={{ width: "80px", marginLeft: "8px" }}
                  value={page}
                  onChange={(e) => setPage(Number(e.target.value))}
                >
                  {Array.from({ length: totalPagesClient }).map((_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* REVIEWS LIST */}
        <div className="reviews-grid">
          {paginatedReviews.map((r, idx) => (
            <div key={idx} className="card review-card">
              <div className="review-header">
                <span className="score">{r.score || "N/A"}</span>

                <div className="review-title-block">
                  <div className="review-title">{r.title || "(ไม่มีหัวข้อ)"}</div>
                  <div className="review-meta">
                    <span className="name">{r.name || "ไม่ระบุชื่อ"}</span>
                    <span className="dot">•</span>
                    <span className="date">{r.date || "-"}</span>
                  </div>
                </div>
              </div>

              <p className="comment">{r.comment || "ไม่มีข้อความรีวิว"}</p>

              {r.reply && (
                <div className="reply-box">
                  <div className="reply-label">การตอบกลับจากโรงแรม</div>
                  <div className="reply-text">{r.reply}</div>
                </div>
              )}
            </div>
          ))}

          {!loading && reviews.length === 0 && !error && (
            <p className="hint">ยังไม่มีข้อมูล ลองใส่ URL แล้วกด เริ่มดึงรีวิว</p>
          )}
        </div>
      </div>
    </main>
  );
}
