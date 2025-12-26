import cv2
import joblib
import mediapipe as mp
import numpy as np
import time
import os
import threading
import sys
from PIL import Image, ImageDraw, ImageFont

# --- CẤU HÌNH PATH ---
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# Thêm project root vào sys.path
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Import module thêm dấu
try:
    from src.utils.vn_accent_restore import restore_diacritics
except ImportError as e:
    print(f"Import Error: {e}")
    print("Please run from the project root.")
    exit()

# --- CẤU HÌNH ĐƯỜNG DẪN MODEL ---
SCALER_PATH = os.path.join(PROJECT_ROOT, 'models', 'scaler.pkl')
MODEL_PATH = os.path.join(PROJECT_ROOT, 'models', 'model_mlp.pkl')

# --- BIẾN TOÀN CỤC ---
cached_font_path = None

# --- [MỚI] HÀM TỰ ĐỘNG TÌM FONT TIẾNG VIỆT ---
def find_best_font_path():
    """
    Hàm này tự động quét hệ thống để tìm font hỗ trợ tiếng Việt.
    """
    global cached_font_path
    if cached_font_path and os.path.exists(cached_font_path):
        return cached_font_path

    # 1. Ưu tiên tìm file font.ttf ngay trong thư mục dự án
    local_paths = [
        "font.ttf",
        os.path.join(SCRIPT_DIR, "font.ttf"),
        os.path.join(PROJECT_ROOT, "font.ttf"),
    ]
    for path in local_paths:
        if os.path.exists(path):
            print(f"[Font] Found local font: {path}")
            cached_font_path = path
            return path

    # 2. Quét các thư mục font hệ thống của Ubuntu
    print("[Font] Scanning system for Vietnamese fonts...")
    
    # Danh sách font ưu tiên (hỗ trợ tiếng Việt tốt)
    target_fonts = [
        'Roboto-Regular.ttf', 
        'DejaVuSans.ttf', 
        'Ubuntu-R.ttf',
        'LiberationSans-Regular.ttf',
        'Arial.ttf',
        'FreeSans.ttf'
    ]
    
    # Các thư mục font chuẩn trên Linux
    system_font_dirs = [
        '/usr/share/fonts', 
        '/usr/local/share/fonts', 
        os.path.expanduser('~/.fonts')
    ]
    
    for font_dir in system_font_dirs:
        if not os.path.exists(font_dir): continue
        # Dùng os.walk để tìm sâu trong thư mục con
        for root, _, files in os.walk(font_dir):
            for filename in files:
                if filename in target_fonts:
                    found_path = os.path.join(root, filename)
                    print(f"[Font] Found system font: {found_path}")
                    cached_font_path = found_path
                    return found_path

    print("[Font] Warning: No specific Vietnamese font found. Using default.")
    return None

def get_font(size=30):
    font_path = find_best_font_path()
    if font_path:
        try:
            return ImageFont.truetype(font_path, size)
        except Exception:
            pass
    return ImageFont.load_default()

# --- HÀM VẼ CHỮ (SỬ DỤNG FONT TÌM ĐƯỢC) ---
def draw_vn_text(img, text, pos, font_size=30, color=(255, 255, 255)):
    img_pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(img_pil)
    
    font = get_font(font_size)
    
    # Thêm viền đen (stroke) để chữ dễ đọc hơn
    stroke_color = (0, 0, 0)
    stroke_width = 2
    
    draw.text(pos, text, font=font, fill=color, stroke_width=stroke_width, stroke_fill=stroke_color)
    return cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

def process_accent_async(raw_text):
    """User manually requests diacritics for the complete text"""
    try:
        raw_text_lower = raw_text.lower().strip()
        if not raw_text_lower:
            print("[DIACRITICS] Empty text, skipping")
            return None
            
        print(f"[DIACRITICS] Processing: '{raw_text_lower}'")
        start_time = time.time()
        
        restored = restore_diacritics(raw_text_lower)
        elapsed = time.time() - start_time
        
        result = restored.capitalize()
        print(f"[DIACRITICS] Done in {elapsed:.3f}s: '{result}'")
        return result
        
    except Exception as e:
        print(f"[ERROR] Diacritics failed: {e}")
        return None

