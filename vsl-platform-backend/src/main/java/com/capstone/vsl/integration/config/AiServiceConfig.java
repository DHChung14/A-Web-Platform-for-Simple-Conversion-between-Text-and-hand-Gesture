package com.capstone.vsl.integration.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * AI Service Configuration
 * Configures RestClient for the unified AI service endpoint
 * The unified service handles both gesture recognition and accent restoration
 */
@Configuration
public class AiServiceConfig {

    @Value("${ai.service.url:http://localhost:5000}")
    private String aiServiceUrl;

    @Value("${ai.service.timeout:10000}")
    private int timeoutMs;

    /**
     * Creates a request factory with configured timeouts
     * Connect Timeout: Time to establish connection
     * Read Timeout: Time to wait for response
     * 
     * @return Configured ClientHttpRequestFactory
     */
    @Bean
    public SimpleClientHttpRequestFactory aiRequestFactory() {
        var requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofMillis(timeoutMs));
        requestFactory.setReadTimeout(Duration.ofMillis(timeoutMs));
        return requestFactory;
    }

    /**
     * Creates RestClient for the unified AI service
     * This single endpoint handles:
     * - Gesture recognition from landmarks
     * - Accent restoration for Vietnamese text
     */
    @Bean("aiRestClient")
    public RestClient aiRestClient(SimpleClientHttpRequestFactory requestFactory) {
        return RestClient.builder()
                .baseUrl(aiServiceUrl)
                .requestFactory(requestFactory)
                .build();
    }
}
