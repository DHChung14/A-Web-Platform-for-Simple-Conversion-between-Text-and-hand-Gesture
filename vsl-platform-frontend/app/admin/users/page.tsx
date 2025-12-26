"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Terminal, LayoutDashboard, Users, FileText, BookOpen, LogOut, Lock, 
  Plus, Edit, Trash2, Search, X, Save, Shield, UserCheck, Activity, 
  Eye, Key, User as UserIcon, MapPin, Calendar, Phone, Mail, FileCode 
} from "lucide-react";
import styles from "../../../styles/admin-users.module.css";
import { adminApi, UserDTO } from "@/lib/admin-api-client";
import { useAuthStore } from "@/stores/auth-store";

// Interface để map từ UserDTO sang User (cho UI)
interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  dob: string;
  address: string;
  phoneNumber?: string;
  bio?: string;
  role: "ADMIN" | "USER";
  lastLogin: string;
  joinDate: string;
  avatar?: string;
}

// Helper function để convert UserDTO sang User
const mapUserDTOToUser = (dto: UserDTO): User => {
  return {
    id: dto.id,
    username: dto.username,
    email: dto.email,
    fullName: dto.fullName || "",
    dob: dto.dateOfBirth || "",
    address: dto.address || "",
    phoneNumber: dto.phoneNumber || undefined,
    bio: dto.bio || undefined,
    role: (dto.role as "ADMIN" | "USER") || "USER",
    lastLogin: "Never", // Backend không có lastLogin, có thể thêm sau
    joinDate: dto.createdAt ? new Date(dto.createdAt).toLocaleDateString('en-GB') : "",
    avatar: dto.avatarUrl || undefined
  };
};

