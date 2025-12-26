import apiClient from './api-client';

// ApiResponse type từ backend
interface ApiResponse<T> {
  code?: string | number;
  message?: string;
  data?: T;
  result?: T; // Một số endpoint có thể dùng result thay vì data
}

// ==================== Type Definitions ====================

export interface UserDTO {
  id: number;
  username: string;
  email: string;
  fullName?: string | null;
  phoneNumber?: string | null;
  dateOfBirth?: string | null; // ISO date string (LocalDate)
  avatarUrl?: string | null;
  bio?: string | null;
  address?: string | null;
  role: string; // "ADMIN" | "USER"
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
}

export interface DictionaryDTO {
  id: number;
  word: string;
  definition?: string;
  videoUrl: string;
  elasticSynced?: boolean;
}

export interface ContributionDTO {
  id: number;
  userId: number;
  username: string;
  stagingData: string; // JSON string containing {word, definition, videoUrl}
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string; // ISO date-time string
  updatedAt: string; // ISO date-time string
}

export interface DashboardStatsDTO {
  totalUsers: number;
  totalWords: number;
  pendingContributions: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  fullName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  address?: string;
  bio?: string;
}

export interface RoleUpdateRequest {
  role: string;
}

export interface AdminPasswordResetRequest {
  newPassword: string;
}

// ==================== Admin API Client ====================

