"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, Terminal, User, Play
} from "lucide-react";
import styles from "../../styles/spell.module.css";
import apiClient from "../../lib/api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function SpellingPage() {
  const [inputText, setInputText] = useState("");
  const [gestureData, setGestureData] = useState<{char: string, url: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { username, isAuthenticated, isGuest } = useAuthStore();
  
  // State cho Status Bar
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [userName, setUserName] = useState<string>("INITIALIZING...");

  // --- 1. Effect: Đồng hồ & Lấy User Info ---
  useEffect(() => {
    // Clock
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB'); 
      const timeStr = now.toLocaleTimeString('en-GB');
      setCurrentDateTime(`${dateStr} - ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);

    // Get User Info: Ưu tiên từ auth store, nếu không có thì gọi API
    const fetchUser = async () => {
      // Nếu là guest mode, hiển thị GUEST_MODE
      if (isGuest) {
        setUserName("GUEST_MODE");
        return;
      }

      // Nếu đã có username trong auth store, dùng nó
      if (username) {
        setUserName(username);
        
        // Vẫn thử gọi API để lấy fullName nếu có
        if (isAuthenticated) {
          try {
            const res: any = await apiClient.get("/users/me");
            const name = res.fullName || res.username || username;
            setUserName(name);
          } catch (error) {
            // Nếu API fail, vẫn dùng username từ store
            console.error("Failed to fetch user details:", error);
          }
        }
      } else {
        // Nếu không có username trong store, thử gọi API
        try {
          const res: any = await apiClient.get("/users/me");
          const name = res.fullName || res.username || "UNKNOWN_USER";
          setUserName(name);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          setUserName("GUEST_MODE");
        }
      }
    };
    fetchUser();

    return () => clearInterval(timer);
  }, [username, isAuthenticated, isGuest]);

  // --- 2. Hàm bỏ dấu tiếng Việt ---
  const removeAccents = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D");
  };

  // --- 3. Hàm xử lý Mapping ảnh (Local) ---
  const handleSpell = () => {
    if (!inputText.trim()) return;

    setIsLoading(true);
    setGestureData([]);

    setTimeout(() => {
      const rawText = removeAccents(inputText).toLowerCase(); 
      const chars = rawText.split('');

      const newData = chars.map((char) => {
        if (/[a-z0-9]/.test(char)) {
          return {
            char: char,
            url: `/images/alphabet/${char}.png` 
          };
        } 
        else if (char === ' ') {
          return { char: ' ', url: 'SPACE' };
        }
        else {
          return { char: char, url: 'UNKNOWN' };
        }
      });

      setGestureData(newData);
      setIsLoading(false);
    }, 500); 
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSpell();
    }
  };

  return (
    <div className={styles.container}>
      
      {/* --- STATUS BAR (Đã đồng bộ với Admin UI) --- */}
      <div className={styles["status-bar"]}>
        <div className={styles["status-bar-left"]}>
            <div className={styles["status-item"]}>
                <span className={styles["status-indicator"]}></span>
                <span>SYSTEM: ONLINE</span>
            </div>
            <div className={styles["status-item"]}>
                <User size={14} />
                {/* Hiển thị USER thay vì ADMIN */}
                <span style={{textTransform: 'uppercase'}}>USER: {userName}</span>
            </div>
        </div>
        <div className={styles["status-item"]}>
            <span>{currentDateTime}</span>
        </div>
      </div>

      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles["main-title"]}>SPELLING TRANSLATOR</h1>
        <div className={styles["sub-title"]}>TEXT TO HAND SIGN CONVERSION PROTOCOL</div>
      </header>

      {/* Input Zone */}
      <section className={styles["input-section"]}>
        <div className={styles["input-wrapper"]}>
          <input 
            type="text" 
            className={styles["text-input"]}
            placeholder="ENTER TEXT (VIETNAMESE SUPPORTED)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button 
            className={styles["translate-btn"]}
            onClick={handleSpell}
            disabled={isLoading}
          >
            {isLoading ? "MAPPING..." : (
              <>
                EXECUTE <Play size={16} fill="black" />
              </>
            )}
          </button>
        </div>
      </section>

      {/* Output Zone */}
      <section className={styles["output-section"]}>
        <div className={styles["gesture-grid"]}>
          {gestureData.map((item, index) => (
            <div 
              key={index} 
              className={styles["gesture-card"]}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className={styles["image-frame"]}>
                <div className={styles["bracket-tl"]}></div>
                <div className={styles["bracket-tr"]}></div>
                <div className={styles["bracket-bl"]}></div>
                <div className={styles["bracket-br"]}></div>
                
                {item.url === 'SPACE' ? (
                  <div style={{color: 'rgba(0,255,65,0.3)', fontSize: '12px'}}>[ SPACE ]</div>
                ) : item.url === 'UNKNOWN' ? (
                  <div style={{color: '#ff4444', fontSize: '20px'}}>?</div>
                ) : (
                  <img 
                    src={item.url} 
                    alt={`Sign for ${item.char}`} 
                    className={styles["gesture-image"]}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      if (target.parentElement) {
                         const errDiv = document.createElement('div');
                         errDiv.innerText = '[NO_IMG]';
                         errDiv.style.color = '#555';
                         errDiv.style.fontSize = '10px';
                         target.parentElement.appendChild(errDiv);
                      }
                    }}
                  />
                )}
              </div>
              
              <span className={styles["character-caption"]}>
                {item.char === ' ' ? 'SP' : item.char.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Navigation */}
      <Link href="/dashboard">
        <button className={styles["back-btn"]}>
           <ArrowLeft size={16} /> RETURN TO DASHBOARD
        </button>
      </Link>

    </div>
  );
}