export default function AdminUsersPage() {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const { username } = useAuthStore();
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const adminName = username?.toUpperCase() || "ADMIN";

  // State cho users từ API
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  
  // State quản lý Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // State dữ liệu đang thao tác
  const [currentUser, setCurrentUser] = useState<Partial<User>>({});
  const [viewUser, setViewUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState(""); 

  // --- Effects ---
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

  // Load users từ API
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await adminApi.getUsers(page, 20);
        const mappedUsers = response.content.map(mapUserDTOToUser);
        setUsers(mappedUsers);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
      } catch (err: any) {
        console.error("Error loading users:", err);
        setError(err.response?.data?.message || err.message || "Failed to load users");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [page]);

  const menuItems = [
    { label: "[DASHBOARD]", href: "/admin", icon: LayoutDashboard },
    { label: "[USER MANAGEMENT]", href: "/admin/users", icon: Users },
    { label: "[CONTRIBUTIONS]", href: "/admin/contributions", icon: FileText },
    { label: "[DICTIONARY DATABASE]", href: "/admin/dictionary", icon: BookOpen },
  ];

  // #region agent log
  const handleLogout = () => {
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/users/page.tsx:handleLogout',message:'Logout button clicked',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion agent log
    logout();
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin/users/page.tsx:handleLogout',message:'Redirecting to login',data:{targetPath:'/login'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion agent log
    router.push("/login");
  };
  // #endregion agent log

  // --- Logic Handlers ---

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Helper: Cập nhật field khi gõ
  const handleInputChange = (field: keyof User, value: string) => {
    setCurrentUser(prev => ({ ...prev, [field]: value }));
  };

  const handleAddUser = () => {
    setCurrentUser({ 
        role: "USER", 
        avatar: "", 
        fullName: "",
        username: "",
        email: "",
        address: "",
        phoneNumber: "",
        dob: "",
        bio: ""
    });
    setIsEditMode(false);
    setNewPassword("");
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    // Clone object để không bị dính tham chiếu (sửa modal mà bảng nhảy theo trước khi save)
    setCurrentUser({ ...user }); 
    setIsEditMode(true);
    setNewPassword(""); 
    setIsModalOpen(true);
  };

  const handleViewProfile = (user: User) => {
    setViewUser(user);
    setIsProfileModalOpen(true);
  };

  const handleDeleteUser = async (id: number) => {
    if(!confirm("WARNING: Are you sure you want to delete this user?")) {
      return;
    }

    try {
      await adminApi.deleteUser(id);
      // Reload users sau khi xóa
      const response = await adminApi.getUsers(page, 20);
      const mappedUsers = response.content.map(mapUserDTOToUser);
      setUsers(mappedUsers);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
      alert("User deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting user:", err);
      alert(err.response?.data?.message || err.message || "Failed to delete user");
    }
  };

  const handleSave = async () => {
    if (!currentUser.username || !currentUser.email) {
        alert("Username and Email are required!");
        return;
    }

    try {
      if (isEditMode && currentUser.id) {
        // Update user
        const updateData: Partial<UserDTO> = {
          username: currentUser.username,
          email: currentUser.email,
          fullName: currentUser.fullName || null,
          phoneNumber: currentUser.phoneNumber || null,
          dateOfBirth: currentUser.dob || null,
          address: currentUser.address || null,
          bio: currentUser.bio || null,
          role: currentUser.role as any,
          avatarUrl: currentUser.avatar || null
        };
        
        const updated = await adminApi.updateUser(currentUser.id, updateData);
        
        // Reset password nếu có
        if (newPassword && newPassword.trim()) {
          await adminApi.resetUserPassword(currentUser.id, newPassword);
        }
        
        // Reload users
        const response = await adminApi.getUsers(page, 20);
        const mappedUsers = response.content.map(mapUserDTOToUser);
        setUsers(mappedUsers);
        alert("User updated successfully!");
      } else {
        // Create user
        if (!newPassword || !newPassword.trim()) {
          alert("Password is required for new users!");
          return;
        }
        
        const createData = {
          username: currentUser.username!,
          email: currentUser.email!,
          password: newPassword,
          fullName: currentUser.fullName || undefined,
          phoneNumber: currentUser.phoneNumber || undefined,
          dateOfBirth: currentUser.dob || undefined,
          address: currentUser.address || undefined,
          bio: currentUser.bio || undefined
        };
        
        await adminApi.createUser(createData);
        
        // Reload users
        const response = await adminApi.getUsers(page, 20);
        const mappedUsers = response.content.map(mapUserDTOToUser);
        setUsers(mappedUsers);
        setTotalPages(response.totalPages);
        setTotalElements(response.totalElements);
        alert("User created successfully!");
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error saving user:", err);
      alert(err.response?.data?.message || err.message || "Failed to save user");
    }
  };

  return (
    <div className={styles["admin-container"]}>
      
      {/* STATUS BAR */}
      <div className={styles["status-bar"]}>
        <div className={styles["status-bar-left"]}>
            <div className={styles["status-item"]}>
                <span className={styles["status-indicator"]}></span>
                <span>SYSTEM: ONLINE</span>
            </div>
            <div className={styles["status-item"]}>
                <UserIcon size={14} /> 
                <span style={{textTransform: 'uppercase'}}>ADMIN: {adminName}</span>
            </div>
        </div>
        <div className={styles["status-item"]}>
            <span>{currentDateTime}</span>
        </div>
      </div>

      {/* SIDEBAR */}
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

      {/* MAIN CONTENT */}
      <main className={styles["main-content"]}>
        <div className={styles["page-header"]}>
          <div className={styles["page-title"]}>
            <Users size={24} /> USER MANAGEMENT
          </div>
        </div>

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

        {/* Stats */}
        <div className={styles["stats-container"]}>
          <div className={styles["stat-card"]}><div className={styles["stat-icon"]}><Users /></div><div className={styles["stat-info"]}><span className={styles["stat-value"]}>{loading ? "..." : totalElements}</span><span className={styles["stat-label"]}>TOTAL USERS</span></div></div>
          <div className={styles["stat-card"]}><div className={styles["stat-icon"]}><UserCheck /></div><div className={styles["stat-info"]}><span className={styles["stat-value"]}>{loading ? "..." : users.filter(u=>u.role==='USER').length}</span><span className={styles["stat-label"]}>REGULAR USERS</span></div></div>
          <div className={styles["stat-card"]}><div className={styles["stat-icon"]}><Shield /></div><div className={styles["stat-info"]}><span className={styles["stat-value"]}>{loading ? "..." : users.filter(u=>u.role==='ADMIN').length}</span><span className={styles["stat-label"]}>ADMINS</span></div></div>
          <div className={styles["stat-card"]}><div className={styles["stat-icon"]}><Activity /></div><div className={styles["stat-info"]}><span className={styles["stat-value"]}>98%</span><span className={styles["stat-label"]}>RETENTION</span></div></div>
        </div>

        {/* Toolbar */}
        <div className={styles["toolbar"]}>
          <div className="flex gap-2 flex-1">
            <input type="text" className={styles["search-box"]} placeholder="Search user..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <button className={styles["btn-add"]} style={{width: 'auto'}}><Search size={16} /></button>
          </div>
          <button className={styles["btn-add"]} onClick={handleAddUser}><Plus size={16} /> ADD USER</button>
        </div>

        {/* Table */}
        <div className={styles["table-container"]}>
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
              Loading users...
            </div>
          ) : (
          <table className={styles["data-table"]}>
            <thead>
              <tr>
                <th>ID</th>
                <th>IDENTITY</th>
                <th>CONTACT</th>
                <th>LOCATION</th>
                <th>ROLE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    No users found
                  </td>
                </tr>
              ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>#{user.id}</td>
                  
                  {/* Identity: Avatar + Username + FullName */}
                  <td>
                    <div className={styles["user-info-cell"]}>
                      <img src={user.avatar || "/default-avatar.png"} alt="avt" className={styles["user-avatar"]} />
                      <div style={{display:'flex', flexDirection:'column', lineHeight:'1.2'}}>
                        <div 
                            className={styles["clickable-name"]}
                            onClick={() => handleViewProfile(user)}
                            style={{fontSize:'13px', fontWeight:'bold', color:'#00ff41'}}
                        >
                            {user.username}
                        </div>
                        <div style={{fontSize: '11px', color: '#888', fontStyle:'italic'}}>
                            {user.fullName}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact: Email + Phone */}
                  <td>
                    <div style={{display:'flex', flexDirection:'column', lineHeight:'1.3'}}>
                        <div style={{color: '#eee', fontSize:'12px'}}>{user.email}</div>
                        <div style={{color: '#666', fontSize:'11px', letterSpacing:'0.5px'}}>
                            {user.phoneNumber || "N/A"}
                        </div>
                    </div>
                  </td>

                  <td style={{maxWidth: '180px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color:'#ccc'}}>
                    {user.address}
                  </td>

                  <td><span className={`${styles["role-badge"]} ${user.role === 'ADMIN' ? styles["role-admin"] : styles["role-user"]}`}>{user.role}</span></td>

                  <td>
                    <div className={styles["action-buttons"]}>
                      <button className={styles["btn-icon"]} title="View" onClick={() => handleViewProfile(user)}><Eye size={14} /></button>
                      <button className={styles["btn-icon"]} title="Edit" onClick={() => handleEditUser(user)}><Edit size={14} /></button>
                      <button className={`${styles["btn-icon"]} ${styles["btn-icon-danger"]}`} title="Delete" onClick={() => handleDeleteUser(user.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        )}
        </div>
      </main>

      {/* --- MODAL 1: VIEW PROFILE (DOSSIER STYLE - GIỮ NGUYÊN) --- */}
      {isProfileModalOpen && viewUser && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["dossier-modal"]}>
            <div className={styles["dossier-header"]}>
              <span className={styles["dossier-title"]}>
                 <FileCode size={18} /> DOSSIER: #{viewUser.id.toString().padStart(4, '0')}
              </span>
              <button className={styles["modal-close"]} onClick={() => setIsProfileModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div className={styles["dossier-body"]}>
              <div className={styles["dossier-left"]}>
                  <div className={styles["dossier-avatar-frame"]}>
                    <img src={viewUser.avatar} alt="Profile" className={styles["dossier-avatar"]} />
                  </div>
                  <div className={styles["profile-username"]}>{viewUser.username}</div>
                  <div className={`${styles["dossier-role-stamp"]} ${viewUser.role==='ADMIN'?styles["stamp-admin"]:styles["stamp-user"]}`}>
                      {viewUser.role}
                  </div>
              </div>

              <div className={styles["dossier-right"]}>
                  <div className={styles["dossier-section"]}>
                      <div className={styles["dossier-section-title"]}>IDENTITY</div>
                      <div className={styles["dossier-grid"]}>
                          <div className={styles["dossier-field"]}><span className={styles["dossier-label"]}>FULL NAME</span><span className={styles["dossier-value"]}>{viewUser.fullName}</span></div>
                          <div className={styles["dossier-field"]}><span className={styles["dossier-label"]}>DATE OF BIRTH</span><span className={styles["dossier-value"]}>{viewUser.dob}</span></div>
                          <div className={styles["dossier-field"]}><span className={styles["dossier-label"]}>BIO</span><span className={styles["dossier-value"]} style={{fontSize:'12px', fontStyle:'italic'}}>{viewUser.bio || "No biography data."}</span></div>
                      </div>
                  </div>
                  <div className={styles["dossier-section"]}>
                      <div className={styles["dossier-section-title"]}>CONTACT & LOCATION</div>
                      <div className={styles["dossier-grid"]}>
                          <div className={styles["dossier-field"]}><span className={styles["dossier-label"]}>EMAIL</span><span className={styles["dossier-value"]}>{viewUser.email}</span></div>
                          <div className={styles["dossier-field"]}><span className={styles["dossier-label"]}>PHONE</span><span className={styles["dossier-value"]}>{viewUser.phoneNumber || "N/A"}</span></div>
                          <div className={styles["dossier-field"]}><span className={styles["dossier-label"]}>ADDRESS</span><span className={styles["dossier-value"]}>{viewUser.address}</span></div>
                      </div>
                  </div>
              </div>
            </div>

            <div className={styles["dossier-footer"]}>
              <button 
                className={`${styles["btn-modal"]} ${styles["btn-save"]}`} 
                onClick={() => { setIsProfileModalOpen(false); handleEditUser(viewUser); }}
              >
                <Edit size={14} style={{marginRight: 5}}/> EDIT RECORD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: EDIT / CREATE (FULL FIELDS & PASSWORD) --- */}
      {isModalOpen && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal"]} style={{width: '600px'}}>
            <div className={styles["modal-header"]}>
              <span className={styles["modal-title"]}>
                {isEditMode ? "EDIT USER DATA" : "CREATE NEW IDENTITY"}
              </span>
              <button className={styles["modal-close"]} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles["modal-body"]}>
              {/* Row 1: Username & Full Name */}
              <div className="grid grid-cols-2 gap-4">
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>USERNAME</label>
                    <input 
                        type="text" 
                        className={styles["form-input"]} 
                        value={currentUser.username || ''} 
                        onChange={(e) => handleInputChange('username', e.target.value)}
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>FULL NAME</label>
                    <input 
                        type="text" 
                        className={styles["form-input"]} 
                        value={currentUser.fullName || ''} 
                        onChange={(e) => handleInputChange('fullName', e.target.value)}
                    />
                  </div>
              </div>
              
              {/* Row 2: Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>EMAIL</label>
                    <input 
                        type="email" 
                        className={styles["form-input"]} 
                        value={currentUser.email || ''} 
                        onChange={(e) => handleInputChange('email', e.target.value)}
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>PHONE NUMBER</label>
                    <input 
                        type="text" 
                        className={styles["form-input"]} 
                        value={currentUser.phoneNumber || ''} 
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                    />
                  </div>
              </div>

              {/* Row 3: DOB & Role */}
              <div className="grid grid-cols-2 gap-4">
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>DATE OF BIRTH</label>
                    <input 
                        type="date" 
                        className={styles["form-input"]} 
                        value={currentUser.dob || ''} 
                        onChange={(e) => handleInputChange('dob', e.target.value)}
                    />
                  </div>
                  <div className={styles["form-group"]}>
                    <label className={styles["form-label"]}>ROLE</label>
                    <select 
                        className={styles["form-select"]} 
                        value={currentUser.role || 'USER'} 
                        onChange={(e) => handleInputChange('role', e.target.value as any)}
                    >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
              </div>

              {/* Row 4: Address */}
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>ADDRESS</label>
                <input 
                    type="text" 
                    className={styles["form-input"]} 
                    value={currentUser.address || ''} 
                    onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>

              {/* Row 5: Bio (Textarea) */}
              <div className={styles["form-group"]}>
                <label className={styles["form-label"]}>BIOGRAPHY</label>
                <textarea 
                    className={styles["form-input"]} 
                    style={{minHeight: '60px', resize: 'vertical'}}
                    value={currentUser.bio || ''} 
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                ></textarea>
              </div>

              {/* Row 6: Password */}
              <div className={styles["form-group"]}>
                    <label className={styles["form-label"]} style={{color: '#fff', display:'flex', alignItems:'center', gap:'5px'}}>
                      <Key size={12} /> 
                      {isEditMode ? "NEW PASSWORD (OPTIONAL)" : "INITIAL PASSWORD"}
                    </label>
                    <input 
                      type="password" 
                      className={styles["form-input"]} 
                      placeholder={isEditMode ? "Leave empty to keep..." : "Required..."}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
              </div>

            </div>

            <div className={styles["modal-footer"]}>
              <button className={`${styles["btn-modal"]} ${styles["btn-cancel"]}`} onClick={() => setIsModalOpen(false)}>CANCEL</button>
              <button className={`${styles["btn-modal"]} ${styles["btn-save"]}`} onClick={handleSave}><Save size={14} style={{marginRight: 5}}/> SAVE CHANGES</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}