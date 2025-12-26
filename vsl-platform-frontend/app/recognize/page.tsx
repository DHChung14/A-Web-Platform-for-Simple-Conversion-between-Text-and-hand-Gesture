"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useHandTracking } from "@/hooks/useHandTracking";
import styles from "../../styles/recognize.module.css";
import { recognitionApi } from "@/lib/api-client"; // Import API

// CẤU HÌNH NHẬN DIỆN
const RECOGNITION_BATCH_SIZE = 20; // Số frame cần để model AI hiểu (khớp với lúc train model)
const CONFIDENCE_THRESHOLD = 0.70; // Chỉ hiện kết quả nếu độ tin cậy > 70%
const HOLD_REQUIRED_BATCHES = 2; // Cần hold 2 batches (3s) = giữ gesture 2 lần liên tiếp để add character

export default function GestureRecognitionPage() {
  // 1. Hook MediaPipe
  const {
    videoRef,
    canvasRef,
    currentBatch,
    setFrameBatch,
    startCapture,
    stopCapture,
    isCapturing,
    isReady
  } = useHandTracking();

  // 2. State quản lý kết quả
  const [currentResult, setCurrentResult] = useState("Waiting...");
  const [confidence, setConfidence] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [historyLog, setHistoryLog] = useState<string[]>([]); // Lưu lịch sử nhận diện
  const [outputText, setOutputText] = useState(""); // Lưu văn bản đầu ra để user có thể xóa
  const [fixedText, setFixedText] = useState(""); // Kết quả sau khi fix diacritics
  const [isFixingText, setIsFixingText] = useState(false); // Flag để track khi đang fix text
  
  // Ref để debounce fix text
  const fixTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State cho hold logic (ngăn duplicate character)
  const lastPredictionRef = useRef<string | null>(null);
  const holdCountRef = useRef(0);
  const gestureChangedRef = useRef(false); // Flag để track khi gesture mới thay đổi

  // State thống kê (cho đẹp giao diện)
  const [totalGestures, setTotalGestures] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  // --- LOGIC 1: Tự động bật camera khi vào trang ---
  useEffect(() => {
    if (isReady) {
      startCapture();
    }
    return () => stopCapture();
  }, [isReady, startCapture, stopCapture]);

  // --- LOGIC 2: Gửi dữ liệu lên AI Model ---
  useEffect(() => {
    const processBatch = async () => {
      // Điều kiện kích hoạt: Đủ frame VÀ không đang bận xử lý VÀ đang bật camera
      if (currentBatch.length >= RECOGNITION_BATCH_SIZE && !isProcessing && isCapturing) {
        setIsProcessing(true); // Khóa lại để không gửi trùng

        try {
          // Chuẩn bị dữ liệu: Chuyển đổi từ HandFrame[] sang Landmark[][]
          // Backend cần mảng 2 chiều: [Frame1[21 points], Frame2[21 points]...]
          const framesPayload = currentBatch.map(frame => frame.landmarks);

          console.log(`[Recognition] Sending ${framesPayload.length} frames to backend...`);

          // Gọi API
          const response = await recognitionApi.predictGesture({ 
            frames: framesPayload,
            currentText: outputText  // Pass accumulated text for accent restoration context
          });

          console.log(`[Recognition] Backend response:`, response);

          // Xử lý kết quả trả về
          if (response && response.predictedWord) {
            const letter = response.predictedWord.toUpperCase();
            const conf = response.confidence || 0.85;
            
            setCurrentResult(letter);
            setConfidence(conf);
            setTotalGestures(prev => prev + 1);
            
            // === HOLD LOGIC: Ngăn duplicate character ===
            if (conf >= CONFIDENCE_THRESHOLD) {
              if (letter === lastPredictionRef.current && !gestureChangedRef.current) {
                // Cùng gesture như lần trước (và gesture không vừa thay đổi)
                holdCountRef.current++;
                console.log(`[HOLD] ${letter} (${holdCountRef.current}/${HOLD_REQUIRED_BATCHES})`);
                
                if (holdCountRef.current >= HOLD_REQUIRED_BATCHES) {
                  // Đã giữ đủ lâu → thêm character
                  const newText = outputText + letter;
                  setOutputText(newText);
                  console.log(`[✓ ADDED] Character '${letter}' after holding ${HOLD_REQUIRED_BATCHES} batches`);
                  setHistoryLog(prev => [`[${new Date().toLocaleTimeString()}] ✓ ADDED: ${letter}`, ...prev.slice(0, 9)]);
                  
                  // #region agent log
                  fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recognize/page.tsx:processBatch',message:'Character added, outputText will trigger auto-fix via useEffect',data:{newText:newText,letter:letter},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                  // #endregion agent log
                  
                  // useEffect sẽ tự động gọi autoFixDiacritics khi outputText thay đổi
                  
                  // Reset hold state HOÀN TOÀN
                  lastPredictionRef.current = null;
                  holdCountRef.current = 0;
                  gestureChangedRef.current = false;
                }
              } else if (letter === lastPredictionRef.current && gestureChangedRef.current) {
                // Cùng gesture lần thứ 2 liên tiếp → clear flag và bắt đầu increment
                gestureChangedRef.current = false;
                holdCountRef.current++;
                console.log(`[HOLD] ${letter} (${holdCountRef.current}/${HOLD_REQUIRED_BATCHES}) - flag cleared`);
              } else if (letter !== lastPredictionRef.current) {
                // Gesture thay đổi → reset counter
                if (lastPredictionRef.current) {
                  console.log(`[RESET] Gesture changed from '${lastPredictionRef.current}' to '${letter}'`);
                }
                lastPredictionRef.current = letter;
                holdCountRef.current = 1;
                gestureChangedRef.current = true; // ← Mark gesture change
              }
              // Nếu cùng gesture nhưng gesture vừa thay đổi → skip (chờ batch tiếp theo)
            }
            
            // Thêm vào log bên phải
            setHistoryLog(prev => [`[${new Date().toLocaleTimeString()}] DETECTED: ${letter} (${(conf * 100).toFixed(0)}%)`, ...prev.slice(0, 9)]);
          } else {
             console.warn("[Recognition] No result from backend");
             setCurrentResult("...");
             lastPredictionRef.current = null;
             holdCountRef.current = 0;
             gestureChangedRef.current = false;
          }

        } catch (error: any) {
          console.error("AI Error:", error);
          const errorMsg = error?.response?.status === 401 
            ? "⚠️ UNAUTHORIZED" 
            : error?.response?.status === 503
            ? "⚠️ AI Service Down"
            : "ERR";
          setCurrentResult(errorMsg);
          setHistoryLog(prev => [`[${new Date().toLocaleTimeString()}] ERROR: ${error?.message || 'Unknown error'}`, ...prev.slice(0, 9)]);
        } finally {
          // Quan trọng: Reset batch và mở khóa để nhận diện tiếp
          setFrameBatch([]); 
          setIsProcessing(false);
        }
      }
    };

    processBatch();
  }, [currentBatch, isProcessing, isCapturing, setFrameBatch]);

  // --- LOGIC 3: Đồng hồ đếm giờ ---
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isCapturing) {
      timer = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isCapturing]);

  // Format thời gian
  const formatTime = (s: number) => new Date(s * 1000).toISOString().substr(14, 5);

  // State để lưu thông báo lỗi
  const [fixError, setFixError] = useState<string | null>(null);

  // Hàm tự động gọi model 2 để fix diacritics với debounce
  const autoFixDiacritics = useCallback((text: string) => {
    // Xóa timeout cũ nếu có (debounce)
    if (fixTextTimeoutRef.current) {
      clearTimeout(fixTextTimeoutRef.current);
    }
    
    // Chỉ fix nếu có text
    if (!text || text.trim().length === 0) {
      setFixedText("");
      setFixError(null);
      return;
    }
    
    // Debounce: chờ 500ms sau khi text thay đổi để tránh gọi quá nhiều lần
    fixTextTimeoutRef.current = setTimeout(async () => {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recognize/page.tsx:autoFixDiacritics',message:'Starting auto-fix diacritics',data:{text:text,length:text.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion agent log
      
      setIsFixingText(true);
      setFixError(null); // Clear previous error
      try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recognize/page.tsx:autoFixDiacritics',message:'Before API call',data:{text:text,textLength:text.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B1'})}).catch(()=>{});
        // #endregion agent log
        
        const fixed = await recognitionApi.fixDiacritics(text);
        
        // Kiểm tra nếu fixed text giống với original (có thể là do API fail và return original)
        if (fixed === text) {
          // Có thể API đã fail và return original text, nhưng không có error
          // Trong trường hợp này, chúng ta vẫn hiển thị text gốc
          setFixedText(text);
          setFixError(null);
        } else {
          // Format lại: capitalize từng từ để giữ format đẹp (vì API trả về lowercase)
          const formattedFixed = fixed && fixed.length > 0 
            ? fixed.split(' ').map(word => 
                word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
              ).join(' ')
            : fixed;
          
          setFixedText(formattedFixed);
          setFixError(null);
          console.log(`[AUTO-FIX] "${text}" → "${fixed}" → "${formattedFixed}"`);
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recognize/page.tsx:autoFixDiacritics',message:'Auto-fix diacritics successful',data:{original:text,fixed:fixed,isDifferent:fixed!==text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion agent log
      } catch (error: any) {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/fac30a44-515e-493f-a148-2c304048b02d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'recognize/page.tsx:autoFixDiacritics',message:'Auto-fix diacritics failed',data:{error:error.message,text:text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion agent log
        
        const status = error.response?.status;
        let errorMsg = "Cannot connect to AI service";
        
        if (status === 502) {
          errorMsg = "Error: Python AI service is unavailable. Please check if the service is running on port 5000.";
        } else if (status === 503) {
          errorMsg = "AI service is temporarily unavailable";
        } else if (status === 400) {
          errorMsg = "Invalid data";
        }
        
        console.error("[AUTO-FIX] Error:", error);
        setFixError(errorMsg);
        // Hiển thị text gốc nếu lỗi
        setFixedText(text);
      } finally {
        setIsFixingText(false);
      }
    }, 500); // Debounce 500ms
  }, []);
  
  // Effect để tự động fix text khi outputText thay đổi (trường hợp khác như DELETE, CLEAR ALL)
  useEffect(() => {
    if (outputText.length > 0) {
      autoFixDiacritics(outputText);
    } else {
      setFixedText("");
      setFixError(null);
    }
    
    // Cleanup timeout khi component unmount hoặc outputText thay đổi
    return () => {
      if (fixTextTimeoutRef.current) {
        clearTimeout(fixTextTimeoutRef.current);
      }
    };
  }, [outputText, autoFixDiacritics]);

  // --- LOGIC 4: Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Chỉ xử lý khi không đang focus vào input/textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space key → add space
      if (e.code === 'Space' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOutputText(prev => prev + " ");
        console.log(`[SPACE] Added space via keyboard`);
      }
      // 'x' key → delete last character
      else if (e.key.toLowerCase() === 'x' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOutputText(prev => {
          if (prev.length > 0) {
            const newText = prev.slice(0, -1);
            console.log(`[DELETE] Removed last char via keyboard. Remaining: "${newText}"`);
            return newText;
          }
          return prev;
        });
      }
      // 'c' key → clear all text
      else if (e.key.toLowerCase() === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setOutputText(prev => {
          if (prev.length > 0) {
            console.log("[CLEAR] All text cleared via keyboard");
            setFixedText("");
            setFixError(null);
            return "";
          }
          return prev;
        });
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className={styles.container}>
      {/* --- HUD HEADER --- */}
      <div className={styles["hud-header"]}>
        <div className={styles["logo-area"]}>
          <i className="fas fa-eye"></i> VSL SYSTEM <span style={{ fontSize: "12px", opacity: 0.7 }}>AI-CORE</span>
        </div>
        <div className={styles["system-status"]}>
          <div className={styles["status-item"]}>
            <div className={`${styles["status-dot"]} ${isCapturing ? styles.blink : ''}`} 
                 style={{background: isCapturing ? '#00ff41' : 'red'}}></div>
            <span>CAMERA: {isCapturing ? "ONLINE" : "OFFLINE"}</span>
          </div>
          <div className={styles["status-item"]}>
             {/* Đèn vàng khi đang xử lý AI */}
            <div className={styles["status-dot"]} 
                 style={{background: isProcessing ? 'yellow' : '#004d00'}}></div>
            <span>AI STATUS: {isProcessing ? "ANALYZING..." : "READY"}</span>
          </div>
          <div className={styles["status-item"]}>
            <span>TIME: {formatTime(elapsedTime)}</span>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className={styles["main-content"]}>
        
        {/* VIDEO CONTAINER */}
        <div className={styles["video-container"]}>
          <div className={styles["overlay-grid"]}></div>
          <div className={styles["scan-line"]}></div>

          <div className={styles["video-feed"]}>
             <video ref={videoRef} className={styles["input-video"]} autoPlay playsInline muted />
             <canvas ref={canvasRef} className={styles["output-canvas"]} />
          </div>
          
          {/* KẾT QUẢ HIỆN TO GIỮA MÀN HÌNH - SMOOTH ANIMATION */}
          <div className={styles["result-display"]}>
              <div className={styles["result-text"]} 
                   style={{
                     opacity: currentResult && currentResult !== "Waiting..." ? 1 : 0.3,
                     transition: 'all 0.3s ease-in-out',
                     transform: currentResult && currentResult !== "Waiting..." ? 'scale(1)' : 'scale(0.9)',
                     textShadow: '0 0 20px rgba(0, 255, 0, 0.8)'
                   }}>
                {currentResult}
              </div>
              <div className={styles["result-confidence"]} 
                   style={{ 
                     color: confidence > 0.8 ? 'var(--neon-green)' : confidence > 0.6 ? '#ffaa00' : '#ff6666',
                     opacity: currentResult && currentResult !== "Waiting..." ? 1 : 0.3,
                     transition: 'all 0.3s ease-in-out'
                   }}>
                CONFIDENCE: {(confidence * 100).toFixed(1)}%
              </div>
          </div>

          <div className={styles["info-panel"]}>
            <div className={styles["info-title"]}>⏱️ HOLD TIME</div>
            
            {/* === HOLD TIME STATUS - MINIMAL === */}
            <div>
              <div style={{ fontSize: '12px', marginBottom: '8px', color: '#00ff00' }}>
                {lastPredictionRef.current 
                  ? `${lastPredictionRef.current} (${holdCountRef.current}/${HOLD_REQUIRED_BATCHES})`
                  : "waiting..."}
              </div>
              <div style={{
                  width: '100%', height: '8px', background: '#1a3a1a', 
                  position: 'relative', borderRadius: '4px', overflow: 'hidden'
              }}>
                  <div style={{
                      width: `${(holdCountRef.current / HOLD_REQUIRED_BATCHES) * 100}%`,
                      height: '100%', background: holdCountRef.current >= HOLD_REQUIRED_BATCHES ? '#ffaa00' : '#0088ff',
                      transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 0 8px rgba(0, 136, 255, 0.8)'
                  }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* SIDEBAR LOGS */}
        <div className={styles["terminal-sidebar"]}>
          <div className={styles["terminal-header"]}>
            {">"} TEXT PANEL
          </div>
          <div className={styles["terminal-content"]}>
            {/* === RAW TEXT === */}
            <div style={{ marginBottom: '15px' }}>
              <div style={{ color: '#ffaa00', fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
                📝 RAW (no diacritics):
              </div>
              <div style={{
                  background: '#0a2a0a',
                  border: '1px solid #ffaa00',
                  padding: '8px',
                  borderRadius: '3px',
                  fontFamily: "'Roboto', 'DejaVu Sans', 'Ubuntu', 'Arial', 'Liberation Sans', sans-serif",
                  fontSize: '12px',
                  color: '#ffaa00',
                  wordBreak: 'break-word',
                  maxHeight: '60px',
                  overflowY: 'auto',
                  minHeight: '35px'
              }}>
                {outputText || '(empty)'}
              </div>
            </div>

            {/* === FIXED TEXT === */}
            <div style={{ marginBottom: '15px', borderTop: '1px dashed #00aa00', paddingTop: '10px' }}>
              <div style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
                ✓ FIXED (with diacritics):
              </div>
              <div style={{
                  background: '#0a2a0a',
                  border: fixError ? '1px solid #ff3333' : '1px solid #00ff00',
                  padding: '8px',
                  borderRadius: '3px',
                  fontFamily: "'Roboto', 'DejaVu Sans', 'Ubuntu', 'Arial', 'Liberation Sans', sans-serif",
                  fontSize: '12px',
                  color: isFixingText ? '#ffaa00' : (fixError ? '#ff6666' : '#00ff00'),
                  wordBreak: 'break-word',
                  maxHeight: '60px',
                  overflowY: 'auto',
                  minHeight: '35px'
              }}>
                {isFixingText ? '⏳ Fixing...' : (fixError ? `⚠️ ${fixError}` : (fixedText || '(auto-fix after adding character)'))}
              </div>
            </div>

            {/* === DETECTION LOG === */}
            <div style={{ borderTop: '1px dashed #00aa00', paddingTop: '10px' }}>
              <div style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '11px', marginBottom: '6px' }}>
                📋 LOG:
              </div>
              {historyLog.map((log, i) => (
                  <div key={i} className={`${styles["log-entry"]} ${i===0 ? styles["log-entry-active"] : ""}`} 
                       style={{ fontSize: '11px', lineHeight: '1.3' }}>
                      {log}
                  </div>
              ))}
            </div>

            <div style={{marginTop: '15px', borderTop: '1px dashed #004d00', paddingTop: '10px', fontSize: '11px'}}>
                <strong>&gt; STATS</strong><br/>
                Total: {totalGestures}<br/>
                Status: {isCapturing ? '🟢 OK' : '⚪ Ready'}
            </div>

            {/* === INSTRUCTIONS === */}
            <div style={{marginTop: '15px', borderTop: '1px dashed #004d00', paddingTop: '10px'}}>
              <div style={{ color: '#00ff00', fontWeight: 'bold', fontSize: '11px', marginBottom: '8px' }}>
                📖 INSTRUCTIONS:
              </div>
              <div style={{
                  background: '#0a2a0a',
                  border: '1px solid #00aa00',
                  padding: '10px',
                  borderRadius: '3px',
                  fontSize: '10px',
                  lineHeight: '1.6',
                  color: '#aaffaa'
              }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#00ff00' }}>⌨️ SHORTCUTS:</strong>
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#ffaa00' }}>Space</span> - Add space
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '4px' }}>
                  <span style={{ color: '#ffaa00' }}>X</span> - Delete last character
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '8px' }}>
                  <span style={{ color: '#ffaa00' }}>C</span> - Clear all text
                </div>
                
                <div style={{ marginTop: '8px', marginBottom: '6px', borderTop: '1px dashed #004d00', paddingTop: '6px' }}>
                  <strong style={{ color: '#00ff00' }}>🎯 HOW TO USE:</strong>
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '4px' }}>
                  • Hold gesture 2 times consecutively to add character
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '4px' }}>
                  • Text automatically fixes diacritics after adding character
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '4px' }}>
                  • View RAW (no diacritics) and FIXED (with diacritics) in side panel
                </div>
                <div style={{ marginLeft: '8px', marginBottom: '0px' }}>
                  • Press <span style={{ color: '#ffaa00' }}>RESET</span> to reset state
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER CONTROLS */}
      <div className={styles["control-panel"]}>
        <div style={{ flex: 1, display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" className={styles["tactical-btn"]}>
            <i className="fas fa-arrow-left"></i> EXIT
          </Link>
          <button className={styles["tactical-btn"]} onClick={() => {
              setCurrentResult("Waiting...");
              setTotalGestures(0);
              setHistoryLog([]);
              setFrameBatch([]);
          }}>
            <i className="fas fa-sync"></i> RESET
          </button>
        </div>
      </div>

      {/* OUTPUT TEXT DISPLAY */}
      <div style={{
        position: 'fixed',
        bottom: '100px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(20, 40, 20, 0.95)',
        border: '2px solid #00ff00',
        padding: '15px 25px',
        borderRadius: '5px',
        fontSize: '18px',
        fontFamily: "'Roboto', 'DejaVu Sans', 'Ubuntu', 'Arial', 'Liberation Sans', sans-serif",
        color: '#00ff00',
        textShadow: '0 0 10px rgba(0, 255, 0, 0.8)',
        maxWidth: '80%',
        wordBreak: 'break-word',
        boxShadow: '0 0 20px rgba(0, 255, 0, 0.3)'
      }}>
        <div><strong>RAW:</strong> {outputText || <span style={{ opacity: 0.5 }}>Waiting for recognition...</span>}</div>
        {fixedText && (
          <div style={{ marginTop: '8px', color: fixError ? '#ff6666' : '#ffdd00', borderTop: `1px solid ${fixError ? '#ff6666' : '#ffdd00'}`, paddingTop: '8px' }}>
            <strong>FIXED:</strong> {isFixingText ? "Processing..." : (fixError ? `⚠️ ${fixError}` : fixedText)}
          </div>
        )}
      </div>
    </div>
  );
}