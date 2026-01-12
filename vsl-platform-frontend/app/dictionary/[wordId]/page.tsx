"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { getVideoInfo } from "@/lib/video-utils";
import { ApiResponse, DictionaryDTO, ReportRequest } from "@/types/api";
import { useAuthStore } from "@/stores/auth-store";
import styles from "../../../styles/word-detail.module.css";

export default function WordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const wordId = params.wordId as string;
  const { isAuthenticated, role, isGuest } = useAuthStore();

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
  const [reportError, setReportError] = useState("");
  const [existingOpenReport, setExistingOpenReport] = useState<{
    id: number;
    reason: string;
  } | null>(null);
  const [isCheckingReport, setIsCheckingReport] = useState(false);

  // Share state
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  /**
   * Fetch word detail from API on mount
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
          const errorMsg = response.data.message || "Word not found";
          console.warn(`[WordDetail] Error:`, errorMsg);
          setError(errorMsg);
        }
      } catch (err: unknown) {
        console.error("[WordDetail] Fetch error:", err);
        setError(
          err instanceof Error
            ? (err as { response?: { data?: { message?: string } } }).response
                ?.data?.message || err.message
            : "Error loading word information"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchWordDetail();
  }, [wordId]);

  /**
   * Check if user has an OPEN report for this word
   */
  useEffect(() => {
    const checkExistingReport = async () => {
      if (!isAuthenticated || !wordId) {
        setExistingOpenReport(null);
        return;
      }

      try {
        const response = await apiClient.get<
          ApiResponse<{
            id: number;
            dictionaryId: number;
            word: string;
            reason: string;
            status: string;
            createdAt: string;
            updatedAt: string;
          } | null>
        >(`/user/reports/word/${wordId}`);

        if (response.data && response.data.data) {
          setExistingOpenReport({
            id: response.data.data.id,
            reason: response.data.data.reason,
          });
        } else {
          setExistingOpenReport(null);
        }
      } catch (error: unknown) {
        console.error("[WordDetail] Error checking existing report:", error);
        setExistingOpenReport(null);
      }
    };

    checkExistingReport();
  }, [wordId, isAuthenticated]);

  /**
   * Pre-fill report reason when opening modal if existing report exists
   */
  useEffect(() => {
    if (showReportModal && existingOpenReport) {
      setReportReason(existingOpenReport.reason);
    } else if (showReportModal && !existingOpenReport) {
      setReportReason("");
    }
    // Clear error when opening/closing modal
    if (showReportModal) {
      setReportError("");
      setReportSuccess("");
    }
  }, [showReportModal, existingOpenReport]);

  /**
   * Close share menu when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-share-menu]")) {
        setShowShareMenu(false);
      }
    };

    if (showShareMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showShareMenu]);

  /**
   * Check favorite status after word is loaded
   */
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!word || !isAuthenticated) return;

      console.log(`[WordDetail] Checking favorite status for word ${wordId}`);

      try {
        const response = await apiClient.get<
          ApiResponse<{ wordId: number; isFavorite: boolean }>
        >(`/user/favorites/check/${wordId}`);

        if (response.data.code === 200 && response.data.data) {
          const favoriteStatus = response.data.data.isFavorite;
          console.log(`[WordDetail] Favorite status: ${favoriteStatus}`);
          setIsFavorite(favoriteStatus);
        }
      } catch (err: unknown) {
        console.error("[WordDetail] Error checking favorite:", err);
        // Silently fail - favorite feature is optional
      }
    };

    checkFavoriteStatus();
  }, [word, wordId, isAuthenticated]);

  /**
   * Toggle favorite status
   */
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      alert("Please log in to use the favorite feature");
      return;
    }

    console.log(`[WordDetail] Toggling favorite for word ${wordId}`);
    setIsFavoriteLoading(true);

    try {
      const response = await apiClient.post<
        ApiResponse<{ wordId: number; isFavorite: boolean }>
      >(`/user/favorites/${wordId}`, {});

      console.log(`[WordDetail] Toggle response:`, response.data);

      if (response.data.code === 200 && response.data.data) {
        const newFavoriteStatus = response.data.data.isFavorite;
        console.log(`[WordDetail] New favorite status: ${newFavoriteStatus}`);
        setIsFavorite(newFavoriteStatus);
      }
    } catch (err: unknown) {
      console.error("[WordDetail] Error toggling favorite:", err);
      alert(
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || err.message
          : "Error changing favorite status. Please try again."
      );
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  /**
   * Copy link to clipboard
   */
  const handleCopyLink = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
        setShowShareMenu(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      alert("Failed to copy link. Please try again.");
    }
  };

  /**
   * Share to social media
   */
  const handleShare = async (platform: "twitter" | "facebook" | "whatsapp") => {
    const url = window.location.href;
    const text = `Check out this VSL word: ${word?.word}`;
    let shareUrl = "";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          text
        )}&url=${encodeURIComponent(url)}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          url
        )}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(
          text + " " + url
        )}`;
        break;
    }

    window.open(shareUrl, "_blank", "width=600,height=400");
    setShowShareMenu(false);
  };

  /**
   * Submit report
   */
  const handleSubmitReport = async () => {
    if (!isAuthenticated) {
      setReportError("Please log in to submit a report");
      return;
    }

    if (!reportReason.trim()) {
      setReportError("Please enter a report reason");
      return;
    }

    // Check if there are actual changes (for update case)
    if (existingOpenReport) {
      const trimmedReason = reportReason.trim();
      if (trimmedReason === existingOpenReport.reason) {
        // No changes detected - silently close modal without alert
        setShowReportModal(false);
        setReportReason("");
        setReportError("");
        return;
      }
    }

    // Clear previous errors
    setReportError("");
    setReportSuccess("");

    console.log(
      `[WordDetail] Submitting report for word ${wordId}: ${reportReason}`
    );
    setIsReportSubmitting(true);

    try {
      const requestBody: ReportRequest = {
        wordId: parseInt(wordId),
        reason: reportReason.trim(),
      };

      const response = await apiClient.post<ApiResponse<unknown>>(
        "/user/reports",
        requestBody
      );

      console.log(`[WordDetail] Report response:`, response.data);

      if (response.data.code === 200 || response.data.code === 201) {
        console.log(`[WordDetail] Report processed successfully`);

        // Reload existing report after submission
        const checkReport = async () => {
          try {
            const checkResponse = await apiClient.get<
              ApiResponse<{
                id: number;
                dictionaryId: number;
                word: string;
                reason: string;
                status: string;
                createdAt: string;
                updatedAt: string;
              } | null>
            >(`/user/reports/word/${wordId}`);
            if (checkResponse.data && checkResponse.data.data) {
              setExistingOpenReport({
                id: checkResponse.data.data.id,
                reason: checkResponse.data.data.reason,
              });
            } else {
              setExistingOpenReport(null);
            }
          } catch (err) {
            console.error(
              "[WordDetail] Error checking report after submit:",
              err
            );
          }
        };
        checkReport();

        // Check message to determine if it was updated or created
        const message = response.data.message || "";
        if (
          message.toLowerCase().includes("updated") ||
          message.toLowerCase().includes("already") ||
          existingOpenReport
        ) {
          setReportSuccess("✓ Your report has been updated successfully!");
        } else {
          setReportSuccess("✓ Report submitted successfully!");
        }
        setReportReason("");
        setTimeout(() => {
          setShowReportModal(false);
          setReportSuccess("");
        }, 3000);
      }
    } catch (err: unknown) {
      console.error("[WordDetail] Error submitting report:", err);

      // Extract error message
      let errorMessage = "Error submitting report. Please try again.";
      if (err instanceof Error) {
        const errorResponse = err as {
          response?: { data?: { message?: string } };
        };
        errorMessage = errorResponse.response?.data?.message || err.message;
      }

      // Set error message to display in modal
      setReportError(errorMessage);
    } finally {
      setIsReportSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#050505" }}>
        <div className={styles["status-bar"]}>
          <div className={styles["status-item"]}>
            <span className={styles["status-indicator"]}></span>
            <span>&gt; SYSTEM: WORD_DETAIL_VIEW</span>
          </div>
          <div className={styles["status-item"]}>
            <span style={{ fontSize: "11px" }}>REC: LOADING...</span>
          </div>
        </div>
        <div style={{ textAlign: "center", padding: "40px", color: "#00ff41" }}>
          &gt; LOADING...
        </div>
      </div>
    );
  }

  if (error || !word) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#050505" }}>
        <div className={styles["status-bar"]}>
          <div className={styles["status-item"]}>
            <span className={styles["status-indicator"]}></span>
            <span>&gt; SYSTEM: ERROR</span>
          </div>
        </div>
        <div className={styles["container"]}>
          <button
            className={styles["back-button"]}
            onClick={() => router.back()}
          >
            &lt; BACK
          </button>
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#ff4444",
            }}
          >
            {error || "Word not found"}
          </div>
        </div>
      </div>
    );
  }

  const videoInfo = word.videoUrl ? getVideoInfo(word.videoUrl) : null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#050505" }}>
      {/* Status Bar */}
      <div className={styles["status-bar"]}>
        <div className={styles["status-item"]}>
          <span className={styles["status-indicator"]}></span>
          <span>&gt; SYSTEM: WORD_DETAIL_VIEW</span>
        </div>
        <div className={styles["status-item"]}>
          <span style={{ fontSize: "11px" }}>REC: LIVE</span>
        </div>
      </div>

      {/* Main Container */}
      <div className={styles["container"]}>
        {/* Back Button */}
        <button className={styles["back-button"]} onClick={() => router.back()}>
          &lt; BACK
        </button>

        {/* Main Grid */}
        <div className={styles["main-grid"]}>
          {/* Left: Video */}
          <div className={styles["left-section"]}>
            <div className={styles["video-container"]}>
              {word.videoUrl && videoInfo ? (
                <>
                  {videoInfo.type === "youtube" ? (
                    <iframe
                      className={styles["video-frame"]}
                      src={videoInfo.embedUrl}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : videoInfo.type === "vimeo" ? (
                    <iframe
                      className={styles["video-frame"]}
                      src={videoInfo.embedUrl}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <video
                      className={styles["video-frame"]}
                      src={word.videoUrl}
                      controls
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                        backgroundColor: "#000",
                      }}
                    >
                      Trình duyệt không hỗ trợ video
                    </video>
                  )}
                  {/* Scanlines overlay */}
                  <div className={styles["video-scanlines"]}></div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    color: "#00ff41",
                    fontSize: "18px",
                  }}
                >
                  🎥 Chưa có video hướng dẫn
                </div>
              )}
            </div>
            <div className={styles["video-label"]}>
              [VIDEO_GESTURE_DEMONSTRATION] ID: #VID_{wordId}
            </div>
          </div>

          {/* Right: Data */}
          <div className={styles["right-section"]}>
            {/* Word Title */}
            <h1 className={styles["word-title"]}>{word.word.toUpperCase()}</h1>

            {/* Definition */}
            <div className={styles["definition-block"]}>
              <div className={styles["definition-label"]}>&gt; DEFINITION</div>
              <div className={styles["definition-text"]}>
                {word.definition || "Chưa có định nghĩa cho từ này."}
              </div>
            </div>

            {/* Metadata */}
            <div className={styles["metadata"]}>
              {word.createdAt && (
                <div className={styles["metadata-item"]}>
                  <div className={styles["metadata-label"]}>
                    &gt; CREATED_AT
                  </div>
                  <div className={styles["metadata-value"]}>
                    {new Date(word.createdAt).toLocaleDateString("en-GB", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              )}
              {word.createdBy && (
                <div className={styles["metadata-item"]}>
                  <div className={styles["metadata-label"]}>&gt; AUTHOR</div>
                  <div className={styles["metadata-value"]}>
                    {word.createdBy.toUpperCase()}
                  </div>
                </div>
              )}
              <div className={styles["metadata-item"]}>
                <div className={styles["metadata-label"]}>&gt; CATEGORY</div>
                <div className={styles["metadata-value"]}>COMMUNICATION</div>
              </div>
              <div className={styles["metadata-item"]}>
                <div className={styles["metadata-label"]}>&gt; DIFFICULTY</div>
                <div className={styles["metadata-value"]}>INTERMEDIATE</div>
              </div>
            </div>

            {/* Action Bar */}
            <div
              className={styles["action-bar"]}
              style={{ position: "relative" }}
            >
              {/* Favorite button - only show for authenticated users */}
              {isAuthenticated && role && role.toUpperCase() === "USER" && (
                <button
                  className={`${styles["action-button"]} ${
                    styles["favorite"]
                  } ${isFavorite ? styles["active"] : ""}`}
                  id="favoriteBtn"
                  onClick={handleToggleFavorite}
                  disabled={isFavoriteLoading}
                >
                  {isFavoriteLoading ? (
                    <span>⏳</span>
                  ) : isFavorite ? (
                    <>
                      <i className="fas fa-heart"></i> FAVORITED
                    </>
                  ) : (
                    <>
                      <i className="far fa-heart"></i> FAVORITE
                    </>
                  )}
                </button>
              )}
              <div style={{ position: "relative" }} data-share-menu>
                <button
                  className={styles["action-button"]}
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  style={{
                    borderColor: "#00ff41",
                    color: "#00ff41",
                  }}
                >
                  <i className="fas fa-share-alt"></i> SHARE
                </button>
                {showShareMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      marginTop: "8px",
                      backgroundColor: "#0a0a0a",
                      border: "2px solid #00ff41",
                      borderRadius: "4px",
                      minWidth: "180px",
                      zIndex: 1000,
                      boxShadow: "0 0 20px rgba(0, 255, 65, 0.3)",
                    }}
                  >
                    <button
                      onClick={handleCopyLink}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        backgroundColor: "transparent",
                        border: "none",
                        color: copySuccess ? "#00ff41" : "#00ff41",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "Courier New, monospace",
                        fontSize: "12px",
                        borderBottom: "1px solid rgba(0, 255, 65, 0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(0, 255, 65, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {copySuccess ? "✓ Link Copied!" : "📋 Copy Link"}
                    </button>
                    <button
                      onClick={() => handleShare("facebook")}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        backgroundColor: "transparent",
                        border: "none",
                        color: "#00ff41",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "Courier New, monospace",
                        fontSize: "12px",
                        borderBottom: "1px solid rgba(0, 255, 65, 0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(0, 255, 65, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      📘 Share on Facebook
                    </button>
                    <button
                      onClick={() => handleShare("twitter")}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        backgroundColor: "transparent",
                        border: "none",
                        color: "#00ff41",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "Courier New, monospace",
                        fontSize: "12px",
                        borderBottom: "1px solid rgba(0, 255, 65, 0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(0, 255, 65, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      🐦 Share on Twitter
                    </button>
                    <button
                      onClick={() => handleShare("whatsapp")}
                      style={{
                        width: "100%",
                        padding: "12px 16px",
                        backgroundColor: "transparent",
                        border: "none",
                        color: "#00ff41",
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "Courier New, monospace",
                        fontSize: "12px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor =
                          "rgba(0, 255, 65, 0.1)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      💬 Share on WhatsApp
                    </button>
                  </div>
                )}
              </div>
              {/* Report button - only show for authenticated users */}
              {isAuthenticated && role && role.toUpperCase() === "USER" && (
                <button
                  className={`${styles["action-button"]} ${styles["report"]}`}
                  onClick={() => setShowReportModal(true)}
                >
                  <i className="fas fa-flag"></i>{" "}
                  {existingOpenReport ? "UPDATE REPORT" : "REPORT"}
                </button>
              )}
            </div>

            {/* Show login prompt for guests */}
            {(isGuest ||
              !isAuthenticated ||
              (role && role.toUpperCase() !== "USER")) && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "12px",
                  color: "#888",
                  textAlign: "center",
                }}
              >
                <Link href="/login" style={{ color: "#00ff41" }}>
                  Log in
                </Link>{" "}
                to use favorite and report features
              </div>
            )}
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
              {existingOpenReport ? "✏️ Update Report" : "🚨 Report Issue"}
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
                    Word: <strong style={{ color: "#fff" }}>{word.word}</strong>
                  </div>

                  {/* Error message display */}
                  {reportError && (
                    <div
                      style={{
                        color: "#ff4444",
                        fontSize: "13px",
                        marginBottom: "12px",
                        padding: "12px",
                        backgroundColor: "rgba(255, 68, 68, 0.1)",
                        border: "1px solid #ff4444",
                        borderRadius: "4px",
                        lineHeight: "1.5",
                      }}
                    >
                      🚨 {reportError}
                    </div>
                  )}

                  {existingOpenReport && !reportError && (
                    <div
                      style={{
                        color: "#ffc107",
                        fontSize: "12px",
                        marginBottom: "8px",
                        padding: "8px",
                        backgroundColor: "rgba(255, 193, 7, 0.1)",
                        border: "1px solid #ffc107",
                        borderRadius: "4px",
                      }}
                    >
                      ℹ️ You already have an OPEN report for this word. You can
                      update it below.
                    </div>
                  )}
                  <div style={{ color: "#888", fontSize: "14px" }}>
                    {existingOpenReport
                      ? "Update your report reason:"
                      : "Please describe the issue you encountered with this word"}
                  </div>
                </div>

                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Example: Video is inaccurate, definition is wrong..."
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
                    Cancel
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
                    {isReportSubmitting
                      ? "⏳ Submitting..."
                      : existingOpenReport
                      ? "UPDATE REPORT"
                      : "SUBMIT REPORT"}
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
