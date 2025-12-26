"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { SearchHistoryDTO, FavoriteDTO, ApiResponse } from "@/types/api";
import styles from "../../styles/dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, isGuest } = useAuthStore();

  // Search history state
  const [searchHistory, setSearchHistory] = useState<SearchHistoryDTO[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Favorites state
  const [favorites, setFavorites] = useState<FavoriteDTO[]>([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);

  // Fetch search history
  useEffect(() => {
    const fetchSearchHistory = async () => {
      if (!isAuthenticated) {
        console.log(
          "[Dashboard] User not authenticated, skipping history fetch"
        );
        return;
      }

      setIsHistoryLoading(true);
      setHistoryError(null);

      try {
        console.log("[Dashboard] Fetching search history...");
        const response = await apiClient.get<ApiResponse<SearchHistoryDTO[]>>(
          "/user/history"
        );

        if (response.data.code === 200) {
          const history = response.data.data;
          console.log(
            `[Dashboard] Success: Received ${history.length} history items`
          );
          setSearchHistory(history);
        } else {
          throw new Error(
            response.data.message || "Failed to fetch search history"
          );
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load search history";
        console.error("[Dashboard] Error fetching search history:", errorMsg);
        setHistoryError(errorMsg);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchSearchHistory();
  }, [isAuthenticated]);

  // Fetch favorites (limited to 5 for dashboard)
  useEffect(() => {
    const fetchFavorites = async () => {
      if (!isAuthenticated) {
        console.log(
          "[Dashboard] User not authenticated, skipping favorites fetch"
        );
        return;
      }

      setIsFavoritesLoading(true);
      setFavoritesError(null);

      try {
        console.log("[Dashboard] Fetching favorites (limit 5)...");
        const response = await apiClient.get<ApiResponse<FavoriteDTO[]>>(
          "/user/favorites",
          {
            params: { page: 0, size: 5 },
          }
        );

        if (response.data.code === 200) {
          const favs = response.data.data;
          console.log(`[Dashboard] Success: Received ${favs.length} favorites`);
          setFavorites(favs);
        } else {
          throw new Error(response.data.message || "Failed to fetch favorites");
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load favorites";
        console.error("[Dashboard] Error fetching favorites:", errorMsg);
        setFavoritesError(errorMsg);
      } finally {
        setIsFavoritesLoading(false);
      }
    };

    fetchFavorites();
  }, [isAuthenticated]);

  // Format date for display
  const formatDate = (isoDateString: string) => {
    try {
      const date = new Date(isoDateString);
      return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return isoDateString;
    }
  };

  return (
    <div className={styles["dashboard-container"]}>
      <div className={styles.content}>
        <div className={styles.header}>
          <div className={styles.title}>VSL PLATFORM</div>
          <div
            className={styles["user-icon"]}
            onClick={() => {
              if (isAuthenticated) {
                router.push("/users");
              } else {
                router.push("/login");
              }
            }}
          >
            👤
          </div>
        </div>

        <div className={styles["buttons-grid"]}>
          <button
            className={styles["action-button"]}
            onClick={() => router.push("/recognize")}
          >
            <div className={styles["button-icon"]}>📷</div>
            <div className={styles["button-text"]}>GESTURE TRANSLATOR</div>
            <div className={styles["button-subtitle"]}>Gesture to Text</div>
          </button>

          <button
            className={styles["action-button"]}
            onClick={() => router.push("/spell")}
          >
            <div className={styles["button-icon"]}>⌨️</div>
            <div className={styles["button-text"]}>SPELLING</div>
            <div className={styles["button-subtitle"]}>Text to Gesture</div>
          </button>

          <button
            className={styles["action-button"]}
            onClick={() => router.push("/dictionary")}
          >
            <div className={styles["button-icon"]}>📖</div>
            <div className={styles["button-text"]}>DICTIONARY</div>
            <div className={styles["button-subtitle"]}>Dictionary</div>
          </button>
        </div>

        {/* User activity sections - only show if authenticated */}
        {isAuthenticated && (
          <>
            {/* Search History Section */}
            <div className={styles["activity-section"]}>
              <h2 className={styles["section-title"]}>📜 Search History</h2>

              {isHistoryLoading && (
                <p className={styles["loading-text"]}>Loading history...</p>
              )}

              {historyError && (
                <p className={styles["error-text"]}>⚠️ {historyError}</p>
              )}

              {!isHistoryLoading &&
                !historyError &&
                searchHistory.length === 0 && (
                  <p className={styles["empty-text"]}>
                    No search history yet.
                  </p>
                )}

              {!isHistoryLoading &&
                !historyError &&
                searchHistory.length > 0 && (
                  <div className={styles["history-list"]}>
                    {searchHistory.map((item, index) => (
                      <div key={index} className={styles["history-item"]}>
                        <div className={styles["history-content"]}>
                          <span className={styles["history-query"]}>
                            🔍 {item.searchQuery}
                          </span>
                          {item.word && (
                            <span className={styles["history-word"]}>
                              → {item.word}
                            </span>
                          )}
                        </div>
                        <div className={styles["history-meta"]}>
                          <span className={styles["history-date"]}>
                            {formatDate(item.searchedAt)}
                          </span>
                          {item.dictionaryId && (
                            <Link
                              href={`/dictionary/${item.dictionaryId}`}
                              className={styles["history-link"]}
                            >
                              View details →
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Favorites Section */}
            <div className={styles["activity-section"]}>
              <h2 className={styles["section-title"]}>
                ⭐ Favorites
              </h2>

              {isFavoritesLoading && (
                <p className={styles["loading-text"]}>
                  Loading favorites...
                </p>
              )}

              {favoritesError && (
                <p className={styles["error-text"]}>⚠️ {favoritesError}</p>
              )}

              {!isFavoritesLoading &&
                !favoritesError &&
                favorites.length === 0 && (
                  <p className={styles["empty-text"]}>
                    No favorites yet. Search and save your favorite words!
                  </p>
                )}

              {!isFavoritesLoading &&
                !favoritesError &&
                favorites.length > 0 && (
                  <div className={styles["favorites-grid"]}>
                    {favorites.map((fav) => (
                      <Link
                        key={fav.id}
                        href={`/dictionary/${fav.dictionaryId}`}
                        className={styles["favorite-card"]}
                      >
                        {fav.videoUrl && (
                          <div className={styles["favorite-video"]}>
                            <video
                              src={fav.videoUrl}
                              className={styles["video-preview"]}
                              muted
                              playsInline
                            />
                            <div className={styles["play-overlay"]}>▶</div>
                          </div>
                        )}
                        <div className={styles["favorite-content"]}>
                          <h3 className={styles["favorite-word"]}>
                            {fav.word}
                          </h3>
                          <p className={styles["favorite-definition"]}>
                            {fav.definition && fav.definition.length > 100
                              ? fav.definition.substring(0, 100) + "..."
                              : fav.definition || "Chưa có định nghĩa"}
                          </p>
                          <p className={styles["favorite-date"]}>
                            💾 {formatDate(fav.savedAt)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}

              {!isFavoritesLoading &&
                !favoritesError &&
                favorites.length > 0 && (
                  <div className={styles["view-all-container"]}>
                    <Link href="/users" className={styles["view-all-link"]}>
                      View all favorites →
                    </Link>
                  </div>
                )}
            </div>
          </>
        )}

        {/* Guest mode info or login prompt */}
        {!isAuthenticated && (
          <div className={styles["login-prompt"]}>
            {isGuest ? (
              <p>
                👤 You are using Guest mode.{" "}
                <Link href="/login" className={styles["login-link"]}>
                  Log in
                </Link>{" "}
                or{" "}
                <Link href="/register" className={styles["login-link"]}>
                  register
                </Link>{" "}
                to save history and favorites.
              </p>
            ) : (
              <p>
                🔒 Please{" "}
                <Link href="/login" className={styles["login-link"]}>
                  log in
                </Link>{" "}
                to view history and favorites.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
