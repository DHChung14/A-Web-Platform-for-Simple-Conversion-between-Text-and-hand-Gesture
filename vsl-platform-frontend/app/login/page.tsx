"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import apiClient from "@/lib/api-client";
import { ApiResponse, AuthResponse } from "@/types/api";
import styles from "../../styles/login.module.css";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const setGuestMode = useAuthStore((state) => state.setGuestMode);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await apiClient.post<ApiResponse<AuthResponse>>(
        "/auth/login",
        { username, password }
      );

      if (response.data.code === 200 && response.data.data) {
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
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your username and password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.matrixBg} />
      <div className={styles.scanline} />

      <Link href="/" className={styles.backLink}>
        ← Back
      </Link>

      <div className={styles.loginBox}>
        <div className={styles.loginHeader}>
          <div className={styles.loginTitle}>LOGIN</div>
          <div className={styles.loginSubtitle}>Access VSL Platform</div>
        </div>

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
          Don't have an account? <Link href="/register">Register now</Link>
        </div>
      </div>
    </div>
  );
}
