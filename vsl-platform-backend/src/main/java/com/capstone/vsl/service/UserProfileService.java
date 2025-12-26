package com.capstone.vsl.service;

import com.capstone.vsl.dto.UserDTO;
import com.capstone.vsl.dto.UserProfileUpdateRequest;
import com.capstone.vsl.entity.User;
import com.capstone.vsl.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Encapsulates user self-service profile functionality.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Change the password for the authenticated user after verifying old password.
     *
     * @param username    current username
     * @param oldPassword submitted current password
     * @param newPassword new password to set
     */
    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new IllegalArgumentException("Incorrect old password");
        }

        if (oldPassword != null && oldPassword.equals(newPassword)) {
            throw new IllegalArgumentException("New password must be different from the old password");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("User {} updated password", username);
    }

    /**
     * Update profile information for the authenticated user.
     * Updates all profile fields provided in the request.
     * Does NOT update: password, role, id, username, email.
     *
     * @param username Current username (from authentication)
     * @param request  Profile update request with optional fields
     * @return Updated user DTO
     */
    @Transactional
    public UserDTO updateProfile(String username, UserProfileUpdateRequest request) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        // Update all profile fields (all are optional/nullable)
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setDateOfBirth(request.getDateOfBirth());
        user.setAvatarUrl(request.getAvatarUrl());
        user.setBio(request.getBio());
        user.setAddress(request.getAddress());

        // Save updated user
        user = userRepository.save(user);
        log.info("User {} updated profile", username);

        // Convert to DTO and return
        return userToDTO(user);
    }

    /**
     * Get current user profile by username.
     *
     * @param username Current username (from authentication)
     * @return User DTO
     */
    public UserDTO getProfile(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        return userToDTO(user);
    }

    /**
     * Convert User entity to DTO
     */
    private UserDTO userToDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .dateOfBirth(user.getDateOfBirth())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .address(user.getAddress())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}

