"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  ContributionRequest,
  ContributionDTO,
  ApiResponse,
} from "@/types/api";
import styles from "../../styles/contribute.module.css";

export default function ContributePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoOption, setVideoOption] = useState<"url" | "upload">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    word: "",
    definition: "",
    videoUrl: "",
  });

  const handleCancel = () => {
    router.push("/dictionary");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("video/")) {
        setError("Please select a video file");
        return;
      }

      // Validate file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        setError("File size must be less than 50MB");
        return;
      }

      setSelectedFile(file);
      setError(null);

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const handleUploadVideo = async (): Promise<string | null> => {
    if (!selectedFile) {
      setError("Please select a video file");
      return null;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Get token for auth
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Please log in to upload video");
      }

      const response = await apiClient.post<ApiResponse<string>>(
        "/upload/video",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.code === 200 && response.data.data) {
        return response.data.data;
      } else {
        throw new Error(response.data.message || "Failed to upload video");
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || err.message
          : "Failed to upload video";
      setError(errorMsg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Check authentication
    if (!isAuthenticated) {
      alert("⚠️ Please log in to submit a contribution");
      router.push("/login");
      return;
    }

    // Validate form data
    if (!formData.word.trim() || !formData.definition.trim()) {
      setError("Please fill in word and definition");
      return;
    }

    let finalVideoUrl = formData.videoUrl.trim();

    // If upload option is selected, upload file first
    if (videoOption === "upload") {
      if (!selectedFile) {
        setError("Please select a video file to upload");
        return;
      }

      setIsSubmitting(true);

      const uploadedUrl = await handleUploadVideo();
      if (!uploadedUrl) {
        setIsSubmitting(false);
        return; // Error already set by handleUploadVideo
      }

      finalVideoUrl = uploadedUrl;
    } else {
      // URL option
      if (!finalVideoUrl) {
        setError("Please enter a video URL or upload a video file");
        return;
      }
      setIsSubmitting(true);
    }

    try {
      console.log("[Contribute] Submitting contribution:", {
        word: formData.word.trim(),
        definition: formData.definition.trim(),
        videoUrl: finalVideoUrl,
      });

      const requestBody: ContributionRequest = {
        word: formData.word.trim(),
        definition: formData.definition.trim(),
        videoUrl: finalVideoUrl,
      };

      const response = await apiClient.post<ApiResponse<ContributionDTO>>(
        "/user/contributions",
        requestBody
      );

      if (response.data.code === 200 || response.data.code === 201) {
        console.log("[Contribute] Contribution submitted successfully");

        // Show success message
        setShowSuccess(true);

        // Clear form
        setFormData({ word: "", definition: "", videoUrl: "" });
        setSelectedFile(null);
        setVideoPreview(null);
        setVideoOption("url");

        // Redirect after 3 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } else {
        throw new Error(
          response.data.message || "Failed to submit contribution"
        );
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || err.message
          : "Failed to submit contribution";
      console.error("[Contribute] Submission error:", errorMsg);
      setError(errorMsg);
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Status Bar */}
      <div className={styles["status-bar"]}>
        <div className={styles["status-item"]}>
          <span className={styles["status-indicator"]}></span>
          <span>&gt; SYSTEM: UPLOAD PROTOCOL INITIATED</span>
        </div>
      </div>

      {/* Main Container */}
      <div className={styles.container}>
        {/* Form Container */}
        <div className={styles["form-container"]}>
          <div className={styles["form-title"]}>CONTRIBUTE NEW WORD</div>

          <form id="contributeForm" onSubmit={handleSubmit}>
            {error && <div className={styles["error-message"]}>⚠️ {error}</div>}

            {/* Word Field */}
            <div className={styles["form-group"]}>
              <label className={styles["form-label"]} htmlFor="wordInput">
                Word
              </label>
              <input
                type="text"
                id="wordInput"
                className={styles["form-input"]}
                placeholder="e.g., Hello"
                value={formData.word}
                onChange={(e) =>
                  setFormData({ ...formData, word: e.target.value })
                }
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Definition Field */}
            <div className={styles["form-group"]}>
              <label className={styles["form-label"]} htmlFor="definitionInput">
                Definition
              </label>
              <textarea
                id="definitionInput"
                className={styles["form-textarea"]}
                placeholder="Enter the meaning of the word..."
                value={formData.definition}
                onChange={(e) =>
                  setFormData({ ...formData, definition: e.target.value })
                }
                required
                disabled={isSubmitting}
              ></textarea>
            </div>

            {/* Video Field - Option to Upload or URL */}
            <div className={styles["form-group"]}>
              <label className={styles["form-label"]}>
                Video (Upload or URL)
              </label>

              {/* Option Toggle */}
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginBottom: "12px",
                  border: "1px solid #333",
                  borderRadius: "4px",
                  padding: "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setVideoOption("url");
                    setSelectedFile(null);
                    setVideoPreview(null);
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background:
                      videoOption === "url" ? "#0066cc" : "transparent",
                    color: videoOption === "url" ? "#fff" : "#888",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  📹 Video URL
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVideoOption("upload");
                    setFormData({ ...formData, videoUrl: "" });
                  }}
                  disabled={isSubmitting}
                  style={{
                    flex: 1,
                    padding: "8px",
                    background:
                      videoOption === "upload" ? "#0066cc" : "transparent",
                    color: videoOption === "upload" ? "#fff" : "#888",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                  }}
                >
                  📤 Upload Video
                </button>
              </div>

              {/* Video URL Input */}
              {videoOption === "url" && (
                <input
                  type="url"
                  id="videoInput"
                  className={styles["form-input"]}
                  placeholder="e.g., https://youtu.be/... or https://youtube.com/..."
                  value={formData.videoUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, videoUrl: e.target.value })
                  }
                  required={videoOption === "url"}
                  disabled={isSubmitting}
                />
              )}

              {/* File Upload Input */}
              {videoOption === "upload" && (
                <div>
                  <input
                    type="file"
                    id="videoFileInput"
                    accept="video/*"
                    onChange={handleFileChange}
                    disabled={isSubmitting || uploading}
                    style={{
                      width: "100%",
                      padding: "8px",
                      background: "#1a1a1a",
                      border: "1px solid #333",
                      borderRadius: "4px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                  {selectedFile && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "12px",
                        background: "rgba(0, 102, 204, 0.1)",
                        border: "1px solid #0066cc",
                        borderRadius: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <div style={{ marginBottom: "8px" }}>
                        <strong>Selected:</strong> {selectedFile.name} (
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)
                      </div>
                      {videoPreview && (
                        <video
                          src={videoPreview}
                          controls
                          style={{
                            width: "100%",
                            maxHeight: "300px",
                            borderRadius: "4px",
                            marginTop: "8px",
                          }}
                        />
                      )}
                    </div>
                  )}
                  {uploading && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#ffaa00",
                        fontSize: "12px",
                      }}
                    >
                      ⏳ Uploading video...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Button Group */}
            <div className={styles["button-group"]}>
              <button
                type="submit"
                className={styles.btn}
                disabled={isSubmitting || uploading}
              >
                {uploading
                  ? "UPLOADING..."
                  : isSubmitting
                  ? "SUBMITTING..."
                  : "SUBMIT DATA"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles["btn-secondary"]}`}
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                CANCEL
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className={`${styles["success-message"]} ${styles.active}`}>
          <div style={{ fontSize: "18px", marginBottom: "12px" }}>
            ✓ CONTRIBUTION SUBMITTED SUCCESSFULLY
          </div>
          <div
            style={{
              fontSize: "14px",
              marginBottom: "12px",
              letterSpacing: "1px",
            }}
          >
            Your contribution has been submitted successfully!
          </div>
          <div
            style={{
              fontSize: "12px",
              marginBottom: "24px",
              letterSpacing: "1px",
              color: "#ffaa00",
            }}
          >
            📋 Status: <strong>PENDING</strong> (Awaiting review)
            <br />
            <span style={{ fontSize: "11px", opacity: 0.8 }}>
              Administrators will review and approve your contribution.
            </span>
          </div>
          <button
            className={styles.btn}
            onClick={() => router.push("/dashboard")}
            style={{ width: "100%" }}
          >
            RETURN TO DASHBOARD
          </button>
        </div>
      )}
    </div>
  );
}
