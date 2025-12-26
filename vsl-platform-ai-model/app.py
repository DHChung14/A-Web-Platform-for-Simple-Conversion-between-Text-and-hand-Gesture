"""
Flask API for Hand Gesture Recognition System
Processes hand landmarks (coordinates) and restores Vietnamese accents
"""

import os
import numpy as np
import joblib
import traceback
import logging
from collections import Counter
from flask import Flask, request, jsonify
from flask_cors import CORS
from src.utils.vn_accent_restore import restore_diacritics

# Setup logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCALER_PATH = os.path.join(BASE_DIR, 'models', 'scaler.pkl')
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'model_mlp.pkl')

# Constants
CONFIDENCE_THRESHOLD = 0.7
EXPECTED_LANDMARKS = 21  # MediaPipe hand has 21 landmarks
EXPECTED_FEATURES = 63   # 21 landmarks * 3 coordinates (x, y, z)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- GLOBAL VARIABLES (Loaded at startup) ---
scaler = None
model = None


def load_models():
    """Load ML model and scaler at startup"""
    global scaler, model
    
    if not os.path.exists(SCALER_PATH) or not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model files not found. Expected:\n"
            f"  - {SCALER_PATH}\n"
            f"  - {MODEL_PATH}"
        )
    
    try:
        scaler = joblib.load(SCALER_PATH)
        model = joblib.load(MODEL_PATH)
        print(f"✓ Models loaded successfully from {BASE_DIR}")
    except Exception as e:
        raise RuntimeError(f"Error loading models: {e}")


def preprocess_landmarks(landmarks):
    """
    Preprocess landmarks: Normalize by subtracting wrist coordinates
    
    Args:
        landmarks: List of 21 landmarks, each with {"x": float, "y": float, "z": float}
    
    Returns:
        numpy array: Flattened array of shape (1, 63) with relative coordinates
    """
    if len(landmarks) != EXPECTED_LANDMARKS:
        raise ValueError(f"Expected {EXPECTED_LANDMARKS} landmarks, got {len(landmarks)}")
    
    # Get wrist coordinates (index 0)
    wrist = landmarks[0]
    wrist_x = wrist['x']
    wrist_y = wrist['y']
    wrist_z = wrist['z']
    
    # Calculate relative coordinates (subtract wrist from all points)
    relative_landmarks = []
    for landmark in landmarks:
        relative_landmarks.extend([
            landmark['x'] - wrist_x,
            landmark['y'] - wrist_y,
            landmark['z'] - wrist_z
        ])
    
    # Flatten to shape (1, 63)
    landmarks_array = np.array(relative_landmarks).reshape(1, -1)
    
    if landmarks_array.shape[1] != EXPECTED_FEATURES:
        raise ValueError(f"Expected {EXPECTED_FEATURES} features, got {landmarks_array.shape[1]}")
    
    return landmarks_array


def predict_gesture(landmarks_array):
    """
    Predict gesture from preprocessed landmarks
    
    Args:
        landmarks_array: numpy array of shape (1, 63)
    
    Returns:
        tuple: (prediction, confidence) or (None, None) if confidence < threshold
    """
    if scaler is None or model is None:
        raise RuntimeError("Models not loaded")
    
    # Scale features
    scaled_data = scaler.transform(landmarks_array)
    
    # Predict
    prediction = model.predict(scaled_data)[0]
    probabilities = model.predict_proba(scaled_data)[0]
    max_confidence = np.max(probabilities)
    
    if max_confidence >= CONFIDENCE_THRESHOLD:
        return str(prediction).lower(), float(max_confidence)
    
    return None, None


def vote_predictions(predictions):
    """
    Find the most common character (mode) from predictions
    
    Args:
        predictions: List of (character, confidence) tuples
    
    Returns:
        tuple: (most_common_char, average_confidence) or (None, None) if empty
    """
    if not predictions:
        return None, None
    
    # Extract characters
    characters = [char for char, _ in predictions]
    
    # Find mode (most common)
    char_counter = Counter(characters)
    most_common_char, count = char_counter.most_common(1)[0]
    
    # Calculate average confidence for the most common character
    confidences = [conf for char, conf in predictions if char == most_common_char]
    avg_confidence = sum(confidences) / len(confidences)
    
    return most_common_char, avg_confidence


# --- API ROUTES ---

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'models_loaded': model is not None and scaler is not None
    }), 200


