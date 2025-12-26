package com.capstone.vsl.integration;

import com.capstone.vsl.integration.dto.AiResponseDTO;
import com.capstone.vsl.integration.dto.GestureInputDTO;
import com.capstone.vsl.integration.exception.AiServiceUnavailableException;
import com.capstone.vsl.integration.exception.ExternalServiceException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.util.Map;

/**
 * Gesture Integration Service
 * Acts as a Gateway/Proxy to the unified Python AI Service
 * 
 * Architecture:
 * - Single API call to unified Python service
 * - Python service handles: Gesture Recognition + Accent Restoration internally
 * - Returns final Vietnamese text with accents
 * 
 * Features:
 * - Robust error handling with timeouts
 * - Comprehensive logging
 * - Simple gateway pattern (no orchestration logic)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GestureIntegrationService {

    @Qualifier("aiRestClient")
    private final RestClient aiRestClient;

    /**
     * Process gesture input through the unified AI pipeline
     * 
     * Pipeline (handled by Python service):
     * 1. Validate input
     * 2. Process landmarks -> Recognize gesture
     * 3. Apply accent restoration to current_text + new character
     * 4. Return final Vietnamese text with accents
     *
     * @param input Gesture input with landmarks and current text context
     * @return Final corrected Vietnamese text
     * @throws IllegalArgumentException if input is invalid
     * @throws AiServiceUnavailableException if AI service is offline
     * @throws ExternalServiceException if external service returns error
     */
    public String processGesture(GestureInputDTO input) {
        // Validation
        if (input.frames() == null || input.frames().isEmpty()) {
            throw new IllegalArgumentException("Frames cannot be empty");
        }

        var frameCount = input.frames().size();
        var currentText = input.currentText() != null ? input.currentText() : "";
        log.info("Received gesture request with [{}] frames, current_text: '{}'", frameCount, currentText);

        // Prepare request body matching Python API format
        var requestBody = Map.of(
                "frames", input.frames(),
                "current_text", currentText
        );

        try {
            log.debug("Calling unified AI service with {} frames", frameCount);

            ResponseEntity<AiResponseDTO> response = aiRestClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toEntity(AiResponseDTO.class);

            var responseBody = response.getBody();
            
            // Validate response
            if (responseBody == null) {
                throw new ExternalServiceException("AI Service returned null response", 
                        HttpStatus.INTERNAL_SERVER_ERROR.value());
            }

            // Check if request was successful
            if (Boolean.FALSE.equals(responseBody.success()) || responseBody.error() != null) {
                var errorMsg = responseBody.error() != null 
                        ? responseBody.error() 
                        : "AI Service returned unsuccessful response";
                log.error("AI Service error: {}", errorMsg);
                throw new ExternalServiceException("AI Service error: " + errorMsg, 
                        HttpStatus.INTERNAL_SERVER_ERROR.value());
            }

            // Extract predicted word (new character only)
            if (responseBody.predictedWord() == null || responseBody.predictedWord().trim().isEmpty()) {
                throw new ExternalServiceException("AI Service returned empty predicted_word", 
                        HttpStatus.INTERNAL_SERVER_ERROR.value());
            }

            var predictedWord = responseBody.predictedWord().trim();
            log.info("Unified AI service returned: '{}' (confidence: {}, raw_char: '{}')\n", 
                    predictedWord, 
                    responseBody.confidence(), 
                    responseBody.rawChar());

            return predictedWord;

        } catch (ResourceAccessException e) {
            log.error("AI Service is unavailable: {}", e.getMessage());
            throw new AiServiceUnavailableException("AI Service is offline", e);
        } catch (HttpServerErrorException e) {
            log.error("AI Service returned server error: {} - {}", 
                    e.getStatusCode(), e.getMessage());
            throw new ExternalServiceException(
                    "AI Service error: " + e.getStatusCode(), 
                    e.getStatusCode().value(), 
                    e);
        } catch (ExternalServiceException e) {
            // Re-throw as-is
            throw e;
        } catch (Exception e) {
            log.error("Failed to call AI Service: {}", e.getMessage(), e);
            throw new ExternalServiceException(
                    "Failed to process gesture recognition: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    e);
        }
    }

    /**
     * Fix Vietnamese diacritics for raw text
     * Calls Python AI service to add proper Vietnamese accents
     *
     * @param rawText Raw Vietnamese text without diacritics
     * @return Text with proper Vietnamese diacritics
     * @throws AiServiceUnavailableException if AI service is offline
     * @throws ExternalServiceException if external service returns error
     */
    public String fixDiacritics(String rawText) {
        log.info("Fixing diacritics for text: '{}'", rawText);

        // Prepare request body for diacritics endpoint
        var requestBody = Map.of(
                "text", rawText
        );

        try {
            log.debug("Calling AI service /fix-diacritics endpoint");

            ResponseEntity<Map> response = aiRestClient.post()
                    .uri("/fix-diacritics")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toEntity(Map.class);

            var responseBody = response.getBody();
            
            // Validate response
            if (responseBody == null) {
                throw new ExternalServiceException("AI Service returned null response for diacritics", 
                        HttpStatus.INTERNAL_SERVER_ERROR.value());
            }

            // Extract fixed text from response
            Object fixedTextObj = responseBody.get("fixed_text");
            if (fixedTextObj == null) {
                log.warn("AI Service did not return fixed_text, returning original text");
                return rawText;
            }

            String fixedText = fixedTextObj.toString().trim();
            log.info("Diacritics fixed: '{}' → '{}'", rawText, fixedText);
            return fixedText;

        } catch (ResourceAccessException e) {
            log.error("AI Service is unavailable: {}", e.getMessage());
            throw new AiServiceUnavailableException("AI Service is offline", e);
        } catch (HttpServerErrorException e) {
            log.error("AI Service returned server error: {} - {}", 
                    e.getStatusCode(), e.getMessage());
            throw new ExternalServiceException(
                    "AI Service error: " + e.getStatusCode(), 
                    e.getStatusCode().value(), 
                    e);
        } catch (ExternalServiceException e) {
            // Re-throw as-is
            throw e;
        } catch (Exception e) {
            log.error("Failed to fix diacritics: {}", e.getMessage(), e);
            throw new ExternalServiceException(
                    "Failed to fix diacritics: " + e.getMessage(),
                    HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    e);
        }
    }
}
