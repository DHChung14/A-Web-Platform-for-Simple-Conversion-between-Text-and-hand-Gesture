"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { ContributionRequest, ApiResponse } from "@/types/api";
import styles from "../../styles/contribute.module.css";

export default function ContributePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    word: "",
    definition: "",
    videoUrl: "",
  });

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
    if (
      !formData.word.trim() ||
      !formData.definition.trim() ||
      !formData.videoUrl.trim()
    ) {
      setError("Please fill in all information");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("[Contribute] Submitting contribution:", formData);

      const requestBody: ContributionRequest = {
        word: formData.word.trim(),
        definition: formData.definition.trim(),
        videoUrl: formData.videoUrl.trim(),
      };

      const response = await apiClient.post<ApiResponse<any>>(
        "/user/contributions",
        requestBody
      );

      if (response.data.code === 200 || response.data.code === 201) {
        console.log("[Contribute] Contribution submitted successfully");

        // Show success message
        setShowSuccess(true);

        // Clear form
        setFormData({ word: "", definition: "", videoUrl: "" });

        // Redirect after 3 seconds
        setTimeout(() => {
          router.push("/dashboard");
        }, 3000);
      } else {
        throw new Error(
          response.data.message || "Failed to submit contribution"
        );
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || err.message || "Failed to submit contribution";
      console.error("[Contribute] Submission error:", errorMsg);
      setError(errorMsg);
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/dictionary");
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

            {/* Video URL Field */}
            <div className={styles["form-group"]}>
              <label className={styles["form-label"]} htmlFor="videoInput">
                Video URL (YouTube)
              </label>
              <input
                type="url"
                id="videoInput"
                className={styles["form-input"]}
                placeholder="e.g., https://youtu.be/..."
                value={formData.videoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, videoUrl: e.target.value })
                }
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Button Group */}
            <div className={styles["button-group"]}>
              <button
                type="submit"
                className={styles.btn}
                disabled={isSubmitting}
              >
                {isSubmitting ? "SUBMITTING..." : "SUBMIT DATA"}
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
