package com.capstone.vsl.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Agent Logging Proxy Controller
 * Proxies requests to the agent logging service on port 7242
 * This allows the frontend to send analytics/logging data without CORS issues
 */
@RestController
@RequestMapping("/api/proxy/agent-logging")
@Slf4j
public class AgentLoggingProxyController {

    private static final String AGENT_LOGGING_SERVICE_URL = "http://127.0.0.1:7242";
    private static final String INGEST_ENDPOINT = "/ingest/fac30a44-515e-493f-a148-2c304048b02d";
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    public AgentLoggingProxyController() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * POST /api/proxy/agent-logging/ingest
     * Proxies POST requests to the agent logging service
     * 
     * @param body Request body (JSON as Map)
     * @return Response from agent logging service, or empty response if service is unavailable
     */
    @PostMapping("/ingest")
    public ResponseEntity<?> proxyIngest(@RequestBody(required = false) Map<String, Object> body) {
        try {
            String requestBody = body != null ? objectMapper.writeValueAsString(body) : "{}";
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(AGENT_LOGGING_SERVICE_URL + INGEST_ENDPOINT))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .timeout(Duration.ofSeconds(5))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            
            return ResponseEntity
                    .status(response.statusCode())
                    .body(response.body());
                    
        } catch (Exception e) {
            // Silently fail if agent logging service is unavailable
            // This prevents CORS errors from breaking the main application flow
            log.debug("Agent logging service unavailable: {}", e.getMessage());
            return ResponseEntity
                    .status(HttpStatus.OK) // Return 200 to prevent frontend errors
                    .body("{\"status\":\"service_unavailable\"}");
        }
    }
}

