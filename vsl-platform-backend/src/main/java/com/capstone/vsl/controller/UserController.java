package com.capstone.vsl.controller;

import com.capstone.vsl.dto.ApiResponse;
import com.capstone.vsl.dto.PasswordChangeRequest;
import com.capstone.vsl.dto.UserDTO;
import com.capstone.vsl.dto.UserProfileUpdateRequest;
import com.capstone.vsl.security.UserPrincipal;
import com.capstone.vsl.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints for authenticated user profile management.
 */
@RestController
@RequestMapping("/api/user/profile")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class UserController {

    private final UserProfileService userProfileService;

    /**
     * GET /api/user/profile
     * Get current user profile information.
     *
     * @param authentication Current authentication (to get username)
     * @return User profile DTO
     */
    @GetMapping
    public ResponseEntity<ApiResponse<UserDTO>> getProfile(Authentication authentication) {
        try {
            var username = ((UserPrincipal) authentication.getPrincipal()).getUsername();
            log.info("Retrieving profile for user: {}", username);
            
            var user = userProfileService.getProfile(username);
            
            return ResponseEntity.ok(ApiResponse.success("Profile retrieved successfully", user));
        } catch (IllegalArgumentException e) {
            log.warn("Profile retrieval failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error retrieving profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve profile: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/user/profile/password
     * Change password for the authenticated user.
     * Requires old password verification.
     */
    @PutMapping("/password")
    public ResponseEntity<ApiResponse<String>> updatePassword(
            @Valid @RequestBody PasswordChangeRequest request,
            Authentication authentication) {
        try {
            var username = ((UserPrincipal) authentication.getPrincipal()).getUsername();
            userProfileService.changePassword(username, request.getOldPassword(), request.getNewPassword());

            return ResponseEntity.ok(ApiResponse.success("Password updated successfully", "ok"));
        } catch (IllegalArgumentException e) {
            log.warn("Password update failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error updating password", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update password: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/user/profile
     * Update user profile information (fullName, phoneNumber, dateOfBirth, avatarUrl, bio, address).
     * Users can only update their own profile.
     * All fields are optional to allow partial updates or clearing data.
     * 
     * Does NOT allow changing: password, role, id, username, email.
     *
     * @param request Profile update request with optional fields
     * @param authentication Current authentication (to get username)
     * @return Updated user profile DTO
     */
    @PutMapping
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            @Valid @RequestBody UserProfileUpdateRequest request,
            Authentication authentication) {
        try {
            var username = ((UserPrincipal) authentication.getPrincipal()).getUsername();
            log.info("Updating profile for user: {}", username);
            
            var updatedUser = userProfileService.updateProfile(username, request);

            return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updatedUser));
        } catch (IllegalArgumentException e) {
            log.warn("Profile update failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error updating profile", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update profile: " + e.getMessage()));
        }
    }
}

