import axios from "axios";
import { GestureRecognitionRequest, GestureRecognitionResponse } from '@/types/api';

// 1. Định nghĩa URL Backend (VSL Platform Backend chạy trên port 8081)
// - Local development: http://localhost:8081/api
// - Docker: http://host.docker.internal:8081/api (frontend inside container)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api";

// Type định nghĩa response structure
interface ApiResponse<T> {
  code?: string | number;
  message?: string;
  data?: T;
  result?: T;
}

// 2. Tạo instance axios với cấu hình chuẩn
const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 60000,
});

// 3. Request Interceptor: Tự động gắn Token vào header nếu có
apiClient.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      try {
        const token = localStorage.getItem("token");
        if (token && config.headers) {
          (config.headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
        }
      } catch (err) {
        console.warn("Lỗi đọc token từ localStorage", err);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 4. Response Interceptor: Xử lý lỗi 401 (Hết phiên đăng nhập)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401 && typeof window !== "undefined") {
      console.warn("Phiên đăng nhập hết hạn, chuyển hướng về trang login...");
      // Uncomment dòng dưới để tự động redirect khi token hết hạn
      // window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// 5. Object API dùng cho tính năng Nhận diện (Gesture Recognition)
export const recognitionApi = {
  predictGesture: async (data: GestureRecognitionRequest & { currentText?: string }) => {
    try {
      console.log("[API] POST /vsl/predict with", data.frames.length, "frames");
      // Transform format: Landmark[][] to HandFrameDTO[] {landmarks: Landmark[]}
      const formattedFrames = data.frames.map(landmarks => ({
        landmarks: landmarks
      }));
      
      // Pass currentText for accent restoration context
      const payload = {
        frames: formattedFrames,
        currentText: data.currentText || ""  // Accumulated text for context
      };
      
      console.log("[API] Sending payload with context:", { frameCount: formattedFrames.length, contextLength: payload.currentText.length });
      
      const response = await apiClient.post<ApiResponse<string>>('/vsl/predict', payload);
      
      console.log("[API] Response:", response.data);
      
      // Backend returns: {code, message, data: "Vietnamese text"}
      // Extract the Vietnamese text from response.data
      const vietnameseText = response.data?.data || response.data?.result || "Không nhận diện được";
      
      // For backward compatibility with UI expecting confidence field
      // We don't have real confidence, so return a simple response
      return {
        predictedWord: vietnameseText,
        confidence: 0.85  // Mock confidence (actual confidence comes from Python service internally)
      };
    } catch (error: any) {
      console.error("[API] Error recognizing gesture:", error.response?.data || error.message);
      throw error;
    }
  },

  // New API: Fix diacritics for complete text (user-triggered, not auto)
  fixDiacritics: async (rawText: string): Promise<string> => {
    try {
      if (!rawText || rawText.trim().length === 0) {
        return rawText;
      }
      
      console.log("[API] POST /vsl/fix-diacritics with text:", rawText);
      const response = await apiClient.post<ApiResponse<string>>('/vsl/fix-diacritics', {
        text: rawText
      });
      
      console.log("[API] Fix diacritics response:", response.data);
      console.log("[API] Full response object:", JSON.stringify(response.data, null, 2));
      
      // Backend returns: {code, message, data: "fixed Vietnamese text"}
      const fixedText = response.data?.data || response.data?.result || rawText;
      
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'api-client.ts:fixDiacritics',message:'API response received',data:{rawText:rawText,fixedText:fixedText,responseCode:response.data?.code,hasData:!!response.data?.data,responseData:response.data?.data,fullResponse:JSON.stringify(response.data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion agent log
      
      console.log("[API] Extracted fixedText:", fixedText, "| Original:", rawText, "| Are they equal?", fixedText === rawText);
      
      return fixedText;
    } catch (error: any) {
      const status = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message;
      
      console.error("[API] Error fixing diacritics:", {
        status,
        message: errorMessage,
        fullError: error.response?.data || error.message
      });
      
      // Provide specific error messages based on status code
      if (status === 502) {
        console.warn("[API] Bad Gateway (502): Python AI service may be offline. Please check if the AI service is running on port 5000.");
      } else if (status === 503) {
        console.warn("[API] Service Unavailable (503): AI service is temporarily unavailable.");
      } else if (status === 400) {
        console.warn("[API] Bad Request (400): Invalid input sent to API.");
      }
      
      // Fallback: return original text if API fails
      // This allows the UI to continue working even if diacritics fixing fails
      return rawText;
    }
  }
};

export default apiClient;