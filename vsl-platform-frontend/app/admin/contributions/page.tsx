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
  CheckCircle,
  XCircle,
  User
} from "lucide-react";
import styles from "../../../styles/admin-contributions.module.css";
import { adminApi, ContributionDTO } from "@/lib/admin-api-client";
import { useAuthStore } from "@/stores/auth-store";

interface Contribution {
  id: number;
  word: string;
  user: string;
  category: string;
  difficulty: string;
  submitDate: string;
  status: string;
  definition: string;
  videoUrl?: string;
}

// Helper để parse stagingData từ ContributionDTO
const parseContribution = (dto: ContributionDTO): Contribution => {
  let stagingData: { word?: string; definition?: string; videoUrl?: string; category?: string; difficulty?: string } = {};
  try {
    stagingData = JSON.parse(dto.stagingData || "{}");
  } catch (e) {
    console.error("Error parsing stagingData:", e);
  }

  return {
    id: dto.id,
    word: stagingData.word || "N/A",
    user: dto.username || `User #${dto.userId}`,
    category: stagingData.category || "General",
    difficulty: stagingData.difficulty || "Medium",
    submitDate: dto.createdAt ? new Date(dto.createdAt).toLocaleDateString('en-GB') : "",
    status: dto.status,
    definition: stagingData.definition || "",
    videoUrl: stagingData.videoUrl
  };
};

export default function AdminContributionsPage() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { username } = useAuthStore();
  
  // Logic đồng hồ và tên Admin
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const adminName = username?.toUpperCase() || "ADMIN";

  // State cho contributions từ API
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-GB'); 
      const timeStr = now.toLocaleTimeString('en-GB');
      setCurrentDateTime(`${dateStr} - ${timeStr}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load contributions từ API
  useEffect(() => {
    const loadContributions = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await adminApi.getContributions("PENDING");
        const parsed = data.map(parseContribution);
        setContributions(parsed);
      } catch (err: any) {
        console.error("Error loading contributions:", err);
        setError(err.response?.data?.message || err.message || "Failed to load contributions");
      } finally {
        setLoading(false);
      }
    };

    loadContributions();
  }, []);

  // Menu Config
  const menuItems = [
    { label: "[DASHBOARD]", href: "/admin", icon: LayoutDashboard },
    { label: "[USER_MANAGEMENT]", href: "/admin/users", icon: Users },
    { label: "[CONTRIBUTIONS]", href: "/admin/contributions", icon: FileText },
    { label: "[DICTIONARY_DB]", href: "/admin/dictionary", icon: BookOpen },
  ];

  // #region agent log
  const handleLogout = () => {
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/contributions/page.tsx:handleLogout',message:'Logout button clicked',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion agent log
    logout();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/contributions/page.tsx:handleLogout',message:'Redirecting to login',data:{targetPath:'/login'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion agent log
    router.push("/login");
  };
  // #endregion agent log

  const handleApprove = async (id: number) => {
    if (!confirm(`Approve contribution #${id}?`)) {
      return;
    }

    try {
      await adminApi.approveContribution(id);
      // Reload contributions sau khi approve
      const data = await adminApi.getContributions("PENDING");
      const parsed = data.map(parseContribution);
      setContributions(parsed);
      alert(`Contribution #${id} approved and added to dictionary!`);
    } catch (err: any) {
      console.error("Error approving contribution:", err);
      alert(err.response?.data?.message || err.message || "Failed to approve contribution");
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm(`Reject contribution #${id}?`)) {
      return;
    }

    try {
      await adminApi.rejectContribution(id);
      // Reload contributions sau khi reject
      const data = await adminApi.getContributions("PENDING");
      const parsed = data.map(parseContribution);
      setContributions(parsed);
      alert(`Contribution #${id} rejected!`);
    } catch (err: any) {
      console.error("Error rejecting contribution:", err);
      alert(err.response?.data?.message || err.message || "Failed to reject contribution");
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
                <span style={{textTransform: 'uppercase'}}>ADMIN: {adminName}</span>
            </div>
        </div>
        <div className={styles["status-item"]}>
            <span>{currentDateTime}</span>
        </div>
      </div>

      <aside className={styles.sidebar}>
        <div className={styles["sidebar-header"]}>
           <div className="flex items-center gap-2">
             <Lock size={16}/> VSL_ADMIN
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

      <main className={styles["main-content"]}>
        <h1 className={styles["page-title"]}>{">"} PENDING REQUESTS</h1>

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

        {loading ? (
          <div className={styles["empty-state"]}>
            <div className={styles["empty-state-icon"]}>
              <CheckCircle size={64} />
            </div>
            <div>{">"} LOADING...</div>
          </div>
        ) : contributions.length > 0 ? (
          <div className={styles["review-list"]}>
            {contributions.map((contrib) => (
              <div key={contrib.id} className={styles["review-card"]}>
                <div className={styles["review-card-content"]}>
                  <div className={styles["card-info"]}>
                    <div className={styles["card-word"]}>{contrib.word}</div>
                    <div className={styles["card-submitted"]}>
                      SUBMITTED BY: <span>{contrib.user}</span>
                    </div>
                    <div className={styles["card-definition"]}>
                      <div className={styles["card-definition-label"]}>DEFINITION:</div>
                      <div>{contrib.definition}</div>
                      <div className="mt-2 text-xs text-gray-500">
                         Category: {contrib.category} | Difficulty: {contrib.difficulty}
                      </div>
                    </div>
                  </div>
                  <div className={styles["video-preview"]}>
                    <iframe 
                        src={contrib.videoUrl} 
                        title={`Video for ${contrib.word}`}
                        allowFullScreen 
                    />
                  </div>
                  <div className={styles["card-actions"]}>
                    <button 
                        className={`${styles["btn"]} ${styles["btn-approve"]}`}
                        onClick={() => handleApprove(contrib.id)}
                    >
                       <span className="flex items-center justify-center gap-2">
                         APPROVE
                       </span>
                    </button>
                    <button 
                        className={`${styles["btn"]} ${styles["btn-reject"]}`}
                        onClick={() => handleReject(contrib.id)}
                    >
                        <span className="flex items-center justify-center gap-2">
                            REJECT
                        </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles["empty-state"]}>
             <div className={styles["empty-state-icon"]}>
                <CheckCircle size={64} />
             </div>
             <div>{">"} SYSTEM: ALL_DATA_PROCESSED. QUEUE_EMPTY.</div>
          </div>
        )}
      </main>
    </div>
  );
}