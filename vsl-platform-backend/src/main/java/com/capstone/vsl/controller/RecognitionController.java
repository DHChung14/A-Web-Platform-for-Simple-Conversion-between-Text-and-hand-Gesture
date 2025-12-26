package com.capstone.vsl.controller;

import com.capstone.vsl.dto.ApiResponse;
import com.capstone.vsl.integration.GestureIntegrationService;
import com.capstone.vsl.integration.dto.GestureInputDTO;
import com.capstone.vsl.integration.exception.AiServiceUnavailableException;
import com.capstone.vsl.integration.exception.ExternalServiceException;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Recognition Controller
 * Handles gesture recognition requests from clients
 */
@RestController
@RequestMapping("/api/vsl")
@RequiredArgsConstructor
@Slf4j
public class RecognitionController {

    private final GestureIntegrationService gestureIntegrationService;

    /**
     * POST /api/vsl/recognize
     * Process gesture landmarks and return recognized Vietnamese text
     * 
     * Architecture (Unified):
     * 1. Client sends JSON Landmarks + current_text context
     * 2. Java forwards to unified Python AI Service (single endpoint)
     * 3. Python service handles: Gesture Recognition + Accent Restoration internally
     * 4. Java returns Final Vietnamese text with accents
     *
     * @param input Gesture input with landmarks and current text context (validated)
     * @return Recognized Vietnamese text with accents
     */
    @PostMapping("/predict")
    public ResponseEntity<ApiResponse<String>> recognize(@Valid @RequestBody GestureInputDTO input) {
        var startTime = System.currentTimeMillis();
        
        try {
            log.info("Received recognition request with {} frames", 
                    input.frames() != null ? input.frames().size() : 0);

            var result = gestureIntegrationService.processGesture(input);
            
            var executionTime = System.currentTimeMillis() - startTime;
            log.info("Recognition completed in {} ms", executionTime);

            return ResponseEntity.ok(ApiResponse.success(
                    String.format("Recognition completed in %d ms", executionTime),
                    result
            ));

        } catch (IllegalArgumentException e) {
            var executionTime = System.currentTimeMillis() - startTime;
            log.warn("Invalid input received (execution time: {} ms): {}", executionTime, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error("Invalid input: " + e.getMessage()));
        } catch (AiServiceUnavailableException e) {
            var executionTime = System.currentTimeMillis() - startTime;
            log.error("AI service unavailable (execution time: {} ms): {}", executionTime, e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("AI Service is offline: " + e.getMessage()));
        } catch (ExternalServiceException e) {
            var executionTime = System.currentTimeMillis() - startTime;
            log.error("External service error (execution time: {} ms): {} - Status: {}", 
                    executionTime, e.getMessage(), e.getStatusCode());
            return ResponseEntity.status(e.getStatusCode())
                    .body(ApiResponse.error("External service error: " + e.getMessage()));
        } catch (Exception e) {
            var executionTime = System.currentTimeMillis() - startTime;
            log.error("Unexpected error during recognition (execution time: {} ms): {}", 
                    executionTime, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Recognition failed: " + e.getMessage()));
        }
    }

    /**
     * POST /api/vsl/fix-diacritics
     * Add Vietnamese diacritics to raw text
     * Receives raw Vietnamese text (without diacritics) and returns with diacritics
     *
     * @param request Object with "text" field containing raw Vietnamese text
     * @return Vietnamese text with proper diacritics
     */
    @PostMapping("/fix-diacritics")
    public ResponseEntity<ApiResponse<String>> fixDiacritics(@RequestBody Map<String, String> request) {
        var startTime = System.currentTimeMillis();
        
        try {
            String rawText = request.get("text");
            if (rawText == null || rawText.isBlank()) {
                return ResponseEntity.badRequest()
                        .body(ApiResponse.error("Text field is required and cannot be empty"));
            }

            log.info("Received fix-diacritics request for text: '{}'", rawText);

            // Call AI service to add diacritics
            var fixedText = gestureIntegrationService.fixDiacritics(rawText);
            
            var executionTime = System.currentTimeMillis() - startTime;
            log.info("Diacritics restoration completed in {} ms. Original: '{}' → Fixed: '{}'", 
                    executionTime, rawText, fixedText);

            return ResponseEntity.ok(ApiResponse.success(
                    String.format("Diacritics restoration completed in %d ms", executionTime),
                    fixedText
            ));

        } catch (AiServiceUnavailableException e) {
            var executionTime = System.currentTimeMillis() - startTime;
            log.error("AI service unavailable (execution time: {} ms): {}", executionTime, e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(ApiResponse.error("AI Service is offline: " + e.getMessage()));
        } catch (ExternalServiceException e) {
            var executionTime = System.currentTimeMillis() - startTime;
            log.error("External service error (execution time: {} ms): {}", executionTime, e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                    .body(ApiResponse.error("External service error: " + e.getMessage()));
        } catch (Exception e) {
            var executionTime = System.currentTimeMillis() - startTime;
            log.error("Unexpected error during diacritics restoration (execution time: {} ms): {}", 
                    executionTime, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Diacritics restoration failed: " + e.getMessage()));
        }
    }
}
