"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { HandFrame, Landmark } from "@/types/api";

/**
 * BUFFER_SIZE: Number of frames to accumulate before triggering API call
 * 20 frames = ~0.67 seconds at 30 FPS
 */
const BUFFER_SIZE = 20;

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [frameBatch, setFrameBatch] = useState<HandFrame[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  /**
   * Initialize MediaPipe HandLandmarker
   */
  useEffect(() => {
    const initializeHandLandmarker = async () => {
      try {
        console.log("[useHandTracking] Initializing MediaPipe HandLandmarker...");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        handLandmarkerRef.current = landmarker;
        setIsReady(true);
        console.log("[useHandTracking] HandLandmarker ready");
      } catch (error) {
        console.error("[useHandTracking] Failed to initialize HandLandmarker:", error);
        setIsReady(false);
      }
    };

    initializeHandLandmarker();

    return () => {
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
      }
    };
  }, []);

  /**
   * drawLandmarks - Chỉ thực hiện việc VẼ (Không xóa)
   * Việc xóa canvas sẽ được thực hiện ở vòng lặp chính.
   */
  const drawLandmarks = useCallback((ctx: CanvasRenderingContext2D, landmarks: Landmark[]) => {
    if (!canvasRef.current) return;

    // Style configuration
    ctx.fillStyle = "#00FF41"; // Neon Green points
    ctx.strokeStyle = "#00FF41"; // Neon Green lines
    ctx.lineWidth = 2;

    // Draw landmark points
    landmarks.forEach((point) => {
      const x = point.x * canvasRef.current!.width;
      const y = point.y * canvasRef.current!.height;

      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Hand Skeleton Connections
    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
      [0, 5], [5, 6], [6, 7], [7, 8], // Index
      [0, 9], [9, 10], [10, 11], [11, 12], // Middle
      [0, 13], [13, 14], [14, 15], [15, 16], // Ring
      [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
      [5, 9], [9, 13], [13, 17], // Palm
    ];

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];

      const x1 = startPoint.x * canvasRef.current!.width;
      const y1 = startPoint.y * canvasRef.current!.height;
      const x2 = endPoint.x * canvasRef.current!.width;
      const y2 = endPoint.y * canvasRef.current!.height;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }, []);

  /**
   * Process Frame Loop
   */
  const processFrameRef = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    processFrameRef.current = () => {
      if (!videoRef.current || !handLandmarkerRef.current || !isCapturing || !canvasRef.current) {
        if (isCapturing) {
          animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current?.());
        }
        return;
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      // --- FIX: LUÔN XÓA CANVAS TRƯỚC KHI VẼ ---
      // Điều này đảm bảo nếu không có tay, màn hình sẽ sạch
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      try {
        const results = handLandmarkerRef.current.detectForVideo(
          videoRef.current,
          performance.now()
        );

        if (results.landmarks && results.landmarks.length > 0) {
          // --- TRƯỜNG HỢP CÓ TAY ---
          const landmarks: Landmark[] = results.landmarks[0].map((point) => ({
            x: point.x,
            y: point.y,
            z: point.z,
          }));

          // 1. Vẽ lên canvas đã được làm sạch
          drawLandmarks(ctx, landmarks);

          // 2. Thêm vào batch xử lý
          setFrameBatch((prev) => {
            const newBatch = [...prev, { landmarks }];
            if (newBatch.length >= BUFFER_SIZE) {
              return newBatch;
            }
            return newBatch;
          });
        } else {
          // --- TRƯỜNG HỢP KHÔNG THẤY TAY (FIX DÍNH LANDMARK) ---
          // Reset batch để dữ liệu cũ không bị gửi đi khi tay xuất hiện lại
          setFrameBatch((prev) => (prev.length > 0 ? [] : prev));
        }
      } catch (error) {
        console.error("[useHandTracking] Error processing frame:", error);
      }

      animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current?.());
    };
  }, [isCapturing, drawLandmarks]);

  /**
   * Start Capture
   */
  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;
          videoRef.current.play().catch(console.error);

          // Sync canvas dimensions immediately
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }

          setIsCapturing(true);
        };
      }
    } catch (error) {
      console.error("Camera error:", error);
      alert("Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.");
    }
  }, []);

  /**
   * Stop Capture
   */
  const stopCapture = useCallback(() => {
    setIsCapturing(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    
    // Clear canvas when stopped
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  }, []);

  // Loop Trigger
  useEffect(() => {
    if (isCapturing && isReady && processFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(() => processFrameRef.current?.());
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isCapturing, isReady]);

  return {
    videoRef,
    canvasRef,
    startCapture,
    stopCapture,
    currentBatch: frameBatch,
    setFrameBatch,
    isReady,
    isCapturing,
  };
};