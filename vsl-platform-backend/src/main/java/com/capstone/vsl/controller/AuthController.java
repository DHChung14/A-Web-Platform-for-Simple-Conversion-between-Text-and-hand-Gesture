package com.capstone.vsl.controller;

import com.capstone.vsl.dto.ApiResponse;
import com.capstone.vsl.dto.AuthRequest;
import com.capstone.vsl.dto.AuthResponse;
import com.capstone.vsl.dto.RegisterRequest;
import com.capstone.vsl.entity.Role;
import com.capstone.vsl.entity.User;
import com.capstone.vsl.repository.UserRepository;
import com.capstone.vsl.security.UserPrincipal;
import com.capstone.vsl.util.JwtUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication Controller
 * Handles user authentication (login) and registration.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    /**
     * POST /api/auth/login
     * Authenticates a user with username and password.
     * Returns a JWT token upon successful authentication.
     *
     * @param authRequest Login credentials (username, password)
     * @return JWT token and user information
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest authRequest) {
        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            authRequest.getUsername(),
                            authRequest.getPassword()
                    )
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);

            // Get user details
            UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();

            // Generate JWT token
            String token = jwtUtils.generateToken(userPrincipal.getUsername());

            // Fetch full user entity to get profile fields
            var user = userRepository.findByUsername(userPrincipal.getUsername())
                    .orElseThrow(() -> new RuntimeException("User not found after authentication"));

            // Build response with all profile fields
            var authResponse = AuthResponse.builder()
                    .token(token)
                    .type("Bearer")
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .role(user.getRole().name())
                    .fullName(user.getFullName())
                    .phoneNumber(user.getPhoneNumber())
                    .dateOfBirth(user.getDateOfBirth())
                    .avatarUrl(user.getAvatarUrl())
                    .bio(user.getBio())
                    .address(user.getAddress())
                    .build();

            log.info("User logged in successfully: {}", userPrincipal.getUsername());
            return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));

        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            log.warn("Login failed: Bad credentials for username: {}", authRequest.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid username or password"));
        } catch (org.springframework.security.authentication.DisabledException e) {
            log.warn("Login failed: Account disabled for username: {}", authRequest.getUsername());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Account is disabled. Please contact administrator."));
        } catch (Exception e) {
            log.error("Login failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("Invalid username or password"));
        }
    }

    /**
     * POST /api/auth/register
     * Registers a new user account.
     * Default role is USER.
     *
     * @param registerRequest Registration data (username, email, password)
     * @return Success message
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            // Check if username already exists
            if (userRepository.existsByUsername(registerRequest.getUsername())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("Username already exists"));
            }

            // Check if email already exists
            if (userRepository.existsByEmail(registerRequest.getEmail())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("Email already exists"));
            }

            // Determine avatar URL: use provided one or generate default
            String avatarUrl = registerRequest.getAvatarUrl();
            if (avatarUrl == null || avatarUrl.trim().isEmpty()) {
                avatarUrl = "https://robohash.org/" + registerRequest.getUsername();
            }

            // Create new user with extended profile fields
            var user = User.builder()
                    .username(registerRequest.getUsername())
                    .email(registerRequest.getEmail())
                    .password(passwordEncoder.encode(registerRequest.getPassword()))
                    .role(Role.USER) // Default role is USER
                    .fullName(registerRequest.getFullName())
                    .phoneNumber(registerRequest.getPhoneNumber())
                    .dateOfBirth(registerRequest.getDateOfBirth())
                    .avatarUrl(avatarUrl)
                    .bio(registerRequest.getBio())
                    .address(registerRequest.getAddress())
                    .build();

            userRepository.save(user);

            // Generate JWT token for immediate login
            String token = jwtUtils.generateToken(user.getUsername());

            // Build response with all profile fields
            var authResponse = AuthResponse.builder()
                    .token(token)
                    .type("Bearer")
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .role(user.getRole().name())
                    .fullName(user.getFullName())
                    .phoneNumber(user.getPhoneNumber())
                    .dateOfBirth(user.getDateOfBirth())
                    .avatarUrl(user.getAvatarUrl())
                    .bio(user.getBio())
                    .address(user.getAddress())
                    .build();

            log.info("User registered successfully: {}", user.getUsername());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Registration successful", authResponse));

        } catch (Exception e) {
            log.error("Registration failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Registration failed: " + e.getMessage()));
        }
    }
}