export const adminApi = {
  // ==================== Dashboard Stats ====================
  
  /**
   * GET /api/admin/stats
   * Lấy thống kê dashboard (tổng users, words, pending contributions)
   */
  getStats: async (): Promise<DashboardStatsDTO> => {
    try {
      const response = await apiClient.get<ApiResponse<DashboardStatsDTO>>('/admin/stats');
      return response.data.data ?? {
        totalUsers: 0,
        totalWords: 0,
        pendingContributions: 0
      };
    } catch (error: any) {
      console.error('[Admin API] Error getting stats:', error.response?.data || error.message);
      throw error;
    }
  },

  // ==================== User Management ====================

  /**
   * GET /api/admin/users?page=0&size=20
   * Lấy danh sách users có phân trang
   */
  getUsers: async (page: number = 0, size: number = 20): Promise<PageResponse<UserDTO>> => {
    try {
      const response = await apiClient.get<ApiResponse<PageResponse<UserDTO>>>('/admin/users', {
        params: { page, size }
      });
      return response.data.data ?? {
        content: [],
        totalElements: 0,
        totalPages: 0,
        size: size,
        number: page,
        first: true,
        last: true
      };
    } catch (error: any) {
      console.error('[Admin API] Error getting users:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * POST /api/admin/users
   * Tạo user mới (admin action)
   */
  createUser: async (userData: RegisterRequest): Promise<UserDTO> => {
    try {
      const response = await apiClient.post<ApiResponse<UserDTO>>('/admin/users', userData);
      if (!response.data.data) {
        throw new Error("Failed to create user: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error creating user:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * PUT /api/admin/users/{userId}
   * Cập nhật thông tin user (info, role, status)
   */
  updateUser: async (userId: number, userData: Partial<UserDTO>): Promise<UserDTO> => {
    try {
      const response = await apiClient.put<ApiResponse<UserDTO>>(`/admin/users/${userId}`, userData);
      if (!response.data.data) {
        throw new Error("Failed to update user: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error updating user:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * PUT /api/admin/users/{userId}/role
   * Thay đổi role của user
   */
  updateUserRole: async (userId: number, role: string): Promise<UserDTO> => {
    try {
      const response = await apiClient.put<ApiResponse<UserDTO>>(`/admin/users/${userId}/role`, { role });
      if (!response.data.data) {
        throw new Error("Failed to update user role: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error updating user role:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * PUT /api/admin/users/{userId}/reset-password
   * Reset password của user (không cần old password)
   */
  resetUserPassword: async (userId: number, newPassword: string): Promise<void> => {
    try {
      await apiClient.put<ApiResponse<string>>(`/admin/users/${userId}/reset-password`, {
        newPassword
      });
    } catch (error: any) {
      console.error('[Admin API] Error resetting password:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * DELETE /api/admin/users/{userId}
   * Xóa user (không thể xóa chính mình)
   */
  deleteUser: async (userId: number): Promise<void> => {
    try {
      await apiClient.delete<ApiResponse<string>>(`/admin/users/${userId}`);
    } catch (error: any) {
      console.error('[Admin API] Error deleting user:', error.response?.data || error.message);
      throw error;
    }
  },

  // ==================== Contribution Management ====================

  /**
   * GET /api/admin/contributions?status=PENDING
   * Lấy danh sách contributions theo status (PENDING, APPROVED, REJECTED)
   */
  getContributions: async (status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING"): Promise<ContributionDTO[]> => {
    try {
      const response = await apiClient.get<ApiResponse<ContributionDTO[]>>('/admin/contributions', {
        params: { status }
      });
      return response.data.data ?? [];
    } catch (error: any) {
      console.error('[Admin API] Error getting contributions:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * GET /api/admin/contributions/{id}
   * Lấy chi tiết một contribution
   */
  getContributionById: async (id: number): Promise<ContributionDTO> => {
    try {
      const response = await apiClient.get<ApiResponse<ContributionDTO>>(`/admin/contributions/${id}`);
      if (!response.data.data) {
        throw new Error("Failed to get contribution: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error getting contribution:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * POST /api/admin/contributions/{id}/approve
   * Approve contribution và chuyển vào dictionary
   */
  approveContribution: async (id: number): Promise<DictionaryDTO> => {
    try {
      const response = await apiClient.post<ApiResponse<DictionaryDTO>>(`/admin/contributions/${id}/approve`);
      if (!response.data.data) {
        throw new Error("Failed to approve contribution: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error approving contribution:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * POST /api/admin/contributions/{id}/reject
   * Reject contribution
   */
  rejectContribution: async (id: number): Promise<void> => {
    try {
      await apiClient.post<ApiResponse<string>>(`/admin/contributions/${id}/reject`);
    } catch (error: any) {
      console.error('[Admin API] Error rejecting contribution:', error.response?.data || error.message);
      throw error;
    }
  },

  // ==================== Dictionary Management ====================

  /**
   * GET /api/dictionary/list
   * Lấy tất cả dictionary entries (ADMIN only)
   */
  getAllDictionary: async (): Promise<DictionaryDTO[]> => {
    try {
      const response = await apiClient.get<ApiResponse<DictionaryDTO[]>>('/dictionary/list');
      return response.data.data ?? [];
    } catch (error: any) {
      console.error('[Admin API] Error getting all dictionary:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * GET /api/dictionary/search?query=...
   * Tìm kiếm dictionary entries
   */
  searchDictionary: async (query: string): Promise<DictionaryDTO[]> => {
    try {
      const response = await apiClient.get<ApiResponse<DictionaryDTO[]>>('/dictionary/search', {
        params: { query: query.trim() }
      });
      return response.data.data ?? [];
    } catch (error: any) {
      console.error('[Admin API] Error searching dictionary:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * GET /api/dictionary/{id}
   * Lấy chi tiết một dictionary entry
   */
  getDictionaryById: async (id: number): Promise<DictionaryDTO> => {
    try {
      const response = await apiClient.get<ApiResponse<DictionaryDTO>>(`/dictionary/${id}`);
      if (!response.data.data) {
        throw new Error("Failed to get dictionary entry: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error getting dictionary entry:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * POST /api/dictionary
   * Tạo dictionary entry mới (ADMIN only)
   * videoUrl là optional - có thể để trống nếu không có video
   */
  createDictionary: async (dictionaryData: { word: string; definition?: string; videoUrl?: string }): Promise<DictionaryDTO> => {
    try {
      const response = await apiClient.post<ApiResponse<DictionaryDTO>>('/dictionary', dictionaryData);
      if (!response.data.data) {
        throw new Error("Failed to create dictionary entry: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error creating dictionary entry:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * PUT /api/admin/dictionary/{id}
   * Cập nhật dictionary entry (ADMIN only)
   */
  updateDictionary: async (id: number, dictionaryData: Partial<DictionaryDTO>): Promise<DictionaryDTO> => {
    try {
      const response = await apiClient.put<ApiResponse<DictionaryDTO>>(`/admin/dictionary/${id}`, dictionaryData);
      if (!response.data.data) {
        throw new Error("Failed to update dictionary entry: no data returned");
      }
      return response.data.data;
    } catch (error: any) {
      console.error('[Admin API] Error updating dictionary entry:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * DELETE /api/admin/dictionary/{id}
   * Xóa dictionary entry (ADMIN only)
   */
  deleteDictionary: async (id: number): Promise<void> => {
    try {
      await apiClient.delete<ApiResponse<string>>(`/admin/dictionary/${id}`);
    } catch (error: any) {
      console.error('[Admin API] Error deleting dictionary entry:', error.response?.data || error.message);
      throw error;
    }
  },
};

