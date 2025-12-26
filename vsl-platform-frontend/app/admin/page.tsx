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
  AlertCircle,
  Activity,
  User
} from "lucide-react";
import styles from "../../styles/admin.module.css";
import { adminApi } from "@/lib/admin-api-client";
import { useAuthStore } from "@/stores/auth-store";

export default function AdminDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { username } = useAuthStore();
  
  // State cho đồng hồ
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const adminName = username?.toUpperCase() || "ADMIN"; // Lấy tên từ auth store
  
  // State cho stats từ API
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWords: 0,
    pendingContributions: 0,
    uptime: "99.9%"
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Effect cập nhật thời gian mỗi giây
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format: DD/MM/YYYY | HH:mm:ss
      const dateStr = now.toLocaleDateString('en-GB'); 
      const timeStr = now.toLocaleTimeString('en-GB');
      setCurrentDateTime(`${dateStr} - ${timeStr}`);
    };

    updateTime(); // Chạy ngay lập tức
    const timer = setInterval(updateTime, 1000); // Cập nhật mỗi giây

    return () => clearInterval(timer); // Dọn dẹp khi unmount
  }, []);

  // Effect để load stats từ API
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminApi.getStats();
        setStats({
          totalUsers: data.totalUsers,
          totalWords: data.totalWords,
          pendingContributions: data.pendingContributions,
          uptime: "99.9%" // Uptime không có trong API, giữ giá trị mặc định
        });
      } catch (err: any) {
        console.error("Error loading dashboard stats:", err);
        setError(err.response?.data?.message || err.message || "Failed to load statistics");
        // Giữ giá trị mặc định khi lỗi
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  // Menu Configuration
  const menuItems = [
    { label: "[DASHBOARD]", href: "/admin", icon: LayoutDashboard },
    { label: "[USER MANAGEMENT]", href: "/admin/users", icon: Users },
    { label: "[CONTRIBUTIONS]", href: "/admin/contributions", icon: FileText },
    { label: "[DICTIONARY DATABASE]", href: "/admin/dictionary", icon: BookOpen },
  ];

  // #region agent log
  const handleLogout = () => {
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:handleLogout',message:'Logout button clicked',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion agent log
    
    // #region agent log
    const tokenBefore = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:handleLogout',message:'Before logout - token check',data:{hasToken:!!tokenBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    
    logout();
    
    // #region agent log
    const tokenAfter = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:handleLogout',message:'After logout - token check',data:{hasToken:!!tokenAfter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/page.tsx:handleLogout',message:'Redirecting to login',data:{targetPath:'/login'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion agent log
    
    router.push("/login");
  };

  return (
    <div className={styles["admin-container"]}>
      
      {/* --- STATUS BAR (Đã cập nhật) --- */}
      <div className={styles["status-bar"]}>
        <div className={styles["status-bar-left"]}>
            <div className={styles["status-item"]}>
                <span className={styles["status-indicator"]}></span>
                <span>SYSTEM: ONLINE</span>
            </div>
            
            {/* Phần hiển thị tên Admin */}
            <div className={styles["status-item"]}>
                <User size={14} /> {/* Thêm icon user cho đẹp */}
                <span style={{textTransform: 'uppercase'}}>ADMIN: {adminName}</span>
            </div>
        </div>

        {/* Phần hiển thị Ngày & Giờ bên phải */}
        <div className={styles["status-item"]}>
            <span>{currentDateTime}</span>
        </div>
      </div>

      {/* --- SIDEBAR --- */}
      <aside className={styles.sidebar}>
        <div className={styles["sidebar-header"]}>
           <div className="flex items-center gap-2">
             <Lock size={16}/> VSL ADMIN
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
                  className={`${styles["menu-item"]} ${isActive ? styles["menu-item-active"] : ""}`}
                >
                  <span className={styles["icon-wrapper"]}><Icon size={16}/></span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}

          <li>
            <div 
              className={styles["menu-item"]} 
              style={{cursor: 'pointer'}}
              onClick={handleLogout}
            >
               <span className={styles["icon-wrapper"]}><LogOut size={16}/></span>
               <span>[LOGOUT]</span>
            </div>
          </li>
        </ul>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className={styles["main-content"]}>
        
        <h1 className={styles["page-title"]}>
          <Terminal size={28} />
          SYSTEM OVERVIEW
        </h1>

        {error && (
          <div style={{ 
            padding: '12px', 
            marginBottom: '20px', 
            background: 'rgba(255,0,0,0.1)', 
            border: '1px solid #ff0000',
            color: '#ff0000',
            fontSize: '12px'
          }}>
            ERROR: {error}
          </div>
        )}

        <div className={styles["stats-grid"]}>
          
          <div className={styles["stat-card"]}>
            <div className={styles["stat-icon"]}>
              <Users size={32} />
            </div>
            <div className={styles["stat-label"]}>TOTAL USERS</div>
            <div className={styles["stat-value"]}>
              {loading ? "..." : stats.totalUsers.toLocaleString()}
            </div>
            <div className={styles["stat-unit"]}>registered accounts</div>
          </div>

          <div className={styles["stat-card"]}>
            <div className={styles["stat-icon"]}>
              <BookOpen size={32} />
            </div>
            <div className={styles["stat-label"]}>TOTAL WORDS</div>
            <div className={styles["stat-value"]}>
              {loading ? "..." : stats.totalWords.toLocaleString()}
            </div>
            <div className={styles["stat-unit"]}>in database</div>
          </div>

          <div className={`${styles["stat-card"]} ${styles["stat-card-alert"]}`}>
            <div className={styles["stat-icon"]}>
              <AlertCircle size={32} />
            </div>
            <div className={styles["stat-label"]}>PENDING CONTRIBUTIONS</div>
            <div className={styles["stat-value"]}>
              {loading ? "..." : stats.pendingContributions}
            </div>
            <div className={styles["stat-unit"]}>awaiting review</div>
          </div>

          <div className={styles["stat-card"]}>
            <div className={styles["stat-icon"]}>
              <Activity size={32} />
            </div>
            <div className={styles["stat-label"]}>SYSTEM UPTIME</div>
            <div className={styles["stat-value"]}>{stats.uptime}</div>
            <div className={styles["stat-unit"]}>operational status</div>
          </div>

        </div>

      </main>
    </div>
  );
}