"use client";

import { useRouter } from "next/navigation";
import styles from "../../styles/error.module.css";

export default function ErrorPage() {
  const router = useRouter();

  return (
    <div className={styles["error-container"]}>
      <div className={styles.container}>
        {/* Glitch error code */}
        <div className={styles["error-code"]}>404</div>

        {/* Subtitle with critical failure message */}
        <div className={styles.subtitle}>&gt; SYSTEM CRITICAL FAILURE</div>

        {/* Terminal log box */}
        <div className={styles["terminal-log"]}>
          <div className={`${styles["log-line"]} ${styles.status}`}>
            &gt; CONNECTING TO SERVER...{" "}
            <span className={styles["status-indicator"]}>[FAILED]</span>
          </div>
          <div className={`${styles["log-line"]} ${styles.status}`}>
            &gt; SEARCHING DIRECTORY...{" "}
            <span className={styles["status-indicator"]}>[NULL POINTER]</span>
          </div>
          <div className={`${styles["log-line"]} ${styles.status}`}>
            &gt; ROUTING REQUEST...{" "}
            <span className={styles["status-indicator"]}>[INVALID PATH]</span>
          </div>
          <div className={`${styles["log-line"]} ${styles.error}`}>&gt; ERROR CODE: PAGE NOT FOUND</div>
          <div className={`${styles["log-line"]} ${styles.status}`}>
            &gt; ATTEMPTING RECOVERY...{" "}
            <span className={styles["status-indicator"]}>[STANDBY]</span>
          </div>
        </div>

        {/* Recovery button */}
        <button className={styles["recovery-btn"]} onClick={() => router.push("/")}>
          [ INITIATE SYSTEM RECOVERY ]
        </button>
      </div>
    </div>
  );
}
