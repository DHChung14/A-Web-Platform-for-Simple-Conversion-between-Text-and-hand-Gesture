package com.capstone.vsl.integration;

import com.capstone.vsl.integration.dto.AiResponseDTO;
import com.capstone.vsl.integration.dto.GestureInputDTO;
import com.capstone.vsl.integration.exception.AiServiceUnavailableException;
import com.capstone.vsl.integration.exception.ExternalServiceException;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.nio.charset.StandardCharsets;
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

            // Use byte[] response to be resilient to non-standard content types
            // (e.g., application/octet-stream) and then convert to String manually.
            ResponseEntity<byte[]> byteResponse = aiRestClient.post()
                    .uri("/predict")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), 
                            (request, response) -> {
                                // Extract error message from response body
                                String errorBody = "Unknown error";
                                try {
                                    if (response.getBody() != null) {
                                        errorBody = new String(response.getBody().readAllBytes());
                                    }
                                } catch (Exception e) {
                                    log.warn("Could not read error response body: {}", e.getMessage());
                                }
                                log.error("AI Service returned error status {}: {}", response.getStatusCode(), errorBody);
                                throw new HttpServerErrorException(
                                        response.getStatusCode(),
                                        "AI Service error: " + errorBody);
                            })
                    .toEntity(byte[].class);

            var responseBytes = byteResponse.getBody();
            var statusCode = byteResponse.getStatusCode();
            
            // Validate response
            if (responseBytes == null || responseBytes.length == 0) {
                throw new ExternalServiceException("AI Service returned empty response", 
                        HttpStatus.INTERNAL_SERVER_ERROR.value());
            }

            // Convert raw bytes to String using UTF-8 (AI service should return JSON text)
            var responseBodyStr = new String(responseBytes, StandardCharsets.UTF_8);
            
            // Parse JSON response
            AiResponseDTO responseBody;
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                responseBody = objectMapper.readValue(responseBodyStr, AiResponseDTO.class);
            } catch (Exception e) {
                log.error("Failed to parse AI Service response as JSON. Response: {}", responseBodyStr);
                throw new ExternalServiceException(
                        "AI Service returned invalid JSON response: " + e.getMessage(),
                        HttpStatus.INTERNAL_SERVER_ERROR.value(),
                        e);
            }
            
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

            // Use String response to handle content-type issues (similar to predict endpoint)
            ResponseEntity<String> stringResponse = aiRestClient.post()
                    .uri("/fix-diacritics")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .onStatus(status -> status.is4xxClientError() || status.is5xxServerError(), 
                            (request, response) -> {
                                // Extract error message from response body
                                String errorBody = "Unknown error";
                                try {
                                    if (response.getBody() != null) {
                                        errorBody = new String(response.getBody().readAllBytes());
                                    }
                                } catch (Exception e) {
                                    log.warn("Could not read error response body: {}", e.getMessage());
                                }
                                log.error("AI Service returned error status {}: {}", response.getStatusCode(), errorBody);
                                throw new HttpServerErrorException(
                                        response.getStatusCode(),
                                        "AI Service error: " + errorBody);
                            })
                    .toEntity(String.class);

            var responseBodyStr = stringResponse.getBody();
            
            // Validate response
            if (responseBodyStr == null || responseBodyStr.trim().isEmpty()) {
                log.warn("AI Service returned empty response, returning original text");
                return rawText;
            }

            // Parse JSON response manually
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, Object> responseMap = objectMapper.readValue(responseBodyStr, Map.class);
                
                // Check if request was successful
                Object successObj = responseMap.get("success");
                if (Boolean.FALSE.equals(successObj)) {
                    Object errorObj = responseMap.get("error");
                    log.warn("AI Service returned error: {}, returning original text", errorObj);
                    return rawText;
                }

                // Extract fixed text from response
                Object fixedTextObj = responseMap.get("fixed_text");
                if (fixedTextObj == null) {
                    log.warn("AI Service did not return fixed_text, returning original text");
                    return rawText;
                }

                String fixedText = fixedTextObj.toString().trim();
                log.info("Diacritics fixed: '{}' → '{}'", rawText, fixedText);
                return fixedText;
            } catch (Exception e) {
                log.error("Failed to parse AI Service response as JSON. Response: {}", responseBodyStr, e);
                // Return original text if parsing fails
                return rawText;
            }

        } catch (ResourceAccessException e) {
            // AI service unreachable (offline / timeout)
            log.error("AI Service is unavailable during diacritics fix: {}", e.getMessage());
            // Graceful degradation: return original text so UI vẫn hoạt động
            log.warn("Returning original text due to AI Service unavailability");
            return rawText;
        } catch (HttpServerErrorException e) {
            // AI service returned 5xx / 4xx that we escalated as server error
            log.error("AI Service returned server error during diacritics fix: {} - {}",
                    e.getStatusCode(), e.getMessage());
            // Graceful degradation: log and return original text instead of propagating 5xx
            log.warn("Returning original text due to AI Service server error: {}", rawText);
            return rawText;
        } catch (ExternalServiceException e) {
            // Previously we re-threw; now we degrade gracefully
            log.error("ExternalServiceException during diacritics fix: {}", e.getMessage(), e);
            log.warn("Returning original text due to external service error");
            return rawText;
        } catch (Exception e) {
            log.error("Failed to fix diacritics: {}", e.getMessage(), e);
            // Return original text instead of throwing exception to allow graceful degradation
            log.warn("Returning original text due to error: {}", e.getMessage());
            return rawText;
        }
    }
}
