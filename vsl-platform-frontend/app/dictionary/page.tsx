"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import { ApiResponse, DictionaryDTO } from "@/types/api";
import styles from "../../styles/dictionary.module.css";

export default function DictionaryPage() {
  const { isAuthenticated, role } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<DictionaryDTO[]>([]);
  const [suggestions, setSuggestions] = useState<DictionaryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * searchDictionary - Gọi API tìm kiếm từ điển
   * Only called when there's a search query
   */
  const searchDictionary = useCallback(async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      console.log("[Dictionary] Query is empty, will show random words");
      return;
    }

    console.log(`[Dictionary] Searching for: "${trimmedQuery}"`);

    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.get<ApiResponse<DictionaryDTO[]>>(
        "/dictionary/search",
        { params: { query: trimmedQuery } }
      );

      console.log(`[Dictionary] API Response:`, response.data);

      if (response.data.code === 200 && response.data.data) {
        const foundResults = response.data.data;
        console.log(
          `[Dictionary] Success: Found ${foundResults.length} results`
        );
        setResults(foundResults);
        setSuggestions(foundResults.slice(0, 5)); // Show top 5 as suggestions
      } else {
        const errorMsg = response.data.message || "No results found";
        console.warn(`[Dictionary] No results or error:`, errorMsg);
        setError(errorMsg);
        setResults([]);
        setSuggestions([]);
      }
    } catch (err: unknown) {
      console.error("[Dictionary] Search error:", err);
      setError(
        err instanceof Error
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message || err.message
          : "Error searching. Please try again."
      );
      setResults([]);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch random words when no search query
   */
  const fetchRandomWords = useCallback(async () => {
    console.log("[Dictionary] Fetching random words...");
    setIsLoading(true);
    setError("");

    try {
      // Fetch total count
      const countResponse = await apiClient.get<ApiResponse<number>>(
        "/dictionary/count"
      );
      if (countResponse.data.code === 200 && countResponse.data.data) {
        setTotalCount(countResponse.data.data);
      }

      // Fetch 6 random words
      const response = await apiClient.get<
        ApiResponse<DictionaryDTO | DictionaryDTO[]>
      >("/dictionary/random", { params: { count: 6 } });

      console.log(`[Dictionary] Random words response:`, response.data);

      if (response.data.code === 200 && response.data.data) {
        // Handle both single object and array responses
        const randomWords = Array.isArray(response.data.data)
          ? response.data.data
          : [response.data.data];
        console.log(
          `[Dictionary] Success: Received ${randomWords.length} random words`
        );
        setResults(randomWords);
      } else {
        setResults([]);
      }
    } catch (err: unknown) {
      console.error("[Dictionary] Error fetching random words:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Debounced search effect (300ms delay)
   * Also handles fetching random words when no search query
   */
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (searchQuery.trim()) {
      // If there's a search query, search
      debounceTimeoutRef.current = setTimeout(() => {
        console.log(`[Dictionary] Debounce completed, triggering search`);
        searchDictionary(searchQuery);
      }, 300);
    } else {
      // If no search query, show random words (with small delay to avoid flickering)
      setSuggestions([]);
      setError("");
      debounceTimeoutRef.current = setTimeout(() => {
        fetchRandomWords();
      }, 100);
    }

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [searchQuery, searchDictionary, fetchRandomWords]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (searchQuery && suggestions.length > 0) {
        // Keep suggestions visible when typing
        return;
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [searchQuery, suggestions]);

  const handleSuggestionClick = (word: string) => {
    setSearchQuery(word);
    setSuggestions([]);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#050505" }}>
      {/* Status Bar */}
      <div className={styles["status-bar"]}>
        <div className={styles["status-bar-left"]}>
          <div className={styles["status-item"]}>
            <span className={styles["status-indicator"]}></span>
            <span>&gt; SYSTEM: DICTIONARY_DATABASE_MOUNTED</span>
          </div>
        </div>
        <div className={styles["status-item"]}>
          <Link
            href="/dashboard"
            style={{
              cursor: "pointer",
              fontSize: "14px",
              color: "#00ff41",
              textDecoration: "none",
            }}
          >
            <i className="fas fa-arrow-left"></i>
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className={styles["container"]}>
        {/* Hero Section */}
        <div className={styles["hero"]}>
          <h1 className={styles["hero-title"]}>[DICTIONARY_MODE]</h1>
        </div>

        {/* Search Zone */}
        <div className={styles["search-zone"]} style={{ position: "relative" }}>
          <input
            type="text"
            className={styles["search-input"]}
            id="searchInput"
            placeholder="TÌM KIẾM TỪ VỰNG..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoComplete="off"
            style={{ paddingRight: searchQuery ? "40px" : "0" }}
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setResults([]);
                setSuggestions([]);
              }}
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "transparent",
                border: "none",
                color: "#00ff41",
                cursor: "pointer",
                fontSize: "18px",
                padding: "4px 8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ff4444";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#00ff41";
              }}
              title="Clear search"
            >
              ✕
            </button>
          )}
          <div
            className={`${styles["suggestions"]} ${
              suggestions.length > 0 && searchQuery ? styles["active"] : ""
            }`}
          >
            {suggestions.map((word) => (
              <div
                key={word.id}
                className={styles["suggestion-item"]}
                onClick={() => handleSuggestionClick(word.word)}
              >
                {word.word}
              </div>
            ))}
          </div>
        </div>

        {/* Results Area */}
        {error && (
          <div
            style={{
              color: "#ff4444",
              textAlign: "center",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        {isLoading && (
          <div
            style={{
              color: "#00ff41",
              textAlign: "center",
              padding: "40px",
            }}
          >
            &gt; SEARCHING...
          </div>
        )}

        {!isLoading && !error && results.length === 0 && searchQuery && (
          <div
            style={{
              color: "#00aa26",
              textAlign: "center",
              padding: "40px",
            }}
          >
            &gt; No vocabulary found matching &quot;{searchQuery}&quot;
          </div>
        )}

        {!searchQuery && results.length === 0 && !isLoading && (
          <div
            style={{
              color: "#00aa26",
              textAlign: "center",
              padding: "40px",
            }}
          >
            &gt; Loading random words...
          </div>
        )}

        {!searchQuery && results.length > 0 && !isLoading && (
          <div
            style={{
              color: "#00ff41",
              textAlign: "center",
              marginBottom: "20px",
              fontSize: "12px",
              letterSpacing: "1px",
            }}
          >
            &gt; RANDOM WORDS (
            {totalCount !== null ? `Total: ${totalCount} words` : ""})
          </div>
        )}

        <div className={styles["results"]}>
          {results.map((word) => (
            <Link
              key={word.id}
              href={`/dictionary/${word.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div className={styles["result-card"]}>
                <div className={styles["result-card-title"]}>
                  {word.word.toUpperCase()}
                </div>
                <div className={styles["result-card-metadata"]}>
                  <div>ID: #{word.id}</div>
                  {word.definition && (
                    <div style={{ marginTop: "8px", opacity: 0.8 }}>
                      {word.definition.length > 80
                        ? word.definition.substring(0, 80) + "..."
                        : word.definition}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FAB button for contributing new words - only show for authenticated users */}
      {isAuthenticated && role && role.toUpperCase() === "USER" && (
        <Link href="/contribute">
          <button
            className={styles["fab-button"]}
            title="Contribute a new word"
          >
            <i className="fas fa-plus"></i>
          </button>
        </Link>
      )}

      {/* Footer */}
      <div className={styles["footer"]}>
        <Link href="/dashboard">
          <button className={styles["footer-button"]}>&lt; BACK</button>
        </Link>
        <span style={{ fontSize: "11px", letterSpacing: "1px" }}>
          v1.0 | WORDS_DB:{" "}
          {totalCount !== null
            ? totalCount
            : searchQuery
            ? results.length
            : "..."}{" "}
          | STATUS: ONLINE
        </span>
      </div>
    </div>
  );
}
