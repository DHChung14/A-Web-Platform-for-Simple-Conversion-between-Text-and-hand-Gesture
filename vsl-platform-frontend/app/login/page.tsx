"use client";

import { useState, FormEvent, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { ApiResponse, AuthResponse } from "@/types/api";
import styles from "../../styles/login.module.css";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/"; // Default to "/" if no from parameter
  const expired = searchParams.get("expired"); // Check if session expired
  const login = useAuthStore((state) => state.login);
  const setGuestMode = useAuthStore((state) => state.setGuestMode);
  const logout = useAuthStore((state) => state.logout);
  
  // Clear auth state if session expired
  useEffect(() => {
    if (expired === "true") {
      logout(); // Clear any stale auth state
    }
  }, [expired, logout]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/login",
        { username, password }
      );

      // Check response code (can be number or string)
      const responseCode = response.data.code;
      const isSuccess = (responseCode === 200 || String(responseCode) === "200") && response.data.data;
      
      if (isSuccess) {
        const authData = response.data.data;
        login(authData);

        // Redirect based on role
        if (authData.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
      } else {
        setError(response.data.message || "Login failed");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      
      // Extract error message from response
      let errorMessage = "Login failed. Please check your username and password.";
      
      if (err.response) {
        // Check if response has data with message
        if (err.response.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data?.code) {
          // If we have a code but no message, use default
          errorMessage = "Invalid username or password";
        }
        
        // Handle rate limiting
        if (err.response.status === 429) {
          errorMessage = "Too many login attempts. Please wait a moment and try again.";
        } else if (err.response.status === 401) {
          errorMessage = err.response.data?.message || "Invalid username or password";
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.matrixBg} />
      <div className={styles.scanline} />

      <Link href={from} className={styles.backLink}>
        ← Back
      </Link>

      <div className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <div className={styles.loginTitle}>LOGIN</div>
          <div className={styles.loginSubtitle}>Access VSL Platform</div>
        </div>

        {expired === "true" && (
          <div className={styles.errorMessage} style={{ marginBottom: "10px" }}>
            ⚠️ Your session has expired. Please log in again.
          </div>
        )}
        {error && <div className={styles.errorMessage}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="username" className={styles.formLabel}>
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              className={styles.formInput}
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.formLabel}>
              Password
            </label>
            <div className={styles.inputContainer}>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                className={styles.formInput}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? "👁" : "👁‍🗨"}
              </button>
            </div>
          </div>

          <div className={styles.rememberForgot}>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" name="remember" disabled={isLoading} />
              <span>Remember me</span>
            </label>
            <a href="#" className={styles.forgotLink}>
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className={styles.divider}>
          <span className={styles.dividerText}>OR</span>
        </div>

        <button
          type="button"
          className={styles.guestButton}
          onClick={() => {
            setGuestMode();
            router.push("/dashboard");
          }}
          disabled={isLoading}
        >
          Continue as Guest
        </button>

        <div className={styles.registerLink}>
          Don't have an account? <Link href={`/register?from=${encodeURIComponent(from)}`}>Register now</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className={styles.loginContainer}>
        <div className={styles.matrixBg} />
        <div className={styles.scanline} />
        <div className={styles.loginBox}>
          <div className={styles.loginHeader}>
            <div className={styles.loginTitle}>LOADING...</div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
