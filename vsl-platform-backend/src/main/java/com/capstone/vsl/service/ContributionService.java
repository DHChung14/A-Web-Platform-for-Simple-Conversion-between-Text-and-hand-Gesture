package com.capstone.vsl.service;

import com.capstone.vsl.dto.ContributionDTO;
import com.capstone.vsl.dto.ContributionRequest;
import com.capstone.vsl.entity.Contribution;
import com.capstone.vsl.entity.ContributionStatus;
import com.capstone.vsl.repository.ContributionRepository;
import com.capstone.vsl.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Contribution Service
 * Handles user contributions for new dictionary words
 * Contributions are created with PENDING status and require admin approval
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContributionService {

    private final ContributionRepository contributionRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * Create a new contribution
     * Stores the contribution data as JSON in stagingData field with PENDING status
     *
     * @param request Contribution request with word, definition, and videoUrl
     * @param username Username of the authenticated user creating the contribution
     * @return Created contribution DTO
     * @throws IllegalArgumentException if user not found or invalid data
     */
    @Transactional
    public ContributionDTO createContribution(ContributionRequest request, String username) {
        log.info("Creating contribution for user: {}, word: {}", username, request.getWord());

        // Find user by username
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        // Check limit: user can only have maximum 5 PENDING contributions
        long pendingContributionsCount = contributionRepository.countPendingContributionsByUser(username);
        if (pendingContributionsCount >= 5) {
            throw new IllegalArgumentException(
                    "You have reached the maximum limit of 5 PENDING contributions. " +
                    "Please wait for admin to review your existing contributions before submitting new ones. " +
                    "You can check the status of your contributions in your profile."
            );
        }

        // Convert request to JSON string for stagingData
        String stagingData;
        try {
            stagingData = objectMapper.writeValueAsString(request);
            log.debug("Staging data JSON: {}", stagingData);
        } catch (Exception e) {
            log.error("Failed to serialize contribution request to JSON: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to process contribution data: " + e.getMessage());
        }

        // Create contribution entity with PENDING status
        var contribution = Contribution.builder()
                .user(user)
                .stagingData(stagingData)
                .status(ContributionStatus.PENDING)
                .build();

        // Save to repository
        contribution = contributionRepository.save(contribution);
        log.info("Created contribution: id={}, word={}, status={}, totalPendingContributions={}", 
                contribution.getId(), request.getWord(), contribution.getStatus(), pendingContributionsCount + 1);

        // Convert to DTO and return
        return contributionToDTO(contribution);
    }

    /**
     * Get count of PENDING contributions for a user
     *
     * @param username Username of the authenticated user
     * @return Count of PENDING contributions
     */
    @Transactional(readOnly = true)
    public long getPendingContributionsCount(String username) {
        return contributionRepository.countPendingContributionsByUser(username);
    }

    /**
     * Cancel a contribution (user can only cancel their own PENDING contributions)
     *
     * @param contributionId Contribution ID
     * @param username Username of the authenticated user (must be the owner)
     * @return Cancelled contribution DTO
     */
    @Transactional
    public ContributionDTO cancelContribution(Long contributionId, String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        var contribution = contributionRepository.findById(contributionId)
                .orElseThrow(() -> new IllegalArgumentException("Contribution not found: " + contributionId));

        // Verify that the user owns this contribution
        if (!contribution.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only cancel your own contributions");
        }

        // Only allow cancelling PENDING contributions
        if (contribution.getStatus() != ContributionStatus.PENDING) {
            throw new IllegalArgumentException("You can only cancel PENDING contributions. This contribution is already " + contribution.getStatus());
        }

        contribution.setStatus(ContributionStatus.CANCELLED);
        contribution = contributionRepository.save(contribution);
        log.info("Cancelled contribution: user={}, contributionId={}", username, contributionId);

        return contributionToDTO(contribution);
    }

    /**
     * Get contributions created by a specific user (for "My Contributions" view)
     */
    @Transactional(readOnly = true)
    public java.util.List<ContributionDTO> getUserContributions(String username) {
        var contributions = contributionRepository.findByUserUsernameOrderByCreatedAtDesc(username);
        log.debug("Retrieved {} contributions for user: {}", contributions.size(), username);
        return contributions.stream()
                .map(this::contributionToDTO)
                .toList();
    }

    /**
     * Get contribution details by ID (for admin detail view)
     */
    @Transactional(readOnly = true)
    public ContributionDTO getContributionById(Long id) {
        var contribution = contributionRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Contribution not found: " + id));
        return contributionToDTO(contribution);
    }

    /**
     * Convert Contribution entity to DTO
     */
    private ContributionDTO contributionToDTO(Contribution contribution) {
        return ContributionDTO.builder()
                .id(contribution.getId())
                .userId(contribution.getUser().getId())
                .username(contribution.getUser().getUsername())
                .stagingData(contribution.getStagingData())
                .status(contribution.getStatus())
                .createdAt(contribution.getCreatedAt())
                .updatedAt(contribution.getUpdatedAt())
                .build();
    }
}

