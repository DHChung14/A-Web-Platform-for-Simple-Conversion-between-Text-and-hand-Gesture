"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  LogOut,
  Lock,
  User,
  Flag,
} from "lucide-react";
import styles from "../../../styles/admin-contributions.module.css";
import { adminApi, ReportDTO } from "@/lib/admin-api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminReportsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { username } = useAuthStore();

  // Logic đồng hồ và tên Admin
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const adminName = username?.toUpperCase() || "ADMIN";

  // State cho reports từ API
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "OPEN" | "RESOLVED" | "CANCELLED" | undefined
  >(undefined);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("en-GB");
      const timeStr = now.toLocaleTimeString("en-GB");
      setCurrentDateTime(`${dateStr} - ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load reports từ API
  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getReports(page, 20, statusFilter);
      setReports(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: unknown) {
      console.error("Error loading reports:", err);
      const errorMessage =
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || err.message
          : "Failed to load reports";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleResolve = async (reportId: number) => {
    if (!confirm("Are you sure you want to resolve this report?")) {
      return;
    }

    try {
      await adminApi.resolveReport(reportId);
      // Reload reports after resolving
      loadReports();
    } catch (err: unknown) {
      console.error("Error resolving report:", err);
      const errorMessage =
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || err.message
          : "Failed to resolve report";
      alert(errorMessage);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-GB");
    } catch {
      return dateString;
    }
  };

  const menuItems = [
    { label: "[DASHBOARD]", href: "/admin", icon: LayoutDashboard },
    { label: "[USER MANAGEMENT]", href: "/admin/users", icon: Users },
    { label: "[CONTRIBUTIONS]", href: "/admin/contributions", icon: FileText },
    {
      label: "[DICTIONARY DATABASE]",
      href: "/admin/dictionary",
      icon: BookOpen,
    },
    { label: "[REPORTS]", href: "/admin/reports", icon: Flag },
  ];

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className={styles["admin-container"]}>
      {/* Status Bar */}
      <div className={styles["status-bar"]}>
        <div className={styles["status-bar-left"]}>
          <div className={styles["status-item"]}>
            <span className={styles["status-indicator"]}></span>
            <span>SYSTEM: ONLINE</span>
          </div>
          <div className={styles["status-item"]}>
            <User size={14} />
            <span style={{ textTransform: "uppercase" }}>
              ADMIN: {adminName}
            </span>
          </div>
        </div>
        <div className={styles["status-item"]}>
          <span>{currentDateTime}</span>
        </div>
      </div>

      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles["sidebar-header"]}>
          <div className="flex items-center gap-2">
            <Lock size={16} /> VSL ADMIN
          </div>
          CORE
        </div>

        <ul className={styles["sidebar-menu"]}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles["menu-item"]} ${
                    isActive ? styles["menu-item-active"] : ""
                  }`}
                >
                  <span className={styles["icon-wrapper"]}>
                    <Icon size={16} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}

          <li>
            <div
              className={styles["menu-item"]}
              style={{ cursor: "pointer" }}
              onClick={handleLogout}
            >
              <span className={styles["icon-wrapper"]}>
                <LogOut size={16} />
              </span>
              <span>[LOGOUT]</span>
            </div>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className={styles["main-content"]}>
        <h1 className={styles["page-title"]}>
          <Flag size={28} />
          WORD REPORTS
        </h1>

        {error && (
          <div
            style={{
              padding: "12px",
              marginBottom: "20px",
              background: "rgba(255,0,0,0.1)",
              border: "1px solid #ff0000",
              color: "#ff0000",
              fontSize: "12px",
            }}
          >
            ERROR: {error}
          </div>
        )}

        {/* Summary Info */}
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: "rgba(0, 255, 65, 0.05)",
            border: "1px solid rgba(0, 255, 65, 0.3)",
            fontSize: "12px",
            letterSpacing: "1px",
          }}
        >
          &gt; TOTAL REPORTS: <strong>{totalElements}</strong> | CURRENT PAGE:{" "}
          <strong>{page + 1}</strong> / <strong>{totalPages || 1}</strong> |{" "}
          SHOWING: <strong>{reports.length}</strong> REPORT(S)
        </div>

        {/* Filter Buttons */}
        <div
          style={{
            marginBottom: "24px",
            display: "flex",
            gap: "12px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "11px",
              letterSpacing: "1px",
              opacity: 0.7,
              textTransform: "uppercase",
            }}
          >
            FILTER:
          </span>
          <button
            onClick={() => {
              setStatusFilter(undefined);
              setPage(0);
            }}
            style={{
              padding: "10px 20px",
              background:
                statusFilter === undefined ? "#00ff41" : "transparent",
              color: statusFilter === undefined ? "#050505" : "#00ff41",
              border: "2px solid #00ff41",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              transition: "all 0.3s ease",
              fontWeight: statusFilter === undefined ? "bold" : "normal",
            }}
            onMouseEnter={(e) => {
              if (statusFilter !== undefined) {
                e.currentTarget.style.background = "rgba(0, 255, 65, 0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (statusFilter !== undefined) {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            ALL ({totalElements})
          </button>
          <button
            onClick={() => {
              setStatusFilter("OPEN");
              setPage(0);
            }}
            style={{
              padding: "10px 20px",
              background: statusFilter === "OPEN" ? "#00ff41" : "transparent",
              color: statusFilter === "OPEN" ? "#050505" : "#00ff41",
              border: "2px solid #00ff41",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              transition: "all 0.3s ease",
              fontWeight: statusFilter === "OPEN" ? "bold" : "normal",
            }}
            onMouseEnter={(e) => {
              if (statusFilter !== "OPEN") {
                e.currentTarget.style.background = "rgba(0, 255, 65, 0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (statusFilter !== "OPEN") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            OPEN
          </button>
          <button
            onClick={() => {
              setStatusFilter("RESOLVED");
              setPage(0);
            }}
            style={{
              padding: "10px 20px",
              background:
                statusFilter === "RESOLVED" ? "#00ff41" : "transparent",
              color: statusFilter === "RESOLVED" ? "#050505" : "#00ff41",
              border: "2px solid #00ff41",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              transition: "all 0.3s ease",
              fontWeight: statusFilter === "RESOLVED" ? "bold" : "normal",
            }}
            onMouseEnter={(e) => {
              if (statusFilter !== "RESOLVED") {
                e.currentTarget.style.background = "rgba(0, 255, 65, 0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (statusFilter !== "RESOLVED") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            RESOLVED
          </button>
          <button
            onClick={() => {
              setStatusFilter("CANCELLED");
              setPage(0);
            }}
            style={{
              padding: "10px 20px",
              background: statusFilter === "CANCELLED" ? "#888" : "transparent",
              color: statusFilter === "CANCELLED" ? "#050505" : "#888",
              border: "2px solid #888",
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "1px",
              transition: "all 0.3s ease",
              fontWeight: statusFilter === "CANCELLED" ? "bold" : "normal",
            }}
            onMouseEnter={(e) => {
              if (statusFilter !== "CANCELLED") {
                e.currentTarget.style.background = "rgba(128, 128, 128, 0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (statusFilter !== "CANCELLED") {
                e.currentTarget.style.background = "transparent";
              }
            }}
          >
            CANCELLED
          </button>
        </div>

        {loading ? (
          <div
            style={{ color: "#00ff41", textAlign: "center", padding: "40px" }}
          >
            &gt; LOADING REPORTS...
          </div>
        ) : reports.length === 0 ? (
          <div
            style={{ color: "#00aa26", textAlign: "center", padding: "40px" }}
          >
            &gt; NO REPORTS FOUND
          </div>
        ) : (
          <>
            <div
              className={styles["table-container"]}
              style={{
                border: "2px solid #00ff41",
                borderRadius: "4px",
                overflow: "hidden",
                boxShadow: "0 0 20px rgba(0, 255, 65, 0.2)",
              }}
            >
              <table
                className={styles["data-table"]}
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "rgba(0, 255, 65, 0.1)",
                      borderBottom: "2px solid #00ff41",
                    }}
                  >
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#00ff41",
                        borderRight: "1px solid rgba(0, 255, 65, 0.3)",
                      }}
                    >
                      ID
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#00ff41",
                        borderRight: "1px solid rgba(0, 255, 65, 0.3)",
                      }}
                    >
                      WORD
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#00ff41",
                        borderRight: "1px solid rgba(0, 255, 65, 0.3)",
                      }}
                    >
                      REASON
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#00ff41",
                        borderRight: "1px solid rgba(0, 255, 65, 0.3)",
                      }}
                    >
                      STATUS
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "left",
                        fontSize: "12px",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#00ff41",
                        borderRight: "1px solid rgba(0, 255, 65, 0.3)",
                      }}
                    >
                      CREATED AT
                    </th>
                    <th
                      style={{
                        padding: "14px 12px",
                        textAlign: "center",
                        fontSize: "12px",
                        fontWeight: "bold",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "#00ff41",
                      }}
                    >
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr
                      key={report.id}
                      style={{
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(0, 255, 65, 0.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td
                        style={{
                          fontFamily: "monospace",
                          fontSize: "12px",
                          fontWeight: "bold",
                          color: "#00ff41",
                          padding: "12px 8px",
                        }}
                      >
                        #{String(report.id).padStart(4, "0")}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        <Link
                          href={`/dictionary/${report.dictionaryId}`}
                          style={{
                            color: "#00ff41",
                            textDecoration: "none",
                            fontWeight: "bold",
                            fontSize: "13px",
                            letterSpacing: "0.5px",
                            transition: "all 0.2s ease",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.textDecoration = "underline";
                            e.currentTarget.style.textShadow =
                              "0 0 8px #00ff41";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.textDecoration = "none";
                            e.currentTarget.style.textShadow = "none";
                          }}
                        >
                          {report.word || "N/A"}
                        </Link>
                      </td>
                      <td
                        style={{
                          maxWidth: "400px",
                          wordBreak: "break-word",
                          padding: "12px 8px",
                          fontSize: "12px",
                          lineHeight: "1.5",
                          color: report.reason
                            ? "#00ff41"
                            : "rgba(0, 255, 65, 0.5)",
                          fontStyle: report.reason ? "normal" : "italic",
                        }}
                      >
                        {report.reason || (
                          <span style={{ opacity: 0.6 }}>
                            No reason provided
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
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
                      </td>
                      <td
                        style={{
                          padding: "12px 8px",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          color: "rgba(0, 255, 65, 0.8)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(report.createdAt)}
                      </td>
                      <td style={{ padding: "12px 8px" }}>
                        {report.status === "OPEN" && (
                          <button
                            onClick={() => handleResolve(report.id)}
                            style={{
                              padding: "8px 16px",
                              background: "transparent",
                              color: "#00ff41",
                              border: "2px solid #00ff41",
                              cursor: "pointer",
                              fontFamily: "monospace",
                              fontSize: "11px",
                              textTransform: "uppercase",
                              letterSpacing: "1px",
                              fontWeight: "bold",
                              transition: "all 0.3s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "#00ff41";
                              e.currentTarget.style.color = "#050505";
                              e.currentTarget.style.boxShadow =
                                "0 0 15px rgba(0, 255, 65, 0.8)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "#00ff41";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            RESOLVE
                          </button>
                        )}
                        {report.status === "RESOLVED" && (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "rgba(0, 255, 65, 0.5)",
                              fontStyle: "italic",
                            }}
                          >
                            Resolved
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  marginTop: "20px",
                  display: "flex",
                  justifyContent: "center",
                  gap: "10px",
                  alignItems: "center",
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  style={{
                    padding: "8px 16px",
                    background:
                      page === 0 ? "rgba(0,255,65,0.2)" : "transparent",
                    color: "#00ff41",
                    border: "2px solid #00ff41",
                    cursor: page === 0 ? "not-allowed" : "pointer",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    opacity: page === 0 ? 0.5 : 1,
                  }}
                >
                  &lt; PREV
                </button>
                <span
                  style={{
                    color: "#00ff41",
                    fontFamily: "monospace",
                    fontSize: "12px",
                  }}
                >
                  PAGE {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() =>
                    setPage((p) => Math.min(totalPages - 1, p + 1))
                  }
                  disabled={page >= totalPages - 1}
                  style={{
                    padding: "8px 16px",
                    background:
                      page >= totalPages - 1
                        ? "rgba(0,255,65,0.2)"
                        : "transparent",
                    color: "#00ff41",
                    border: "2px solid #00ff41",
                    cursor: page >= totalPages - 1 ? "not-allowed" : "pointer",
                    fontFamily: "monospace",
                    fontSize: "12px",
                    opacity: page >= totalPages - 1 ? 0.5 : 1,
                  }}
                >
                  NEXT &gt;
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
