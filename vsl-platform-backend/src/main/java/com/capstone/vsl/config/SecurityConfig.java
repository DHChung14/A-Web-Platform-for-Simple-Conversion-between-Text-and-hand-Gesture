package com.capstone.vsl.config;

import com.capstone.vsl.security.JwtAuthenticationFilter;
import com.capstone.vsl.security.RateLimitingFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod; // <--- QUAN TRỌNG: Import cái này
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final UserDetailsService userDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RateLimitingFilter rateLimitingFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    /**
     * CẤU HÌNH CORS CHUẨN
     * Security: Uses environment variable for allowed origins in production
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration corsConfig = new CorsConfiguration();
        
        // 1. Allowed Origins - Use environment variable or default to localhost for development
        String allowedOriginsEnv = System.getenv("CORS_ALLOWED_ORIGINS");
        if (allowedOriginsEnv != null && !allowedOriginsEnv.trim().isEmpty()) {
            // Production: Parse from environment variable (comma-separated)
            List<String> origins = Arrays.asList(allowedOriginsEnv.split(","));
            corsConfig.setAllowedOrigins(origins);
        } else {
            // Development: Default localhost origins
            corsConfig.setAllowedOrigins(Arrays.asList(
                    "http://localhost:3000",
                    "http://localhost:5173",
                    "http://localhost:8080"
            ));
        }
        
        // 2. Allowed Methods (Bao gồm OPTIONS)
        corsConfig.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"
        ));
        
        // 3. Allowed Headers
        corsConfig.setAllowedHeaders(Arrays.asList(
                "Authorization",
                "Content-Type",
                "X-Requested-With",
                "Accept",
                "Origin",
                "Access-Control-Request-Method",
                "Access-Control-Request-Headers"
        ));
        
        // 4. Credentials & Exposed Headers
        corsConfig.setAllowCredentials(true);
        corsConfig.setExposedHeaders(List.of("Authorization"));
        
        // 5. Max Age for preflight requests (cache for 1 hour)
        corsConfig.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", corsConfig);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            .authorizeHttpRequests(auth -> auth
                // --- [QUAN TRỌNG] FIX LỖI CORS ---
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            
                // --- PUBLIC ENDPOINTS (Xóa /v1 để khớp với Controller) ---
                .requestMatchers("/api/auth/**").permitAll()                 // Đã sửa
                .requestMatchers("/api/recognition/**").permitAll()          // Đã sửa
                .requestMatchers("/api/spelling/**").permitAll()             // Đã sửa
                .requestMatchers("/api/dictionary/search/**").permitAll()    // QUAN TRỌNG: Sửa dòng này để Healthcheck qua được
                .requestMatchers("/api/dictionary/detail/**").permitAll()    // Đã sửa
                .requestMatchers(HttpMethod.GET, "/api/dictionary/**").permitAll() // Public: dictionary read endpoints
                .requestMatchers("/api/dictionary/random/**").permitAll()    // Public: Random words for guest and users
                .requestMatchers("/api/dictionary/count").permitAll()        // Public: Total word count for guest and users
                .requestMatchers("/api/vsl/**").permitAll() // VSL gesture recognition endpoints
                .requestMatchers("/api/proxy/agent-logging/**").permitAll() // Agent logging proxy (no auth required)

                
                // Swagger UI
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                
                // --- PRIVATE ENDPOINTS ---
                .requestMatchers("/api/admin/**").hasRole("ADMIN")           // Đã sửa
                .requestMatchers("/api/user/**").hasAnyRole("USER", "ADMIN") // Đã sửa
                
                // --- MẶC ĐỊNH ---
                .anyRequest().authenticated()
            )
            
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}