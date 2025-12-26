"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { getVideoInfo } from "@/lib/video-utils";
import {
  ApiResponse,
  DictionaryDTO,
  FavoriteToggleResponse,
  ReportRequest,
} from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import styles from "../../../styles/word-detail.module.css";

export default function WordDetailPage() {
  const params = useParams();
  const wordId = params.wordId as string;
  const { isAuthenticated } = useAuthStore();

  const [word, setWord] = useState<DictionaryDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Favorite state
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReportSubmitting, setIsReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState("");

  /**
   * Fetch word detail from API on mount
   *
   * API Contract:
   * - Endpoint: GET /api/dictionary/{id}
   * - Response: ApiResponse<DictionaryDTO>
   * - Public endpoint (no auth required)
   */
  useEffect(() => {
    const fetchWordDetail = async () => {
      if (!wordId) return;

      console.log(`[WordDetail] Fetching word with ID: ${wordId}`);
      setIsLoading(true);
      setError("");

      try {
        const response = await apiClient.get<ApiResponse<DictionaryDTO>>(
          `/dictionary/${wordId}`
        );

        console.log(`[WordDetail] API Response:`, response.data);

        if (response.data.code === 200 && response.data.data) {
          console.log(
            `[WordDetail] Success: Loaded word "${response.data.data.word}"`
          );
          setWord(response.data.data);
        } else {
          const errorMsg = response.data.message || "Không tìm thấy từ vựng";
          console.warn(`[WordDetail] Error:`, errorMsg);
          setError(errorMsg);
        }
      } catch (err: any) {
        console.error("[WordDetail] Fetch error:", err);
        setError(
          err.response?.data?.message || "Lỗi khi tải thông tin từ vựng"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWordDetail();
  }, [wordId]);

  /**
   * Check favorite status after word is loaded
   *
   * API Contract:
   * - Endpoint: GET /api/user/favorites/check/{wordId}
   * - Response: ApiResponse<{wordId, isFavorite}>
   * - Requires authentication
   */
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!word || !isAuthenticated) return;

      console.log(`[WordDetail] Checking favorite status for word ${wordId}`);

      try {
        const response = await apiClient.get<ApiResponse<{wordId: number, isFavorite: boolean}>>(
          `/user/favorites/check/${wordId}`
        );

        if (response.data.code === 200 && response.data.data) {
          const favoriteStatus = response.data.data.isFavorite;
          console.log(`[WordDetail] Favorite status: ${favoriteStatus}`);
          setIsFavorite(favoriteStatus);
        }
      } catch (err: any) {
        console.error("[WordDetail] Error checking favorite:", err);
        // Silently fail - favorite feature is optional
      }
    };

    checkFavoriteStatus();
  }, [word, wordId, isAuthenticated]);

  /**
   * Toggle favorite status
   *
   * API Contract:
   * - Endpoint: POST /api/user/favorites/{wordId}
   * - Body: empty (or can be omitted)
   * - Response: ApiResponse<{wordId, isFavorite}>
   * - Requires authentication
   */
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để sử dụng tính năng yêu thích");
      return;
    }

    console.log(`[WordDetail] Toggling favorite for word ${wordId}`);
    setIsFavoriteLoading(true);

    try {
      const response = await apiClient.post<
        ApiResponse<{wordId: number, isFavorite: boolean}>
      >(`/user/favorites/${wordId}`, {});

      console.log(`[WordDetail] Toggle response:`, response.data);

      if (response.data.code === 200 && response.data.data) {
        const newFavoriteStatus = response.data.data.isFavorite;
        console.log(`[WordDetail] New favorite status: ${newFavoriteStatus}`);
        setIsFavorite(newFavoriteStatus);
      }
    } catch (err: any) {
      console.error("[WordDetail] Error toggling favorite:", err);
      alert(
        err.response?.data?.message ||
          "Lỗi khi thay đổi trạng thái yêu thích. Vui lòng thử lại."
      );
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  /**
   * Submit report
   *
   * API Contract:
   * - Endpoint: POST /api/user/reports
   * - Body: ReportRequest { wordId, reason }
   * - Response: ApiResponse<void> or ApiResponse<ReportDTO>
   * - Requires authentication
   */
  const handleSubmitReport = async () => {
    if (!isAuthenticated) {
      alert("Vui lòng đăng nhập để báo cáo");
      return;
    }

    if (!reportReason.trim()) {
      alert("Vui lòng nhập lý do báo cáo");
      return;
    }

    console.log(
      `[WordDetail] Submitting report for word ${wordId}: ${reportReason}`
    );
    setIsReportSubmitting(true);

    try {
      const requestBody: ReportRequest = {
        wordId: parseInt(wordId),
        reason: reportReason.trim(),
      };

      const response = await apiClient.post<ApiResponse<any>>(
        "/user/reports",
        requestBody
      );

      console.log(`[WordDetail] Report response:`, response.data);

      if (response.data.code === 200 || response.data.code === 201) {
        console.log(`[WordDetail] Report submitted successfully`);
        setReportSuccess("Báo cáo đã được gửi thành công!");
        setReportReason("");
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess("");
        }, 2000);
      }
    } catch (err: any) {
      console.error("[WordDetail] Error submitting report:", err);
      alert(
        err.response?.data?.message || "Lỗi khi gửi báo cáo. Vui lòng thử lại."
      );
    } finally {
      setIsReportSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles["word-detail-container"]}>
        <div style={{ textAlign: "center", padding: "40px" }}>
          ⏳ Đang tải...
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div className={styles["word-detail-container"]}>
        <Link href="/dictionary" className={styles["back-button"]}>
          ← Quay lại từ điển
        </Link>
        <div style={{ textAlign: "center", padding: "40px", color: "#ff4444" }}>
          {error || "Không tìm thấy từ vựng"}
        </div>
      </div>
    );
  }

  return (
    <div className={styles["word-detail-container"]}>
      {/* Header */}
      <div className={styles["detail-header"]}>
        <Link href="/dictionary" className={styles["back-button"]}>
          ← Quay lại từ điển
        </Link>
        <div className={styles["word-title"]}>{word.word.toUpperCase()}</div>
      </div>

      <div className={styles["detail-content"]}>
        {/* Video Section */}
        <div className={styles["main-section"]}>
          <div className={styles["video-section"]}>
            <div className={styles["video-title"]}>VIDEO HƯỚNG DẪN</div>
            <div className={styles["video-container"]}>
              {word.videoUrl ? (
                <video
                  src={word.videoUrl}
                  controls
                  loop
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    backgroundColor: "#000",
                  }}
                >
                  Trình duyệt không hỗ trợ video
                </video>
              ) : (
                <div className={styles["video-placeholder"]}>
                  � Chưa có video hướng dẫn
                  <div style={{ fontSize: "12px", marginTop: "10px", opacity: 0.7 }}>
                    Bạn có thể giúp chúng tôi bằng cách báo cáo và gợi ý video
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Section */}
          <div className={styles["metadata-section"]}>
            <div className={styles["metadata-title"]}>THÔNG TIN</div>

            <div className={styles["metadata-item"]}>
              <div className={styles["metadata-label"]}>ID</div>
              <div className={styles["metadata-value"]}>{wordId}</div>
            </div>

            {word.createdBy && (
              <div className={styles["metadata-item"]}>
                <div className={styles["metadata-label"]}>Tạo bởi</div>
                <div className={styles["metadata-value"]}>{word.createdBy}</div>
              </div>
            )}

            {word.createdAt && (
              <div className={styles["metadata-item"]}>
                <div className={styles["metadata-label"]}>Đã thêm</div>
                <div className={styles["metadata-value"]}>
                  {new Date(word.createdAt).toLocaleDateString("vi-VN")}
                </div>
              </div>
            )}

            {word.updatedAt && (
              <div className={styles["metadata-item"]}>
                <div className={styles["metadata-label"]}>Cập nhật</div>
                <div className={styles["metadata-value"]}>
                  {new Date(word.updatedAt).toLocaleDateString("vi-VN")}
                </div>
              </div>
            )}

            <div className={styles["action-buttons"]}>
              <button
                className={styles.btn}
                onClick={handleToggleFavorite}
                disabled={isFavoriteLoading || !isAuthenticated}
                style={{
                  backgroundColor: isFavorite ? "#00ff41" : "transparent",
                  color: isFavorite ? "#000" : "#00ff41",
                }}
              >
                {isFavoriteLoading
                  ? "⏳"
                  : isFavorite
                  ? "⭐ Đã yêu thích"
                  : "☆ Yêu thích"}
              </button>
              <button
                className={styles.btn}
                onClick={() => setShowReportModal(true)}
                disabled={!isAuthenticated}
              >
                🚨 Báo cáo
              </button>
            </div>

            {!isAuthenticated && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  color: "#888",
                  textAlign: "center",
                }}
              >
                <Link href="/login" style={{ color: "#00ff41" }}>
                  Đăng nhập
                </Link>{" "}
                để sử dụng tính năng này
              </div>
            )}
          </div>
        </div>

        {/* Description Section */}
        <div className={styles["description-section"]}>
          <div className={styles["section-title"]}>MÔ TẢ</div>
          <p className={styles["description-text"]}>
            {word.definition || "Chưa có mô tả cho từ vựng này."}
          </p>
        </div>

        {/* Related Words */}
        <div className={styles["related-words"]}>
          <div className={styles["section-title"]}>TỪ LIÊN QUAN</div>
          <div className={styles["related-grid"]}>
            <div className={styles["related-card"]}>
              <div className={styles["related-icon"]}>👋</div>
              <div className={styles["related-name"]}>Tạm biệt</div>
            </div>
            <div className={styles["related-card"]}>
              <div className={styles["related-icon"]}>🙏</div>
              <div className={styles["related-name"]}>Cảm ơn</div>
            </div>
            <div className={styles["related-card"]}>
              <div className={styles["related-icon"]}>😊</div>
              <div className={styles["related-name"]}>Vui vẻ</div>
            </div>
            <div className={styles["related-card"]}>
              <div className={styles["related-icon"]}>🤝</div>
              <div className={styles["related-name"]}>Gặp gỡ</div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !isReportSubmitting && setShowReportModal(false)}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              border: "2px solid #00ff41",
              padding: "30px",
              borderRadius: "8px",
              maxWidth: "500px",
              width: "90%",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              style={{
                color: "#00ff41",
                marginBottom: "20px",
                fontSize: "18px",
                textTransform: "uppercase",
              }}
            >
              🚨 Báo cáo vấn đề
            </h3>

            {reportSuccess ? (
              <div
                style={{
                  color: "#00ff41",
                  textAlign: "center",
                  padding: "20px",
                }}
              >
                ✓ {reportSuccess}
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "15px" }}>
                  <div style={{ color: "#888", marginBottom: "8px" }}>
                    Từ vựng:{" "}
                    <strong style={{ color: "#fff" }}>{word.word}</strong>
                  </div>
                  <div style={{ color: "#888", fontSize: "14px" }}>
                    Vui lòng mô tả vấn đề bạn gặp phải với từ vựng này
                  </div>
                </div>

                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Ví dụ: Video không chính xác, định nghĩa sai..."
                  disabled={isReportSubmitting}
                  style={{
                    width: "100%",
                    minHeight: "100px",
                    padding: "10px",
                    backgroundColor: "#000",
                    border: "1px solid #00ff41",
                    borderRadius: "4px",
                    color: "#fff",
                    fontSize: "14px",
                    fontFamily: "inherit",
                    resize: "vertical",
                    marginBottom: "20px",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={() => setShowReportModal(false)}
                    disabled={isReportSubmitting}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "transparent",
                      border: "1px solid #666",
                      color: "#fff",
                      borderRadius: "4px",
                      cursor: isReportSubmitting ? "not-allowed" : "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSubmitReport}
                    disabled={isReportSubmitting || !reportReason.trim()}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#00ff41",
                      border: "none",
                      color: "#000",
                      borderRadius: "4px",
                      cursor:
                        isReportSubmitting || !reportReason.trim()
                          ? "not-allowed"
                          : "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                    }}
                  >
                    {isReportSubmitting ? "⏳ Đang gửi..." : "Gửi báo cáo"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
