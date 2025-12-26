package com.capstone.vsl.integration.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Unified DTO representing the response from the unified Python AI Service
 * Expected JSON format from Python API:
 * {
 *   "success": true,
 *   "predicted_word": "a",
 *   "confidence": 0.95,
 *   "raw_char": "a",
 *   "frames_processed": 5,
 *   "valid_predictions": 4
 * }
 */
public record AiResponseDTO(
        @JsonProperty("success")
        Boolean success,
        
        @JsonProperty("predicted_word")
        String predictedWord,
        
        @JsonProperty("confidence")
        Double confidence,
        
        @JsonProperty("raw_char")
        String rawChar,
        
        @JsonProperty("frames_processed")
        Integer framesProcessed,
        
        @JsonProperty("valid_predictions")
        Integer validPredictions,
        
        @JsonProperty("error")
        String error
) {
}