@app.route('/predict', methods=['POST'])
def predict():
    """
    Predict gesture from landmarks and restore Vietnamese accents
    
    Request body (JSON):
    {
        "frames": [
            {
                "landmarks": [
                    {"x": 0.1, "y": 0.2, "z": 0.3},
                    {"x": 0.2, "y": 0.3, "z": 0.4},
                    ... (21 landmarks total)
                ]
            },
            ... (more frames)
        ],
        "current_text": "xin ch"
    }
    
    Response:
    {
        "final_sentence": "xin chào",
        "confidence": 0.95
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        
        if 'frames' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "frames" in request body'
            }), 400
        
        if 'current_text' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "current_text" in request body'
            }), 400
        
        frames = data['frames']
        current_text = data['current_text']
        
        if not isinstance(frames, list) or len(frames) == 0:
            return jsonify({
                'success': False,
                'error': '"frames" must be a non-empty array'
            }), 400
        
        if not isinstance(current_text, str):
            return jsonify({
                'success': False,
                'error': '"current_text" must be a string'
            }), 400
        
        # Process each frame
        valid_predictions = []
        
        for frame_idx, frame in enumerate(frames):
            try:
                # Validate frame structure
                if 'landmarks' not in frame:
                    continue
                
                landmarks = frame['landmarks']
                
                # Preprocess landmarks (normalize by wrist)
                landmarks_array = preprocess_landmarks(landmarks)
                
                # Predict gesture
                prediction, confidence = predict_gesture(landmarks_array)
                
                if prediction is not None:
                    valid_predictions.append((prediction, confidence))
            
            except ValueError as e:
                # Skip invalid frames
                continue
            except Exception as e:
                # Skip frames with errors
                continue
        
        # Voting: Find most common character
        if not valid_predictions:
            return jsonify({
                'success': False,
                'error': 'No valid predictions (all frames below confidence threshold)'
            }), 400
        
        raw_char, confidence = vote_predictions(valid_predictions)
        
        if raw_char is None:
            return jsonify({
                'success': False,
                'error': 'Failed to determine prediction'
            }), 400
        
        # Return ONLY the predicted character (not accumulated text)
        # Frontend will accumulate the characters, not Python
        return jsonify({
            'success': True,
            'predicted_word': raw_char,  # ← ONLY the new character/prediction
            'confidence': confidence,
            'raw_char': raw_char,
            'frames_processed': len(frames),
            'valid_predictions': len(valid_predictions)
        }), 200
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


@app.route('/fix-diacritics', methods=['POST'])
def fix_diacritics():
    """
    Add Vietnamese diacritics to raw text
    
    Request body (JSON):
    {
        "text": "xin chao"
    }
    
    Response:
    {
        "fixed_text": "xin chào",
        "success": true
    }
    """
    try:
        # Validate request
        if not request.is_json:
            return jsonify({
                'success': False,
                'error': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        
        if 'text' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing "text" in request body'
            }), 400
        
        raw_text = data['text']
        
        if not isinstance(raw_text, str):
            return jsonify({
                'success': False,
                'error': '"text" must be a string'
            }), 400
        
        if not raw_text.strip():
            return jsonify({
                'success': False,
                'error': '"text" cannot be empty'
            }), 400
        
        # Restore diacritics with better error handling
        try:
            fixed_text = restore_diacritics(raw_text.lower().strip())
            
            # Validate that fixed_text is not None or empty
            if not fixed_text or not fixed_text.strip():
                log.warning(f"restore_diacritics returned empty result for: '{raw_text}'")
                # Return original text if restoration failed
                fixed_text = raw_text
            
            return jsonify({
                'success': True,
                'fixed_text': fixed_text,
                'original_text': raw_text
            }), 200
        except Exception as restore_error:
            # Log the error for debugging
            error_trace = traceback.format_exc()
            log.error(f"Error in restore_diacritics for text '{raw_text}': {str(restore_error)}\n{error_trace}")
            
            # Return JSON error response instead of letting Flask return HTML
            return jsonify({
                'success': False,
                'error': f'Failed to restore diacritics: {str(restore_error)}',
                'original_text': raw_text
            }), 500
    
    except Exception as e:
        # Log full traceback for debugging
        error_trace = traceback.format_exc()
        log.error(f"Unexpected error in fix_diacritics endpoint: {str(e)}\n{error_trace}")
        
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500


try:
    load_models()
    print("✓ API initialized and ready")
except Exception as e:
    print(f"✗ Initialization error: {e}")
    raise


if __name__ == '__main__':
    # Run development server
    app.run(host='0.0.0.0', port=5000, debug=False)
