"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Terminal,
  LayoutDashboard,
  Users,
  FileText,
  BookOpen,
  LogOut,
  Lock,
  Search,
  Plus,
  Edit,
  Trash2,
  Video,
  X,
  Save,
  User,
  Flag,
  Upload
} from "lucide-react";
import styles from "../../../styles/admin-dictionary.module.css";
import { adminApi, DictionaryDTO } from "@/lib/admin-api-client";
import { useAuthStore } from "@/stores/auth-store";

interface DictionaryItem {
  id: number;
  word: string;
  category: string;
  difficulty: string;
  views: number;
  videoUrl: string;
  status: "PUBLISHED" | "DRAFT";
  definition: string;
}

// Helper để map DictionaryDTO sang DictionaryItem (UI format)
const mapDictionaryDTOToItem = (dto: DictionaryDTO): DictionaryItem => {
  return {
    id: dto.id,
    word: dto.word,
    category: "General", // Backend không có category, mặc định
    difficulty: "Medium", // Backend không có difficulty, mặc định
    views: 0, // Backend không có views, mặc định
    videoUrl: dto.videoUrl || "",
    status: "PUBLISHED", // Mặc định PUBLISHED nếu có trong DB
    definition: dto.definition || "",
  };
};

export default function AdminDictionaryPage() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { username } = useAuthStore();

  // Logic đồng hồ và Admin Name
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const adminName = username?.toUpperCase() || "ADMIN";

  // State cho dictionary từ API
  const [words, setWords] = useState<DictionaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentWord, setCurrentWord] = useState<Partial<DictionaryItem>>({});
  const [originalWord, setOriginalWord] =
    useState<Partial<DictionaryItem> | null>(null); // Store original data for comparison
  const [isEditMode, setIsEditMode] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
    errors: string[];
  } | null>(null);

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

  // Load dictionary từ API
  useEffect(() => {
    const loadDictionary = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminApi.getAllDictionary();
        const mapped = data.map(mapDictionaryDTOToItem);
        setWords(mapped);
      } catch (err: any) {
        console.error("Error loading dictionary:", err);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load dictionary"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDictionary();
  }, []);

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

  const filteredWords = words.filter((item) =>
    item.word.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddNew = () => {
    setCurrentWord({});
    setOriginalWord(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleEdit = (item: DictionaryItem) => {
    setCurrentWord(item);
    setOriginalWord({ ...item }); // Store original for comparison
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this entry?")) {
      return;
    }

    try {
      await adminApi.deleteDictionary(id);
      // Reload dictionary sau khi xóa
      const data = await adminApi.getAllDictionary();
      const mapped = data.map(mapDictionaryDTOToItem);
      setWords(mapped);
      alert("Entry deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting dictionary entry:", err);
      alert(
        err.response?.data?.message || err.message || "Failed to delete entry"
      );
    }
  };

  const handleBulkImport = async () => {
    if (!importText.trim()) {
      alert("Please enter words to import!");
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Parse CSV format: word,definition,videoUrl
      const lines = importText
        .trim()
        .split("\n")
        .filter((line) => line.trim());
      const words: Array<{
        word: string;
        definition?: string;
        videoUrl?: string;
      }> = [];
      const errors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle quoted fields)
        const parts: string[] = [];
        let current = "";
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === "," && !inQuotes) {
            parts.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
        parts.push(current.trim());

        const word = parts[0]?.trim();
        const definition = parts[1]?.trim() || undefined;
        const videoUrl = parts[2]?.trim() || undefined;

        if (!word) {
          errors.push(`Line ${i + 1}: Word is required`);
          continue;
        }

        words.push({ word, definition, videoUrl });
      }

      if (words.length === 0) {
        alert("No valid words found in the input!");
        setImporting(false);
        return;
      }

      // Import words one by one
      let success = 0;
      let failed = 0;
      const importErrors: string[] = [];

      for (let i = 0; i < words.length; i++) {
        try {
          await adminApi.createDictionary(words[i]);
          success++;
        } catch (err: any) {
          failed++;
          const errorMsg =
            err.response?.data?.message || err.message || "Unknown error";
          importErrors.push(`${words[i].word}: ${errorMsg}`);
        }
      }

      setImportResult({
        success,
        failed,
        errors: importErrors,
      });

      // Reload dictionary if any success
      if (success > 0) {
        const data = await adminApi.getAllDictionary();
        const mapped = data.map(mapDictionaryDTOToItem);
        setWords(mapped);
      }

      if (success === words.length) {
        alert(`Successfully imported ${success} word(s)!`);
        setImportText("");
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportResult(null);
        }, 2000);
      }
    } catch (err: any) {
      console.error("Error during bulk import:", err);
      alert(
        err.response?.data?.message || err.message || "Failed to import words"
      );
    } finally {
      setImporting(false);
    }
  };

  const handleSave = async () => {
    if (!currentWord.word || !currentWord.word.trim()) {
      alert("Word is required!");
      return;
    }

    try {
      if (isEditMode && currentWord.id) {
        // Check if there are actual changes
        if (originalWord) {
          const hasChanges =
            currentWord.word !== originalWord.word ||
            (currentWord.definition || "") !==
              (originalWord.definition || "") ||
            (currentWord.videoUrl || "") !== (originalWord.videoUrl || "");

          if (!hasChanges) {
            // No changes detected - silently close modal without alert
            setIsModalOpen(false);
            setOriginalWord(null);
            return;
          }
        }

        // Update dictionary entry
        const updateData: Partial<DictionaryDTO> = {
          word: currentWord.word,
          definition: currentWord.definition || undefined,
          videoUrl: currentWord.videoUrl || undefined,
        };
        await adminApi.updateDictionary(currentWord.id, updateData);
        alert("Entry updated successfully!");
      } else {
        // Create dictionary entry
        const createData = {
          word: currentWord.word!,
          definition: currentWord.definition || undefined,
          videoUrl: currentWord.videoUrl || undefined,
        };
        await adminApi.createDictionary(createData);
        alert("Entry created successfully!");
      }

      // Reload dictionary
      const data = await adminApi.getAllDictionary();
      const mapped = data.map(mapDictionaryDTOToItem);
      setWords(mapped);
      setOriginalWord(null); // Clear original after save
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving dictionary entry:", err);
      alert(
        err.response?.data?.message || err.message || "Failed to save entry"
      );
    }
  };

  return (
    <div className={styles["admin-container"]}>
      {/* 4. STATUS BAR MỚI */}
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

      <main className={styles["main-content"]}>
        <div className={styles["page-header"]}>
          <div className={styles["page-title"]}>
            <BookOpen size={24} />
            DICTIONARY DATABASE
          </div>

          <div className={styles["search-container"]}>
            <input
              type="text"
              placeholder="Search by keyword..."
              className={styles["search-box"]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div style={{ display: "flex", gap: "10px" }}>
              <button className={styles["btn-add"]} onClick={handleAddNew}>
                <Plus size={16} /> ADD NEW WORD
              </button>
              <button
                className={styles["btn-add"]}
                onClick={() => setIsImportModalOpen(true)}
                style={{ backgroundColor: "#0066cc" }}
              >
                <Upload size={16} /> BULK IMPORT
              </button>
            </div>
          </div>
        </div>

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

        <div className={styles["table-container"]}>
          {loading ? (
            <div
              style={{ padding: "40px", textAlign: "center", color: "#888" }}
            >
              Loading dictionary...
            </div>
          ) : (
            <table className={styles["data-table"]}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Word</th>
                  <th>Category</th>
                  <th>Difficulty</th>
                  <th>Views</th>
                  <th>Video</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredWords.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#888",
                      }}
                    >
                      No entries found
                    </td>
                  </tr>
                ) : (
                  filteredWords.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td style={{ fontWeight: "bold", color: "#fff" }}>
                        {item.word}
                      </td>
                      <td>{item.category}</td>
                      <td>{item.difficulty}</td>
                      <td>{item.views}</td>
                      <td>
                        {item.videoUrl ? (
                          <a
                            href={item.videoUrl}
                            target="_blank"
                            rel="noreferrer"
                            className={styles["video-link"]}
                          >
                            <Video size={14} /> View
                          </a>
                        ) : (
                          <span style={{ color: "#666" }}>-</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`${styles["status-badge"]} ${
                            item.status === "PUBLISHED"
                              ? styles["status-published"]
                              : styles["status-draft"]
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className={styles["action-buttons"]}>
                          <button
                            className={styles["btn-icon"]}
                            title="Edit"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            className={`${styles["btn-icon"]} ${styles["btn-icon-danger"]}`}
                            title="Delete"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Bulk Import Modal */}
      {isImportModalOpen && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal"]} style={{ maxWidth: "700px" }}>
            <div className={styles["modal-header"]}>
              <span className={styles["modal-title"]}>
                BULK IMPORT DICTIONARY WORDS
              </span>
              <button
                className={styles["modal-close"]}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportText("");
                  setImportResult(null);
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles["modal-body"]}>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>
                  CSV FORMAT (Word,Definition,VideoUrl)
                </label>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#888",
                    marginBottom: "8px",
                  }}
                >
                  Format: word,definition,videoUrl (mỗi dòng một từ)
                  <br />
                  Example:
                  <br />
                  xin chào,"Lời chào hỏi bằng tiếng
                  Việt",https://youtube.com/...
                  <br />
                  tạm biệt,"Lời chào tạm biệt",
                  <br />
                  cảm ơn,"Lời cảm ơn",https://youtube.com/...
                </p>
                <textarea
                  className={styles["form-textarea"]}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="word1,definition1,videoUrl1&#10;word2,definition2,videoUrl2&#10;word3,definition3,"
                  rows={15}
                  disabled={importing}
                ></textarea>
              </div>

              {importResult && (
                <div
                  style={{
                    padding: "12px",
                    marginTop: "12px",
                    background:
                      importResult.failed > 0
                        ? "rgba(255,0,0,0.1)"
                        : "rgba(0,255,0,0.1)",
                    border: `1px solid ${
                      importResult.failed > 0 ? "#ff0000" : "#00ff00"
                    }`,
                    color: importResult.failed > 0 ? "#ff0000" : "#00ff00",
                    fontSize: "12px",
                  }}
                >
                  <strong>Import Result:</strong>
                  <br />✅ Success: {importResult.success}
                  <br />
                  {importResult.failed > 0 && (
                    <>
                      ❌ Failed: {importResult.failed}
                      <br />
                      {importResult.errors.length > 0 && (
                        <div style={{ marginTop: "8px" }}>
                          <strong>Errors:</strong>
                          <ul style={{ marginLeft: "20px", marginTop: "4px" }}>
                            {importResult.errors.map((err, idx) => (
                              <li key={idx} style={{ fontSize: "11px" }}>
                                {err}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={styles["modal-footer"]}>
              <button
                className={`${styles["btn-modal"]} ${styles["btn-cancel"]}`}
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportText("");
                  setImportResult(null);
                }}
                disabled={importing}
              >
                CANCEL
              </button>
              <button
                className={`${styles["btn-modal"]} ${styles["btn-save"]}`}
                onClick={handleBulkImport}
                disabled={importing || !importText.trim()}
              >
                {importing ? "IMPORTING..." : "IMPORT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal"]}>
            <div className={styles["modal-header"]}>
              <span className={styles["modal-title"]}>
                {isEditMode ? "EDIT ENTRY" : "ADD NEW ENTRY"}
              </span>
              <button
                className={styles["modal-close"]}
                onClick={() => setIsModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles["modal-body"]}>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>WORD</label>
                <input
                  type="text"
                  className={styles["form-input"]}
                  value={currentWord.word || ""}
                  onChange={(e) =>
                    setCurrentWord({ ...currentWord, word: e.target.value })
                  }
                />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>CATEGORY</label>
                <select
                  className={styles["form-select"]}
                  value={currentWord.category || ""}
                  onChange={(e) =>
                    setCurrentWord({ ...currentWord, category: e.target.value })
                  }
                >
                  <option value="">Select Category</option>
                  <option value="Greeting">Greeting</option>
                  <option value="Family">Family</option>
                  <option value="Work">Work</option>
                  <option value="Travel">Travel</option>
                </select>
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>DIFFICULTY</label>
                <select
                  className={styles["form-select"]}
                  value={currentWord.difficulty || ""}
                  onChange={(e) =>
                    setCurrentWord({
                      ...currentWord,
                      difficulty: e.target.value,
                    })
                  }
                >
                  <option value="">Select Difficulty</option>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>
                  VIDEO URL (OPTIONAL)
                </label>
                <input
                  type="text"
                  className={styles["form-input"]}
                  value={currentWord.videoUrl || ""}
                  onChange={(e) =>
                    setCurrentWord({ ...currentWord, videoUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>DEFINITION</label>
                <textarea
                  className={styles["form-textarea"]}
                  value={currentWord.definition || ""}
                  onChange={(e) =>
                    setCurrentWord({
                      ...currentWord,
                      definition: e.target.value,
                    })
                  }
                ></textarea>
              </div>
            </div>

            <div className={styles["modal-footer"]}>
              <button
                className={`${styles["btn-modal"]} ${styles["btn-cancel"]}`}
                onClick={() => setIsModalOpen(false)}
              >
                CANCEL
              </button>
              <button
                className={`${styles["btn-modal"]} ${styles["btn-save"]}`}
                onClick={handleSave}
              >
                <Save size={14} style={{ marginRight: 5 }} /> SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
