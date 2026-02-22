"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type {
  ApiResponse,
  UserDTO,
  SearchHistoryDTO,
  FavoriteDTO,
  ReportDTO,
  ContributionDTO,
} from "@/types/api";
import styles from "../../styles/profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditModal, setShowEditModal] = useState(false);

  // --- PHẦN THÊM VÀO: State dữ liệu thật ---
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // State cho History và Favorites
  const [searchHistory, setSearchHistory] = useState<SearchHistoryDTO[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [favorites, setFavorites] = useState<FavoriteDTO[]>([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [favoritesPage] = useState(0);
  const [favoritesSize] = useState(20); // Show more items in profile page

  // State cho Reports và Contributions
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [reportsError, setReportsError] = useState<string | null>(null);
  const [editingReportId, setEditingReportId] = useState<number | null>(null);
  const [editReportReason, setEditReportReason] = useState("");
  const [isUpdatingReport, setIsUpdatingReport] = useState(false);

  const [contributions, setContributions] = useState<ContributionDTO[]>([]);
  const [isContributionsLoading, setIsContributionsLoading] = useState(false);
  const [contributionsError, setContributionsError] = useState<string | null>(
    null
  );

  // State cho limits
  const [limits, setLimits] = useState<{
    openReportsCount: number;
    pendingContributionsCount: number;
    maxReports: number;
    maxContributions: number;
  } | null>(null);
  const [isLimitsLoading, setIsLimitsLoading] = useState(false);

  // --- PHẦN THÊM VÀO: Call API lấy thông tin user ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log("🚀 Calling API to get information...");
        const response = await apiClient.get<ApiResponse<UserDTO>>(
          "/user/profile"
        );

        if (response.data && response.data.data) {
          setUser(response.data.data);
        }
      } catch (error: unknown) {
        console.error("Error fetching information:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Fetch search history when history tab is active
  useEffect(() => {
    const fetchHistory = async () => {
      if (activeTab !== "history" || !user) return;

      setIsHistoryLoading(true);
      setHistoryError(null);

      try {
        const response = await apiClient.get<ApiResponse<SearchHistoryDTO[]>>(
          "/user/history"
        );

        if (response.data && response.data.data) {
          setSearchHistory(response.data.data);
        }
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || error.message
            : "Failed to load search history";
        setHistoryError(errorMsg || "Failed to load search history");
        console.error("Error fetching history:", error);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [activeTab, user]);

  // Fetch favorites when favorites tab is active
  useEffect(() => {
    const fetchFavorites = async () => {
      if (activeTab !== "favorites" || !user) return;

      setIsFavoritesLoading(true);
      setFavoritesError(null);

      try {
        const response = await apiClient.get<ApiResponse<FavoriteDTO[]>>(
          "/user/favorites",
          {
            params: { page: favoritesPage, size: favoritesSize },
          }
        );

        if (response.data && response.data.data) {
          setFavorites(response.data.data);
        }
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || error.message
            : "Failed to load favorites";
        setFavoritesError(errorMsg || "Failed to load favorites");
        console.error("Error fetching favorites:", error);
      } finally {
        setIsFavoritesLoading(false);
      }
    };

    fetchFavorites();
  }, [activeTab, user, favoritesPage, favoritesSize]);

  // Fetch reports when reports tab is active
  useEffect(() => {
    const fetchReports = async () => {
      if (activeTab !== "reports" || !user) return;

      setIsReportsLoading(true);
      setReportsError(null);

      try {
        const response = await apiClient.get<ApiResponse<ReportDTO[]>>(
          "/user/reports"
        );

        if (response.data && response.data.data) {
          setReports(response.data.data);
        }
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || error.message
            : "Failed to load reports";
        setReportsError(errorMsg || "Failed to load reports");
        console.error("Error fetching reports:", error);
      } finally {
        setIsReportsLoading(false);
      }
    };

    fetchReports();
  }, [activeTab, user]);

  // Fetch contributions when contributions tab is active
  useEffect(() => {
    const fetchContributions = async () => {
      if (activeTab !== "contributions" || !user) return;

      setIsContributionsLoading(true);
      setContributionsError(null);

      try {
        const response = await apiClient.get<ApiResponse<ContributionDTO[]>>(
          "/user/contributions"
        );

        if (response.data && response.data.data) {
          setContributions(response.data.data);
        }
      } catch (error: unknown) {
        const errorMsg =
          error instanceof Error
            ? (error as { response?: { data?: { message?: string } } }).response
                ?.data?.message || error.message
            : "Failed to load contributions";
        setContributionsError(errorMsg || "Failed to load contributions");
        console.error("Error fetching contributions:", error);
      } finally {
        setIsContributionsLoading(false);
      }
    };

    fetchContributions();
  }, [activeTab, user]);

  // Fetch user limits
  useEffect(() => {
    const fetchLimits = async () => {
      if (!user) return;

      setIsLimitsLoading(true);
      try {
        const response = await apiClient.get<
          ApiResponse<{
            openReportsCount: number;
            pendingContributionsCount: number;
            maxReports: number;
            maxContributions: number;
          }>
        >("/user/limits");

        if (response.data && response.data.data) {
          setLimits(response.data.data);
        }
      } catch (error: unknown) {
        console.error("Error fetching limits:", error);
      } finally {
        setIsLimitsLoading(false);
      }
    };
    fetchLimits();
  }, [user, reports, contributions]); // Reload when reports/contributions change

  // Handle edit report
  const handleStartEditReport = (report: ReportDTO) => {
    if (report.status !== "OPEN") {
      alert("You can only edit OPEN reports");
      return;
    }
    setEditingReportId(report.id);
    setEditReportReason(report.reason);
  };

  const handleCancelEditReport = () => {
    setEditingReportId(null);
    setEditReportReason("");
  };

  const handleUpdateReport = async (reportId: number) => {
    if (!editReportReason.trim()) {
      alert("Please enter a report reason");
      return;
    }

    // Check if there are actual changes
    const report = reports.find((r) => r.id === reportId);
    if (report && editReportReason.trim() === report.reason) {
      // No changes detected - silently close edit mode without alert
      setEditingReportId(null);
      setEditReportReason("");
      return;
    }

    setIsUpdatingReport(true);
    try {
      const response = await apiClient.put<ApiResponse<ReportDTO>>(
        `/user/reports/${reportId}`,
        {
          wordId: reports.find((r) => r.id === reportId)?.dictionaryId || 0,
          reason: editReportReason.trim(),
        }
      );

      if (response.data && response.data.data) {
        // Update the report in the list
        setReports(
          reports.map((r) => (r.id === reportId ? response.data.data! : r))
        );
        setEditingReportId(null);
        setEditReportReason("");
        // Reload reports to get fresh data
        const fetchReports = async () => {
          try {
            setIsReportsLoading(true);
            const response = await apiClient.get<ApiResponse<ReportDTO[]>>(
              "/user/reports"
            );
            if (response.data && response.data.data) {
              setReports(response.data.data);
            }
          } catch (err) {
            console.error("Error reloading reports:", err);
          } finally {
            setIsReportsLoading(false);
          }
        };
        fetchReports();
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || error.message
          : "Failed to update report";
      alert(errorMsg);
    } finally {
      setIsUpdatingReport(false);
    }
  };

  const handleCancelReport = async (reportId: number) => {
    if (!confirm("Are you sure you want to cancel this report?")) {
      return;
    }

    try {
      const response = await apiClient.put<ApiResponse<ReportDTO>>(
        `/user/reports/${reportId}/cancel`
      );

      if (response.data && response.data.data) {
        // Reload reports to get fresh data
        const fetchReports = async () => {
          try {
            setIsReportsLoading(true);
            const response = await apiClient.get<ApiResponse<ReportDTO[]>>(
              "/user/reports"
            );
            if (response.data && response.data.data) {
              setReports(response.data.data);
            }
          } catch (err) {
            console.error("Error reloading reports:", err);
          } finally {
            setIsReportsLoading(false);
          }
        };
        fetchReports();
        // Reload limits
        const fetchLimits = async () => {
          try {
            const response = await apiClient.get<
              ApiResponse<{
                openReportsCount: number;
                pendingContributionsCount: number;
                maxReports: number;
                maxContributions: number;
              }>
            >("/user/limits");
            if (response.data && response.data.data) {
              setLimits(response.data.data);
            }
          } catch (err) {
            console.error("Error reloading limits:", err);
          }
        };
        fetchLimits();
        alert("Report cancelled successfully!");
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || error.message
          : "Failed to cancel report";
      alert(errorMsg);
    }
  };

  const handleCancelContribution = async (contributionId: number) => {
    if (!confirm("Are you sure you want to cancel this contribution?")) {
      return;
    }

    try {
      const response = await apiClient.put<ApiResponse<ContributionDTO>>(
        `/user/contributions/${contributionId}/cancel`
      );

      if (response.data && response.data.data) {
        // Reload contributions to get fresh data
        const fetchContributions = async () => {
          try {
            setIsContributionsLoading(true);
            const response = await apiClient.get<
              ApiResponse<ContributionDTO[]>
            >("/user/contributions");
            if (response.data && response.data.data) {
              setContributions(response.data.data);
            }
          } catch (err) {
            console.error("Error reloading contributions:", err);
          } finally {
            setIsContributionsLoading(false);
          }
        };
        fetchContributions();
        // Reload limits
        const fetchLimits = async () => {
          try {
            const response = await apiClient.get<
              ApiResponse<{
                openReportsCount: number;
                pendingContributionsCount: number;
                maxReports: number;
                maxContributions: number;
              }>
            >("/user/limits");
            if (response.data && response.data.data) {
              setLimits(response.data.data);
            }
          } catch (err) {
            console.error("Error reloading limits:", err);
          }
        };
        fetchLimits();
        alert("Contribution cancelled successfully!");
      }
    } catch (error: unknown) {
      const errorMsg =
        error instanceof Error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message || error.message
          : "Failed to cancel contribution";
      alert(errorMsg);
    }
  };

  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // Call API đổi mật khẩu (giữ nguyên logic của bạn nhưng sửa lại cho gọn)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Password confirmation does not match");
      return;
    }
    setIsPasswordChanging(true);
    try {
      await apiClient.put<ApiResponse<null>>("/user/profile/password", {
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess("✓ Password changed successfully!");
      setPasswordForm({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || err.message
          : "Failed to change password";
      setPasswordError(errorMsg || "Failed to change password");
    } finally {
      setIsPasswordChanging(false);
    }
  };

  // --- PHẦN SỬA ĐỔI: Call API Cập nhật Profile ---
  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const form = e.target as HTMLFormElement;
    const updatedData = {
      fullName: (form.elements.namedItem("fullName") as HTMLInputElement).value,
      phoneNumber: (form.elements.namedItem("phoneNumber") as HTMLInputElement)
        .value,
      dateOfBirth: (form.elements.namedItem("dateOfBirth") as HTMLInputElement)
        .value,
      address: (form.elements.namedItem("address") as HTMLInputElement).value,
      bio: (form.elements.namedItem("bio") as HTMLTextAreaElement).value,
      avatarUrl: (form.elements.namedItem("avatarUrl") as HTMLInputElement)
        .value,
    };

    // Check if there are actual changes
    const hasChanges =
      updatedData.fullName !== (user.fullName || "") ||
      updatedData.phoneNumber !== (user.phoneNumber || "") ||
      updatedData.dateOfBirth !==
        (user.dateOfBirth
          ? new Date(user.dateOfBirth).toISOString().split("T")[0]
          : "") ||
      updatedData.address !== (user.address || "") ||
      updatedData.bio !== (user.bio || "") ||
      updatedData.avatarUrl !== (user.avatarUrl || "");

    if (!hasChanges) {
      // No changes detected - silently close modal without alert
      setShowEditModal(false);
      return;
    }

    try {
      const response = await apiClient.put<ApiResponse<UserDTO>>(
        "/user/profile",
        updatedData
      );

      if (response.data && response.data.data) {
        setUser(response.data.data); // Cập nhật với dữ liệu từ server
      } else {
        setUser({ ...user, ...updatedData }); // Fallback: cập nhật local state
      }
      alert("Update successful!");
      setShowEditModal(false);
    } catch (error: unknown) {
      console.error("Update failed:", error);
      alert("Update failed!");
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  if (isLoading)
    return (
      <div
        style={{
          color: "#00ff41",
          padding: 50,
          textAlign: "center",
          background: "#050505",
          height: "100vh",
        }}
      >
        &gt; LOADING...
      </div>
    );
  if (!user)
    return (
      <div
        style={{
          color: "red",
          padding: 50,
          textAlign: "center",
          background: "#050505",
          height: "100vh",
        }}
      >
        ERROR: UNAUTHORIZED ACCESS (Please Login)
      </div>
    );

  return (
    <div className={styles["profile-container"]}>
      <div className={styles["status-bar"]}>
        <div className={styles["status-left"]}>
          <div className={styles["status-item"]}>
            <div className={styles["status-indicator"]}></div>
            <span>&gt; SYSTEM: ONLINE</span>
          </div>
        </div>
        <div className={styles["status-right"]}>
          <div className={styles["status-item"]}>
            <span>USER ID: [ {user.id} ]</span>
          </div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles["user-avatar"]}>
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt="Avt"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                }}
              />
            ) : (
              "👤"
            )}
          </div>
          <div className={styles.username}>{user.username}</div>
          <div className={styles["nav-tabs"]}>
            <button
              className={`${styles["nav-tab"]} ${
                activeTab === "overview" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("overview")}
            >
              OVERVIEW
            </button>
            <button
              className={`${styles["nav-tab"]} ${
                activeTab === "history" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("history")}
            >
              HISTORY LOG
            </button>
            <button
              className={`${styles["nav-tab"]} ${
                activeTab === "favorites" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("favorites")}
            >
              FAVORITE DATA
            </button>
            <button
              className={`${styles["nav-tab"]} ${
                activeTab === "reports" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("reports")}
            >
              MY REPORTS
            </button>
            <button
              className={`${styles["nav-tab"]} ${
                activeTab === "contributions" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("contributions")}
            >
              MY CONTRIBUTIONS
            </button>
            <button
              className={`${styles["nav-tab"]} ${
                activeTab === "settings" ? styles.active : ""
              }`}
              onClick={() => setActiveTab("settings")}
            >
              SETTINGS
            </button>
          </div>
          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <button
              className={styles["nav-tab"]}
              onClick={handleBackToDashboard}
              style={{
                cursor: "pointer",
                backgroundColor: "rgba(0, 255, 65, 0.1)",
                border: "1px solid rgba(0, 255, 65, 0.3)",
              }}
            >
              ← BACK TO DASHBOARD
            </button>
            <button
              className={styles["nav-tab"]}
              onClick={handleLogout}
              style={{
                cursor: "pointer",
                backgroundColor: "rgba(255, 0, 0, 0.1)",
                border: "1px solid rgba(255, 0, 0, 0.3)",
                color: "#ff4444",
              }}
            >
              LOGOUT
            </button>
          </div>
        </div>

        <div className={styles["main-content"]}>
          {activeTab === "overview" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; OVERVIEW</div>
              <div className={styles["overview-container"]}>
                <div className={styles["overview-left"]}>
                  <div className={styles["overview-avatar"]}>
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avt"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      "👤"
                    )}
                  </div>
                  <div className={styles["overview-fullname"]}>
                    {user.fullName || "N/A"}
                  </div>
                  <div className={styles["overview-bio"]}>
                    {user.bio || "No bio available."}
                  </div>
                </div>
                <div className={styles["overview-right"]}>
                  <div className={styles["overview-specs"]}>
                    <div className={styles["spec-item"]}>
                      <div className={styles["spec-label"]}>&gt; EMAIL:</div>
                      <div className={styles["spec-value"]}>{user.email}</div>
                    </div>
                    <div className={styles["spec-item"]}>
                      <div className={styles["spec-label"]}>&gt; PHONE:</div>
                      <div className={styles["spec-value"]}>
                        {user.phoneNumber || "N/A"}
                      </div>
                    </div>
                    <div className={styles["spec-item"]}>
                      <div className={styles["spec-label"]}>&gt; BIRTH:</div>
                      <div className={styles["spec-value"]}>
                        {user.dateOfBirth || "N/A"}
                      </div>
                    </div>
                    <div className={styles["spec-item"]}>
                      <div className={styles["spec-label"]}>&gt; ADDRESS:</div>
                      <div className={styles["spec-value"]}>
                        {user.address || "N/A"}
                      </div>
                    </div>
                    <div className={styles["spec-item"]}>
                      <div className={styles["spec-label"]}>&gt; ROLE:</div>
                      <div className={styles["spec-value"]}>
                        [ {user.role} ]
                      </div>
                    </div>
                  </div>
                  <button
                    className={styles["edit-button"]}
                    onClick={() => setShowEditModal(true)}
                  >
                    [ EDIT PROFILE ]
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; HISTORY LOG</div>

              {isHistoryLoading && (
                <div
                  style={{
                    color: "#00ff41",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  &gt; LOADING...
                </div>
              )}

              {historyError && (
                <div style={{ color: "#ff4444", padding: "20px" }}>
                  ⚠️ {historyError}
                </div>
              )}

              {!isHistoryLoading &&
                !historyError &&
                searchHistory.length === 0 && (
                  <div style={{ color: "#00aa26", padding: "20px" }}>
                    &gt; No history data.
                  </div>
                )}

              {!isHistoryLoading &&
                !historyError &&
                searchHistory.length > 0 && (
                  <div style={{ marginTop: "20px" }}>
                    {searchHistory.map((item, index) => (
                      <div
                        key={index}
                        style={{
                          padding: "15px",
                          marginBottom: "10px",
                          border: "1px solid rgba(0, 255, 65, 0.3)",
                          borderRadius: "4px",
                          backgroundColor: "rgba(0, 255, 65, 0.05)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "8px",
                          }}
                        >
                          <div>
                            <span
                              style={{ color: "#00ff41", fontWeight: "bold" }}
                            >
                              🔍 {item.searchQuery}
                            </span>
                            {item.word && (
                              <span
                                style={{ color: "#00aa26", marginLeft: "10px" }}
                              >
                                → {item.word}
                              </span>
                            )}
                          </div>
                          <div style={{ color: "#888", fontSize: "0.9em" }}>
                            {formatDate(item.searchedAt)}
                          </div>
                        </div>
                        {item.dictionaryId && (
                          <div style={{ marginTop: "8px" }}>
                            <Link
                              href={`/dictionary/${item.dictionaryId}`}
                              style={{
                                color: "#00ff41",
                                textDecoration: "none",
                                fontSize: "0.9em",
                              }}
                            >
                              View details →
                            </Link>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Favorites Tab */}
          {activeTab === "favorites" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; FAVORITE DATA</div>

              {isFavoritesLoading && (
                <div
                  style={{
                    color: "#00ff41",
                    padding: "20px",
                    textAlign: "center",
                  }}
                >
                  &gt; LOADING...
                </div>
              )}

              {favoritesError && (
                <div style={{ color: "#ff4444", padding: "20px" }}>
                  ⚠️ {favoritesError}
                </div>
              )}

              {!isFavoritesLoading &&
                !favoritesError &&
                favorites.length === 0 && (
                  <div style={{ color: "#00aa26", padding: "20px" }}>
                    &gt; No favorite data.
                  </div>
                )}

              {!isFavoritesLoading &&
                !favoritesError &&
                favorites.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fill, minmax(280px, 1fr))",
                      gap: "20px",
                      marginTop: "20px",
                    }}
                  >
                    {favorites.map((fav) => (
                      <Link
                        key={fav.id}
                        href={`/dictionary/${fav.dictionaryId}`}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          display: "block",
                        }}
                      >
                        <div
                          style={{
                            padding: "15px",
                            border: "1px solid rgba(0, 255, 65, 0.3)",
                            borderRadius: "4px",
                            backgroundColor: "rgba(0, 255, 65, 0.05)",
                            transition: "all 0.3s",
                            cursor: "pointer",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(0, 255, 65, 0.1)";
                            e.currentTarget.style.borderColor =
                              "rgba(0, 255, 65, 0.5)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "rgba(0, 255, 65, 0.05)";
                            e.currentTarget.style.borderColor =
                              "rgba(0, 255, 65, 0.3)";
                          }}
                        >
                          {fav.videoUrl && 
                           fav.videoUrl.trim() !== "" && 
                           fav.videoUrl.trim() !== "string" &&
                           (fav.videoUrl.startsWith("http://") || 
                            fav.videoUrl.startsWith("https://") ||
                            fav.videoUrl.startsWith("/uploads/")) && (
                            <div
                              style={{
                                width: "100%",
                                height: "150px",
                                marginBottom: "10px",
                                borderRadius: "4px",
                                overflow: "hidden",
                                backgroundColor: "#000",
                                position: "relative",
                              }}
                            >
                              <video
                                src={fav.videoUrl}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                                muted
                                playsInline
                                onError={(e) => {
                                  // Hide video element if it fails to load
                                  const target = e.target as HTMLVideoElement;
                                  if (target.parentElement) {
                                    target.parentElement.style.display = 'none';
                                  }
                                }}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                  color: "#00ff41",
                                  fontSize: "2em",
                                  opacity: 0.8,
                                }}
                              >
                                ▶
                              </div>
                            </div>
                          )}
                          <div>
                            <h3
                              style={{
                                color: "#00ff41",
                                margin: "0 0 8px 0",
                                fontSize: "1.2em",
                              }}
                            >
                              {fav.word}
                            </h3>
                            <p
                              style={{
                                color: "#aaa",
                                margin: "0 0 8px 0",
                                fontSize: "0.9em",
                                lineHeight: "1.4",
                              }}
                            >
                              {fav.definition && fav.definition.length > 100
                                ? fav.definition.substring(0, 100) + "..."
                                : fav.definition || "Chưa có định nghĩa"}
                            </p>
                            <p
                              style={{
                                color: "#888",
                                margin: "0",
                                fontSize: "0.85em",
                              }}
                            >
                              💾 {formatDate(fav.savedAt)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
            </div>
          )}

          {activeTab === "reports" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; MY REPORTS</div>
              {limits && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    border: "2px solid #00ff41",
                    backgroundColor: "rgba(0, 255, 65, 0.05)",
                    fontSize: "12px",
                    letterSpacing: "0.5px",
                  }}
                >
                  <strong style={{ color: "#00ff41" }}>📊 LIMITS:</strong>{" "}
                  <span
                    style={{
                      color:
                        limits.openReportsCount >= limits.maxReports
                          ? "#ff4444"
                          : "#00ff41",
                    }}
                  >
                    {limits.openReportsCount} / {limits.maxReports} OPEN reports
                  </span>
                  {limits.openReportsCount >= limits.maxReports && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#ffc107",
                        fontSize: "11px",
                      }}
                    >
                      ⚠️ You have reached the limit. Please wait for admin to
                      resolve your reports before creating new ones.
                    </div>
                  )}
                </div>
              )}
              {isReportsLoading ? (
                <div
                  style={{
                    color: "#00ff41",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  &gt; LOADING REPORTS...
                </div>
              ) : reportsError ? (
                <div
                  style={{
                    color: "#ff0000",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  ⚠️ ERROR: {reportsError}
                </div>
              ) : reports.length === 0 ? (
                <div
                  style={{
                    color: "#00aa26",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  &gt; NO REPORTS FOUND
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      style={{
                        border: "2px solid #00ff41",
                        padding: "16px",
                        backgroundColor: "rgba(0, 255, 65, 0.05)",
                        borderRadius: "4px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: "12px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <Link
                            href={`/dictionary/${report.dictionaryId}`}
                            style={{
                              color: "#00ff41",
                              textDecoration: "none",
                              fontSize: "1.2em",
                              fontWeight: "bold",
                              display: "block",
                              marginBottom: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration =
                                "underline";
                              e.currentTarget.style.textShadow =
                                "0 0 8px #00ff41";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = "none";
                              e.currentTarget.style.textShadow = "none";
                            }}
                          >
                            📝 {report.word}
                          </Link>
                          {editingReportId === report.id ? (
                            <div style={{ marginBottom: "12px" }}>
                              <textarea
                                value={editReportReason}
                                onChange={(e) =>
                                  setEditReportReason(e.target.value)
                                }
                                style={{
                                  width: "100%",
                                  minHeight: "80px",
                                  padding: "8px",
                                  backgroundColor: "#0a0a0a",
                                  border: "1px solid #00ff41",
                                  color: "#00ff41",
                                  fontFamily: "monospace",
                                  fontSize: "0.9em",
                                  resize: "vertical",
                                }}
                                placeholder="Enter report reason..."
                                disabled={isUpdatingReport}
                              />
                              <div
                                style={{
                                  display: "flex",
                                  gap: "8px",
                                  marginTop: "8px",
                                }}
                              >
                                <button
                                  onClick={() => handleUpdateReport(report.id)}
                                  disabled={isUpdatingReport}
                                  style={{
                                    padding: "6px 12px",
                                    background: "#00ff41",
                                    color: "#050505",
                                    border: "2px solid #00ff41",
                                    cursor: isUpdatingReport
                                      ? "not-allowed"
                                      : "pointer",
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                    textTransform: "uppercase",
                                    fontWeight: "bold",
                                    opacity: isUpdatingReport ? 0.5 : 1,
                                  }}
                                >
                                  {isUpdatingReport ? "SAVING..." : "SAVE"}
                                </button>
                                <button
                                  onClick={handleCancelEditReport}
                                  disabled={isUpdatingReport}
                                  style={{
                                    padding: "6px 12px",
                                    background: "transparent",
                                    color: "#00ff41",
                                    border: "2px solid #00ff41",
                                    cursor: isUpdatingReport
                                      ? "not-allowed"
                                      : "pointer",
                                    fontFamily: "monospace",
                                    fontSize: "11px",
                                    textTransform: "uppercase",
                                    fontWeight: "bold",
                                    opacity: isUpdatingReport ? 0.5 : 1,
                                  }}
                                >
                                  CANCEL
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p
                                style={{
                                  color: "#aaa",
                                  margin: "0 0 8px 0",
                                  fontSize: "0.9em",
                                  lineHeight: "1.4",
                                }}
                              >
                                <strong style={{ color: "#00ff41" }}>
                                  Reason:
                                </strong>{" "}
                                {report.reason || "No reason provided"}
                              </p>
                              {report.status === "OPEN" && (
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "8px",
                                    marginBottom: "8px",
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      handleStartEditReport(report)
                                    }
                                    style={{
                                      padding: "4px 8px",
                                      background: "transparent",
                                      color: "#00ff41",
                                      border: "1px solid #00ff41",
                                      cursor: "pointer",
                                      fontFamily: "monospace",
                                      fontSize: "10px",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    ✏️ EDIT REASON
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleCancelReport(report.id)
                                    }
                                    style={{
                                      padding: "4px 8px",
                                      background: "transparent",
                                      color: "#ffc107",
                                      border: "1px solid #ffc107",
                                      cursor: "pointer",
                                      fontFamily: "monospace",
                                      fontSize: "10px",
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    ❌ CANCEL
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                          <p
                            style={{
                              color: "#888",
                              margin: "0",
                              fontSize: "0.85em",
                            }}
                          >
                            📅 Created: {formatDate(report.createdAt)}
                          </p>
                        </div>
                        <div>
                          <span
                            style={{
                              padding: "6px 12px",
                              background:
                                report.status === "OPEN"
                                  ? "rgba(255,0,0,0.15)"
                                  : report.status === "CANCELLED"
                                  ? "rgba(128,128,128,0.15)"
                                  : "rgba(0,255,65,0.15)",
                              color:
                                report.status === "OPEN"
                                  ? "#ff4444"
                                  : report.status === "CANCELLED"
                                  ? "#888"
                                  : "#00ff41",
                              border: `2px solid ${
                                report.status === "OPEN"
                                  ? "#ff4444"
                                  : report.status === "CANCELLED"
                                  ? "#888"
                                  : "#00ff41"
                              }`,
                              fontSize: "11px",
                              textTransform: "uppercase",
                              fontWeight: "bold",
                              letterSpacing: "1px",
                              display: "inline-block",
                              borderRadius: "2px",
                              boxShadow:
                                report.status === "OPEN"
                                  ? "0 0 8px rgba(255,68,68,0.3)"
                                  : report.status === "CANCELLED"
                                  ? "0 0 8px rgba(128,128,128,0.3)"
                                  : "0 0 8px rgba(0,255,65,0.3)",
                            }}
                          >
                            {report.status === "OPEN"
                              ? "⏳ OPEN"
                              : report.status === "CANCELLED"
                              ? "🚫 CANCELLED"
                              : "✅ RESOLVED"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "contributions" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; MY CONTRIBUTIONS</div>
              {limits && (
                <div
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    border: "2px solid #00ff41",
                    backgroundColor: "rgba(0, 255, 65, 0.05)",
                    fontSize: "12px",
                    letterSpacing: "0.5px",
                  }}
                >
                  <strong style={{ color: "#00ff41" }}>📊 LIMITS:</strong>{" "}
                  <span
                    style={{
                      color:
                        limits.pendingContributionsCount >=
                        limits.maxContributions
                          ? "#ff4444"
                          : "#00ff41",
                    }}
                  >
                    {limits.pendingContributionsCount} /{" "}
                    {limits.maxContributions} PENDING contributions
                  </span>
                  {limits.pendingContributionsCount >=
                    limits.maxContributions && (
                    <div
                      style={{
                        marginTop: "8px",
                        color: "#ffc107",
                        fontSize: "11px",
                      }}
                    >
                      ⚠️ You have reached the limit. Please wait for admin to
                      review your contributions before submitting new ones.
                    </div>
                  )}
                </div>
              )}
              {isContributionsLoading ? (
                <div
                  style={{
                    color: "#00ff41",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  &gt; LOADING CONTRIBUTIONS...
                </div>
              ) : contributionsError ? (
                <div
                  style={{
                    color: "#ff0000",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  ⚠️ ERROR: {contributionsError}
                </div>
              ) : contributions.length === 0 ? (
                <div
                  style={{
                    color: "#00aa26",
                    textAlign: "center",
                    padding: "40px",
                  }}
                >
                  &gt; NO CONTRIBUTIONS FOUND
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "16px",
                  }}
                >
                  {contributions.map((contribution) => {
                    const parseStagingData = (stagingData: string) => {
                      try {
                        return JSON.parse(stagingData);
                      } catch {
                        return {};
                      }
                    };

                    const data = parseStagingData(contribution.stagingData);
                    const statusColors = {
                      PENDING: {
                        bg: "rgba(255, 193, 7, 0.15)",
                        border: "#ffc107",
                        color: "#ffc107",
                        icon: "⏳",
                      },
                      APPROVED: {
                        bg: "rgba(0, 255, 65, 0.15)",
                        border: "#00ff41",
                        color: "#00ff41",
                        icon: "✅",
                      },
                      REJECTED: {
                        bg: "rgba(255, 0, 0, 0.15)",
                        border: "#ff4444",
                        color: "#ff4444",
                        icon: "❌",
                      },
                      CANCELLED: {
                        bg: "rgba(128, 128, 128, 0.15)",
                        border: "#888",
                        color: "#888",
                        icon: "🚫",
                      },
                    };
                    const statusStyle =
                      statusColors[contribution.status] || statusColors.PENDING;

                    return (
                      <div
                        key={contribution.id}
                        style={{
                          border: "2px solid #00ff41",
                          padding: "16px",
                          backgroundColor: "rgba(0, 255, 65, 0.05)",
                          borderRadius: "4px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "12px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <h3
                              style={{
                                color: "#00ff41",
                                margin: "0 0 8px 0",
                                fontSize: "1.2em",
                                fontWeight: "bold",
                              }}
                            >
                              📚 {data.word || "N/A"}
                            </h3>
                            <p
                              style={{
                                color: "#aaa",
                                margin: "0 0 8px 0",
                                fontSize: "0.9em",
                                lineHeight: "1.4",
                              }}
                            >
                              {data.definition && data.definition.length > 150
                                ? data.definition.substring(0, 150) + "..."
                                : data.definition || "No definition provided"}
                            </p>
                            {data.videoUrl && (
                              <p
                                style={{
                                  color: "#888",
                                  margin: "0 0 8px 0",
                                  fontSize: "0.85em",
                                }}
                              >
                                🎥 Video: {data.videoUrl.substring(0, 50)}...
                              </p>
                            )}
                            <p
                              style={{
                                color: "#888",
                                margin: "0 0 8px 0",
                                fontSize: "0.85em",
                              }}
                            >
                              📅 Submitted: {formatDate(contribution.createdAt)}
                            </p>
                            {contribution.status === "PENDING" && (
                              <button
                                onClick={() =>
                                  handleCancelContribution(contribution.id)
                                }
                                style={{
                                  padding: "4px 8px",
                                  background: "transparent",
                                  color: "#ffc107",
                                  border: "1px solid #ffc107",
                                  cursor: "pointer",
                                  fontFamily: "monospace",
                                  fontSize: "10px",
                                  textTransform: "uppercase",
                                }}
                              >
                                ❌ CANCEL
                              </button>
                            )}
                          </div>
                          <div>
                            <span
                              style={{
                                padding: "6px 12px",
                                background: statusStyle.bg,
                                color: statusStyle.color,
                                border: `2px solid ${statusStyle.border}`,
                                fontSize: "11px",
                                textTransform: "uppercase",
                                fontWeight: "bold",
                                letterSpacing: "1px",
                                display: "inline-block",
                                borderRadius: "2px",
                                boxShadow: `0 0 8px ${statusStyle.border}40`,
                              }}
                            >
                              {statusStyle.icon} {contribution.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "settings" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; SETTINGS</div>
              <form
                className={styles["settings-form"]}
                onSubmit={handlePasswordChange}
              >
                {passwordError && (
                  <div className={styles["error-message"]}>
                    ⚠️ {passwordError}
                  </div>
                )}
                {passwordSuccess && (
                  <div className={styles["success-message"]}>
                    {passwordSuccess}
                  </div>
                )}
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]}>OLD PASSWORD</label>
                  <input
                    type="password"
                    className={styles["form-input"]}
                    value={passwordForm.oldPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        oldPassword: e.target.value,
                      })
                    }
                    required
                    disabled={isPasswordChanging}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]}>NEW PASSWORD</label>
                  <input
                    type="password"
                    className={styles["form-input"]}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        newPassword: e.target.value,
                      })
                    }
                    required
                    disabled={isPasswordChanging}
                  />
                </div>
                <div className={styles["form-group"]}>
                  <label className={styles["form-label"]}>
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    className={styles["form-input"]}
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm({
                        ...passwordForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    disabled={isPasswordChanging}
                  />
                </div>
                <button
                  type="submit"
                  className={styles["form-button"]}
                  disabled={isPasswordChanging}
                >
                  {isPasswordChanging ? "PROCESSING..." : "CHANGE PASSWORD"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className={`${styles.modal} ${styles.active}`}>
          <div className={styles["modal-content"]}>
            <button
              className={styles["modal-close-btn"]}
              onClick={() => setShowEditModal(false)}
            >
              ×
            </button>
            <div className={styles["modal-title"]}>&gt; EDIT PROFILE</div>
            <form className={styles["modal-form"]} onSubmit={handleEditProfile}>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>FULL NAME</label>
                <input
                  name="fullName"
                  className={styles["form-input"]}
                  defaultValue={user.fullName || ""}
                  required
                />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>PHONE</label>
                <input
                  name="phoneNumber"
                  className={styles["form-input"]}
                  defaultValue={user.phoneNumber || ""}
                />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>BIRTH</label>
                <input
                  name="dateOfBirth"
                  type="date"
                  className={styles["form-input"]}
                  defaultValue={user.dateOfBirth || ""}
                />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>ADDRESS</label>
                <input
                  name="address"
                  className={styles["form-input"]}
                  defaultValue={user.address || ""}
                />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>BIO</label>
                <textarea
                  name="bio"
                  className={styles["form-input"]}
                  rows={3}
                  defaultValue={user.bio || ""}
                ></textarea>
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>AVATAR URL</label>
                <input
                  name="avatarUrl"
                  className={styles["form-input"]}
                  defaultValue={user.avatarUrl || ""}
                  placeholder="https://..."
                />
              </div>
              <div className={styles["modal-button-group"]}>
                <button
                  type="button"
                  className={`${styles["modal-button"]} ${styles.cancel}`}
                  onClick={() => setShowEditModal(false)}
                >
                  CANCEL
                </button>
                <button type="submit" className={styles["modal-button"]}>
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
