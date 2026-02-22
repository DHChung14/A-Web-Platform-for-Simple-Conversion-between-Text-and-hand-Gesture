package com.capstone.vsl.security;

import io.github.bucket4j.Bandwidth;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
public class RateLimitingFilter extends OncePerRequestFilter {

    private static final String AI_ENDPOINT = "/api/vsl/recognize";
    private static final String AUTH_PREFIX = "/api/auth/";

    private static final Bandwidth AI_RATE_LIMIT = Bandwidth.builder()
            .capacity(10)
            .refillGreedy(10, Duration.ofSeconds(1))
            .build();

    private static final Bandwidth AUTH_RATE_LIMIT = Bandwidth.builder()
            .capacity(10) // Tăng từ 5 → 10 requests
            .refillGreedy(10, Duration.ofMinutes(1)) // Refill 10 requests mỗi phút
            .build();

    private final RateLimitingService rateLimitingService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        String requestUri = request.getRequestURI();
        Bandwidth bandwidth = resolveBandwidth(requestUri);

        if (bandwidth != null) {
            String clientIp = extractClientIp(request);
            String bucketKey = requestUri.startsWith(AUTH_PREFIX)
                    ? "AUTH:" + clientIp
                    : "AI:" + clientIp;

            boolean allowed = rateLimitingService.tryConsume(bucketKey, bandwidth);
            if (!allowed) {
                log.warn("Rate limit exceeded for key={} uri={}", bucketKey, requestUri);
                writeTooManyRequests(response);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !(AI_ENDPOINT.equals(path) || path.startsWith(AUTH_PREFIX));
    }

    private Bandwidth resolveBandwidth(String uri) {
        if (AI_ENDPOINT.equals(uri)) {
            return AI_RATE_LIMIT;
        }
        if (uri.startsWith(AUTH_PREFIX)) {
            return AUTH_RATE_LIMIT;
        }
        return null;
    }

    private void writeTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
                {"code":429,"message":"Too many requests. Please wait a moment and try again.","data":null}
                """);
    }

    private String extractClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}