"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import apiClient from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import type { PasswordChangeRequest, ApiResponse, UserDTO } from "@/types/api";
import styles from "../../styles/profile.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState("overview");
  const [showEditModal, setShowEditModal] = useState(false);

  // --- PHẦN THÊM VÀO: State dữ liệu thật ---
  const [user, setUser] = useState<UserDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // State đổi mật khẩu
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // --- PHẦN THÊM VÀO: Call API lấy thông tin user ---
  useEffect(() => {
    const fetchProfile = async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:fetchProfile',message:'Starting to fetch user profile',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion agent log
      
      try {
        // #region agent log
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:fetchProfile',message:'Before API call - token check',data:{hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion agent log
        
        console.log("🚀 Đang gọi API lấy thông tin...");
        const response = await apiClient.get<ApiResponse<UserDTO>>("/user/profile");
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:fetchProfile',message:'API call successful',data:{hasData:!!(response.data && response.data.data),userId:response.data?.data?.id,username:response.data?.data?.username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion agent log
        
        if (response.data && response.data.data) {
          setUser(response.data.data);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:fetchProfile',message:'User state updated',data:{userId:response.data.data.id,username:response.data.data.username},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
          // #endregion agent log
        }
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:fetchProfile',message:'API call failed',data:{error:error.message,status:error.response?.status,statusText:error.response?.statusText},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion agent log
        console.error("Lỗi lấy thông tin:", error);
      } finally {
        setIsLoading(false);
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:fetchProfile',message:'Loading finished',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion agent log
      }
    };
    fetchProfile();
  }, []);

  // Call API đổi mật khẩu (giữ nguyên logic của bạn nhưng sửa lại cho gọn)
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null); setPasswordSuccess(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp"); return;
    }
    setIsPasswordChanging(true);
    try {
      await apiClient.put<ApiResponse<null>>("/user/profile/password", {
        oldPassword: passwordForm.oldPassword, newPassword: passwordForm.newPassword
      });
      setPasswordSuccess("✓ Đổi mật khẩu thành công!");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || "Đổi mật khẩu thất bại");
    } finally {
      setIsPasswordChanging(false);
    }
  };

  // --- PHẦN SỬA ĐỔI: Call API Cập nhật Profile ---
  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const form = e.target as HTMLFormElement;
    const updatedData = {
      fullName: (form.elements.namedItem("fullName") as HTMLInputElement).value,
      phoneNumber: (form.elements.namedItem("phoneNumber") as HTMLInputElement).value,
      dateOfBirth: (form.elements.namedItem("dateOfBirth") as HTMLInputElement).value,
      address: (form.elements.namedItem("address") as HTMLInputElement).value,
      bio: (form.elements.namedItem("bio") as HTMLTextAreaElement).value,
      avatarUrl: (form.elements.namedItem("avatarUrl") as HTMLInputElement).value,
    };

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleEditProfile',message:'Starting profile update',data:{updatedFields:Object.keys(updatedData)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion agent log

    try {
      const response = await apiClient.put<ApiResponse<UserDTO>>("/user/profile", updatedData);
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleEditProfile',message:'Profile update successful',data:{userId:response.data?.data?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion agent log
      
      if (response.data && response.data.data) {
        setUser(response.data.data); // Cập nhật với dữ liệu từ server
      } else {
        setUser({ ...user, ...updatedData }); // Fallback: cập nhật local state
      }
      alert("Cập nhật thành công!");
      setShowEditModal(false);
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleEditProfile',message:'Profile update failed',data:{error:error.message,status:error.response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion agent log
      alert("Cập nhật thất bại!");
    }
  };

  // #region agent log
  const handleLogout = () => {
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleLogout',message:'Logout button clicked',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion agent log
    
    // #region agent log
    const tokenBefore = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleLogout',message:'Before logout - token check',data:{hasToken:!!tokenBefore},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    
    logout();
    
    // #region agent log
    const tokenAfter = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleLogout',message:'After logout - token check',data:{hasToken:!!tokenAfter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion agent log
    
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleLogout',message:'Redirecting to login',data:{targetPath:'/login'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion agent log
    
    router.push("/login");
  };
  // #endregion agent log

  const handleBackToDashboard = () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'users/page.tsx:handleBackToDashboard',message:'Back to dashboard button clicked',data:{targetPath:'/dashboard'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion agent log
    router.push("/dashboard");
  };

  if (isLoading) return <div style={{color: "#00ff41", padding: 50, textAlign: "center", background:"#050505", height:"100vh"}}>&gt; LOADING...</div>;
  if (!user) return <div style={{color: "red", padding: 50, textAlign: "center", background:"#050505", height:"100vh"}}>ERROR: UNAUTHORIZED ACCESS (Please Login)</div>;

  return (
    <div className={styles["profile-container"]}>
      <div className={styles["status-bar"]}>
        <div className={styles["status-left"]}>
          <div className={styles["status-item"]}><div className={styles["status-indicator"]}></div><span>&gt; SYSTEM: ONLINE</span></div>
        </div>
        <div className={styles["status-right"]}>
          <div className={styles["status-item"]}><span>USER_ID: [ {user.id} ]</span></div>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.sidebar}>
          <div className={styles["user-avatar"]}>
             {user.avatarUrl ? <img src={user.avatarUrl} alt="Avt" style={{width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover"}} /> : "👤"}
          </div>
          <div className={styles.username}>{user.username}</div>
          <div className={styles["nav-tabs"]}>
            <button className={`${styles["nav-tab"]} ${activeTab === "overview" ? styles.active : ""}`} onClick={() => setActiveTab("overview")}>OVERVIEW</button>
            <button className={`${styles["nav-tab"]} ${activeTab === "history" ? styles.active : ""}`} onClick={() => setActiveTab("history")}>HISTORY_LOG</button>
            <button className={`${styles["nav-tab"]} ${activeTab === "favorites" ? styles.active : ""}`} onClick={() => setActiveTab("favorites")}>FAVORITE_DATA</button>
            <button className={`${styles["nav-tab"]} ${activeTab === "settings" ? styles.active : ""}`} onClick={() => setActiveTab("settings")}>SETTINGS</button>
          </div>
          <div style={{marginTop: "2rem", display: "flex", flexDirection: "column", gap: "0.75rem"}}>
            <button 
              className={styles["nav-tab"]} 
              onClick={handleBackToDashboard}
              style={{cursor: "pointer", backgroundColor: "rgba(0, 255, 65, 0.1)", border: "1px solid rgba(0, 255, 65, 0.3)"}}
            >
              ← BACK TO DASHBOARD
            </button>
            <button 
              className={styles["nav-tab"]} 
              onClick={handleLogout}
              style={{cursor: "pointer", backgroundColor: "rgba(255, 0, 0, 0.1)", border: "1px solid rgba(255, 0, 0, 0.3)", color: "#ff4444"}}
            >
              LOGOUT
            </button>
          </div>
        </div>

        <div className={styles["main-content"]}>
          {activeTab === "overview" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; OVERVIEW</div>
              <div className={styles["overview-container"]}>
                <div className={styles["overview-left"]}>
                  <div className={styles["overview-avatar"]}>{user.avatarUrl ? <img src={user.avatarUrl} alt="Avt" style={{width:"100%", height:"100%", borderRadius:"50%", objectFit:"cover"}} /> : "👤"}</div>
                  <div className={styles["overview-fullname"]}>{user.fullName || "N/A"}</div>
                  <div className={styles["overview-bio"]}>{user.bio || "No bio available."}</div>
                </div>
                <div className={styles["overview-right"]}>
                  <div className={styles["overview-specs"]}>
                    <div className={styles["spec-item"]}><div className={styles["spec-label"]}>&gt; EMAIL:</div><div className={styles["spec-value"]}>{user.email}</div></div>
                    <div className={styles["spec-item"]}><div className={styles["spec-label"]}>&gt; PHONE:</div><div className={styles["spec-value"]}>{user.phoneNumber || "N/A"}</div></div>
                    <div className={styles["spec-item"]}><div className={styles["spec-label"]}>&gt; BIRTH:</div><div className={styles["spec-value"]}>{user.dateOfBirth || "N/A"}</div></div>
                    <div className={styles["spec-item"]}><div className={styles["spec-label"]}>&gt; ADDRESS:</div><div className={styles["spec-value"]}>{user.address || "N/A"}</div></div>
                    <div className={styles["spec-item"]}><div className={styles["spec-label"]}>&gt; ROLE:</div><div className={styles["spec-value"]}>[ {user.role} ]</div></div>
                  </div>
                  <button className={styles["edit-button"]} onClick={() => setShowEditModal(true)}>[ EDIT_PROFILE ]</button>
                </div>
              </div>
            </div>
          )}

          {/* Các tab History, Favorites, Uploads giữ nguyên placeholder */}
          {activeTab === "history" && <div className={styles["tab-content"]}><div className={styles["tab-title"]}>&gt; HISTORY</div><div style={{color:"#00aa26"}}>&gt; No history data.</div></div>}
          {activeTab === "favorites" && <div className={styles["tab-content"]}><div className={styles["tab-title"]}>&gt; FAVORITES</div><div style={{color:"#00aa26"}}>&gt; No favorite data.</div></div>}

          {activeTab === "settings" && (
            <div className={`${styles["tab-content"]} ${styles.active}`}>
              <div className={styles["tab-title"]}>&gt; SETTINGS</div>
              <form className={styles["settings-form"]} onSubmit={handlePasswordChange}>
                {passwordError && <div className={styles["error-message"]}>⚠️ {passwordError}</div>}
                {passwordSuccess && <div className={styles["success-message"]}>{passwordSuccess}</div>}
                <div className={styles["form-group"]}><label className={styles["form-label"]}>OLD_PASSWORD</label><input type="password" className={styles["form-input"]} value={passwordForm.oldPassword} onChange={(e) => setPasswordForm({...passwordForm, oldPassword: e.target.value})} required disabled={isPasswordChanging} /></div>
                <div className={styles["form-group"]}><label className={styles["form-label"]}>NEW_PASSWORD</label><input type="password" className={styles["form-input"]} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})} required disabled={isPasswordChanging} /></div>
                <div className={styles["form-group"]}><label className={styles["form-label"]}>CONFIRM_PASSWORD</label><input type="password" className={styles["form-input"]} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required disabled={isPasswordChanging} /></div>
                <button type="submit" className={styles["form-button"]} disabled={isPasswordChanging}>{isPasswordChanging ? "PROCESSING..." : "CHANGE_PASSWORD"}</button>
              </form>
            </div>
          )}
        </div>
      </div>

      {showEditModal && (
        <div className={`${styles.modal} ${styles.active}`}>
          <div className={styles["modal-content"]}>
            <button className={styles["modal-close-btn"]} onClick={() => setShowEditModal(false)}>×</button>
            <div className={styles["modal-title"]}>&gt; EDIT_PROFILE</div>
            <form className={styles["modal-form"]} onSubmit={handleEditProfile}>
              <div className={styles["form-group"]}><label className={styles["form-label"]}>FULL_NAME</label><input name="fullName" className={styles["form-input"]} defaultValue={user.fullName || ""} required /></div>
              <div className={styles["form-group"]}><label className={styles["form-label"]}>PHONE</label><input name="phoneNumber" className={styles["form-input"]} defaultValue={user.phoneNumber || ""} /></div>
              <div className={styles["form-group"]}><label className={styles["form-label"]}>BIRTH</label><input name="dateOfBirth" type="date" className={styles["form-input"]} defaultValue={user.dateOfBirth || ""} /></div>
              <div className={styles["form-group"]}><label className={styles["form-label"]}>ADDRESS</label><input name="address" className={styles["form-input"]} defaultValue={user.address || ""} /></div>
              <div className={styles["form-group"]}><label className={styles["form-label"]}>BIO</label><textarea name="bio" className={styles["form-input"]} rows={3} defaultValue={user.bio || ""} ></textarea></div>
              <div className={styles["form-group"]}><label className={styles["form-label"]}>AVATAR_URL</label><input name="avatarUrl" className={styles["form-input"]} defaultValue={user.avatarUrl || ""} placeholder="https://..." /></div>
              <div className={styles["modal-button-group"]}>
                <button type="button" className={`${styles["modal-button"]} ${styles.cancel}`} onClick={() => setShowEditModal(false)}>CANCEL</button>
                <button type="submit" className={styles["modal-button"]}>SAVE_CHANGES</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}