# --- LOAD MODEL ---
print("Loading Gesture Model and Scaler...")
if not os.path.exists(SCALER_PATH) or not os.path.exists(MODEL_PATH):
    print(f"ERROR: Model files not found at {MODEL_PATH}")
    exit()

try:
    scaler = joblib.load(SCALER_PATH)
    model = joblib.load(MODEL_PATH)
    print("✓ Model loaded successfully!")
except Exception as e:
    print(f"Error loading model: {e}")
    exit()

# --- SETUP MEDIAPIPE ---
mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)
mp_drawing = mp.solutions.drawing_utils

# --- SETUP CAMERA ---
cap = cv2.VideoCapture(0)

current_sequence_raw = [] 
last_stable_prediction = None
stable_start_time = None
HOLD_DURATION = 3.0  # Tăng từ 1.5s → 3s để tránh false positives
CONFIDENCE_THRESHOLD = 0.7

was_hand_present = False 
space_cooldown = 0  # Cooldown để tránh space bị thêm nhiều lần
character_just_added = False  # Flag để tránh character bị add 2 lần

# --- MAIN LOOP ---
WINDOW_NAME = 'Gesture Pipeline'
cv2.namedWindow(WINDOW_NAME, cv2.WINDOW_NORMAL)

# Tìm font 1 lần khi khởi động để cache
print("Initializing font system...")
find_best_font_path()

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    frame_h, frame_w, _ = frame.shape
    
    image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image_rgb.flags.writeable = False
    results = hands.process(image_rgb)
    image_rgb.flags.writeable = True
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

    detected_label = None
    is_hand_present = False 

    # 1. XỬ LÝ KHI CÓ TAY
    if results.multi_hand_landmarks:
        is_hand_present = True
        for hand_landmarks in results.multi_hand_landmarks:
            mp_drawing.draw_landmarks(image_bgr, hand_landmarks, mp_hands.HAND_CONNECTIONS)
            
            wrist = hand_landmarks.landmark[0]
            landmarks_list = []
            for lm in hand_landmarks.landmark:
                landmarks_list.extend([lm.x - wrist.x, lm.y - wrist.y, lm.z - wrist.z])

            if len(landmarks_list) == 63:
                input_data = np.array(landmarks_list).reshape(1, -1)
                scaled_data = scaler.transform(input_data)
                prediction = model.predict(scaled_data)[0]
                probabilities = model.predict_proba(scaled_data)[0]
                max_prob = np.max(probabilities)
                
                if max_prob >= CONFIDENCE_THRESHOLD:
                    detected_label = str(prediction).lower()
                    
                    # DEBUG: Hiển thị nhãn + confidence
                    cv2.putText(image_bgr, f"Gesture: {detected_label.upper()} ({max_prob:.2f})", 
                               (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
                else:
                    # DEBUG: Hiển thị khi confidence thấp
                    cv2.putText(image_bgr, f"Low confidence: {max_prob:.2f}", 
                               (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 100, 255), 1)
    else:
        # DEBUG: Khi không có tay
        if was_hand_present:
            cv2.putText(image_bgr, "No hand detected", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 255), 1)

    # 2. PHÁT HIỆN BỎ TAY -> THÊM SPACE (với cooldown để tránh multiple spaces)
    if was_hand_present and not is_hand_present:
        if current_sequence_raw and current_sequence_raw[-1] != " ":
            current_sequence_raw.append(" ")
            print(f"[HAND-REMOVED] Added SPACE. Current text: {''.join(current_sequence_raw)}")
            cv2.putText(image_bgr, ">>> SPACE ADDED <<<", (frame_w // 2 - 200, frame_h // 2), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
        else:
            print(f"[HAND-REMOVED] No space added (last char is space or empty)")

    was_hand_present = is_hand_present

    # 3. LOGIC GIỮ TAY (HOLD - cần giữ 3s liên tục cùng gesture)
    if detected_label:
        if detected_label == last_stable_prediction and not character_just_added:
            # Tiếp tục giữ cùng gesture
            elapsed = time.time() - stable_start_time
            
            # Hiển thị progress bar
            bar_w = int((elapsed / HOLD_DURATION) * 200)
            cv2.rectangle(image_bgr, (10, 70), (10 + 200, 80), (100, 100, 100), -1)
            cv2.rectangle(image_bgr, (10, 70), (10 + bar_w, 80), (0, 255, 0), -1)
            cv2.putText(image_bgr, f"Hold: {elapsed:.1f}s / {HOLD_DURATION:.1f}s", 
                       (220, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)

            if elapsed >= HOLD_DURATION:
                # Thêm ký tự (nếu không phải space)
                if detected_label != " ": 
                    current_sequence_raw.append(detected_label)
                    print(f"[ADDED] '{detected_label}' | Total: {''.join(current_sequence_raw)}")
                    character_just_added = True  # Đánh dấu để tránh lặp
                
                # RESET để tránh duplicate
                last_stable_prediction = None 
                stable_start_time = None
        else:
            # Thay đổi gesture -> reset timer
            if last_stable_prediction is not None:
                print(f"[RESET] Gesture changed from '{last_stable_prediction}' to '{detected_label}'")
            last_stable_prediction = detected_label
            stable_start_time = time.time()
            character_just_added = False  # Reset flag khi gesture change
    else:
        # Không phát hiện gesture
        if last_stable_prediction is not None:
            print(f"[RESET] No gesture detected (was: {last_stable_prediction})")
        last_stable_prediction = None
        stable_start_time = None
        character_just_added = False  # Reset flag

    # 4. HIỂN THỊ UI SMOOTH (STREAM LIÊN TỤC, KHÔNG RỜI RẠC)
    ui_height = 140
    cv2.rectangle(image_bgr, (0, frame_h - ui_height), (frame_w, frame_h), (20, 20, 20), -1)

    raw_text_combined = "".join(current_sequence_raw)
    if raw_text_combined:
        raw_text_display = raw_text_combined[0].upper() + raw_text_combined[1:] if len(raw_text_combined) > 1 else raw_text_combined[0].upper()
    else:
        raw_text_display = ""
        
    # Dòng Raw (không dấu, thời gian thực)
    image_bgr = draw_vn_text(image_bgr, f"OUTPUT: {raw_text_display}", (20, frame_h - 80), font_size=32, color=(0, 255, 0))

    # Hiển thị thông tin hold duration
    info_text = f"HOLD_TIME: {HOLD_DURATION}s | CONF_THRESHOLD: {CONFIDENCE_THRESHOLD}"
    cv2.putText(image_bgr, info_text, (10, frame_h - 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 255), 1)

    # Hướng dẫn
    guide_text = "'f': Add Diacritics | 'c': Clear | 'q': Quit | HOLD_TIME: 3.0s"
    cv2.putText(image_bgr, guide_text, (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (100, 255, 100), 1)

    cv2.imshow(WINDOW_NAME, image_bgr)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'): 
        break
    elif key == ord('c'):
        current_sequence_raw = []
        print("[CLEAR] Reset all")
    elif key == ord('f'):
        # Manual diacritics fixing when user presses 'f'
        if current_sequence_raw:
            input_sentence = "".join(current_sequence_raw).strip()
            result = process_accent_async(input_sentence)
            if result:
                print(f"[RESULT] Fixed: {result}")
                cv2.putText(image_bgr, f"FIXED: {result}", (10, frame_h // 2), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 255, 0), 3)
        else:
            print("[ERROR] No text to fix")

# --- CLEANUP ---
print("Shutting down...")
cap.release()
cv2.destroyAllWindows()
hands.close()
print("✓ Pipeline closed")