package com.capstone.vsl.controller;

import com.capstone.vsl.dto.ApiResponse;
import com.capstone.vsl.dto.ContributionDTO;
import com.capstone.vsl.dto.ContributionRequest;
import com.capstone.vsl.dto.ReportDTO;
import com.capstone.vsl.dto.ReportRequest;
import com.capstone.vsl.dto.SearchHistoryDTO;
import com.capstone.vsl.security.UserPrincipal;
import com.capstone.vsl.service.ContributionService;
import com.capstone.vsl.service.UserFeatureService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * User Interaction Controller
 * Handles user interaction features: History, Reports, Contributions
 * 
 * Security: All endpoints require authentication (no guest access)
 * - Class-level @PreAuthorize("isAuthenticated()") ensures GUESTS cannot access
 * - Spring Security will automatically return 401 Unauthorized for unauthenticated requests
 */
@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class UserInteractionController {

    private final UserFeatureService userFeatureService;
    private final ContributionService contributionService;

    /**
     * GET /api/user/history
     * Get user's search history
     * Requires authentication (USER or ADMIN role)
     *
     * @param authentication Current authentication (to get username)
     * @return List of search history entries
     */
    @GetMapping("/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<SearchHistoryDTO>>> getHistory(Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Retrieving search history for user: {}", username);
            var history = userFeatureService.getUserSearchHistory(username);

            return ResponseEntity.ok(ApiResponse.success(
                    String.format("Retrieved %d history entries", history.size()),
                    history
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to get history: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to get search history: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve search history: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/user/history
     * Clear user's search history
     */
    @DeleteMapping("/history")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> clearHistory(Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Clearing search history for user: {}", username);
            userFeatureService.clearUserSearchHistory(username);

            return ResponseEntity.ok(ApiResponse.success("Search history cleared", "OK"));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to clear history: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to clear search history: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to clear search history: " + e.getMessage()));
        }
    }

    /**
     * POST /api/user/reports
     * Create or update a report for a dictionary word
     * If user already has an OPEN report for this word, it will be updated instead of creating a new one
     * This prevents spam reports for the same word
     * Request Body: { "wordId": 123, "reason": "Wrong video" }
     * Requires authentication (USER or ADMIN role)
     *
     * @param request Report request with wordId and reason
     * @param authentication Current authentication (to get username)
     * @return Created or updated report DTO
     */
    @PostMapping("/reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReportDTO>> createOrUpdateReport(
            @Valid @RequestBody ReportRequest request,
            Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Creating or updating report for user: {}, wordId: {}, reason: {}", 
                    username, request.getWordId(), request.getReason());
            
            var report = userFeatureService.createOrUpdateReport(
                    request.getWordId(),
                    request.getReason(),
                    username
            );

            // Check if this was an update or new creation by checking if report was just created
            // We can't easily determine this, so we'll use a generic success message
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.success(
                            "Report processed successfully. If you already had an OPEN report for this word, it was updated.",
                            report
                    ));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to create/update report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to create/update report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to process report: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/user/reports/{id}
     * Update an existing report (user can only update their own OPEN reports)
     * Request Body: { "reason": "Updated reason" }
     * Requires authentication (USER or ADMIN role)
     *
     * @param id Report ID
     * @param request Report request with updated reason
     * @param authentication Current authentication (to get username)
     * @return Updated report DTO
     */
    @PutMapping("/reports/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReportDTO>> updateReport(
            @PathVariable Long id,
            @Valid @RequestBody ReportRequest request,
            Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Updating report for user: {}, reportId: {}, reason: {}", 
                    username, id, request.getReason());
            
            var report = userFeatureService.updateReport(id, request.getReason(), username);

            return ResponseEntity.ok(ApiResponse.success("Report updated successfully", report));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to update report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to update report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update report: " + e.getMessage()));
        }
    }

    /**
     * POST /api/user/contributions
     * Create a new contribution for a dictionary word
     * Request Body: { "word": "...", "definition": "...", "videoUrl": "..." }
     * Requires authentication (USER or ADMIN role)
     * 
     * The contribution will be created with PENDING status and requires admin approval
     * before being added to the dictionary.
     *
     * @param request Contribution request with word, definition, and videoUrl
     * @param authentication Current authentication (to get username)
     * @return Created contribution DTO
     */
    @PostMapping("/contributions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ContributionDTO>> createContribution(
            @Valid @RequestBody ContributionRequest request,
            Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Creating contribution for user: {}, word: {}", username, request.getWord());
            
            var contribution = contributionService.createContribution(request, username);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(
                            "Contribution submitted successfully. It will be reviewed by an admin.",
                            contribution
                    ));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to create contribution: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to create contribution: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create contribution: " + e.getMessage()));
        }
    }

    /**
     * GET /api/user/contributions
     * Get contributions created by the authenticated user
     */
    @GetMapping("/contributions")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ContributionDTO>>> getUserContributions(Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Retrieving contributions for user: {}", username);
            var contributions = contributionService.getUserContributions(username);

            return ResponseEntity.ok(ApiResponse.success(
                    String.format("Retrieved %d contributions", contributions.size()),
                    contributions
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to get user contributions: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to get user contributions: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve user contributions: " + e.getMessage()));
        }
    }

    /**
     * GET /api/user/reports
     * Get reports created by the authenticated user
     * Requires authentication (USER or ADMIN role)
     *
     * @param authentication Current authentication (to get username)
     * @return List of reports created by the user
     */
    @GetMapping("/reports")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<List<ReportDTO>>> getUserReports(Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Retrieving reports for user: {}", username);
            var reports = userFeatureService.getUserReports(username);

            return ResponseEntity.ok(ApiResponse.success(
                    String.format("Retrieved %d reports", reports.size()),
                    reports
            ));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to get user reports: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to get user reports: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve user reports: " + e.getMessage()));
        }
    }

    /**
     * GET /api/user/limits
     * Get user's current report and contribution limits
     * Returns counts of OPEN reports and PENDING contributions
     * Requires authentication (USER or ADMIN role)
     *
     * @param authentication Current authentication (to get username)
     * @return Map with openReportsCount and pendingContributionsCount
     */
    @GetMapping("/limits")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<java.util.Map<String, Long>>> getUserLimits(Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            var openReportsCount = userFeatureService.getOpenReportsCount(username);
            var pendingContributionsCount = contributionService.getPendingContributionsCount(username);

            var limits = java.util.Map.of(
                    "openReportsCount", openReportsCount,
                    "pendingContributionsCount", pendingContributionsCount,
                    "maxReports", 5L,
                    "maxContributions", 5L
            );

            return ResponseEntity.ok(ApiResponse.success("User limits retrieved", limits));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to get user limits: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to get user limits: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve user limits: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/user/reports/{id}/cancel
     * Cancel a report (user can only cancel their own OPEN reports)
     * Requires authentication (USER or ADMIN role)
     *
     * @param id Report ID
     * @param authentication Current authentication (to get username)
     * @return Cancelled report DTO
     */
    @PutMapping("/reports/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReportDTO>> cancelReport(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Cancelling report for user: {}, reportId: {}", username, id);
            
            var report = userFeatureService.cancelReport(id, username);

            return ResponseEntity.ok(ApiResponse.success("Report cancelled successfully", report));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to cancel report: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to cancel report: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to cancel report: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/user/contributions/{id}/cancel
     * Cancel a contribution (user can only cancel their own PENDING contributions)
     * Requires authentication (USER or ADMIN role)
     *
     * @param id Contribution ID
     * @param authentication Current authentication (to get username)
     * @return Cancelled contribution DTO
     */
    @PutMapping("/contributions/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ContributionDTO>> cancelContribution(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.info("Cancelling contribution for user: {}, contributionId: {}", username, id);
            
            var contribution = contributionService.cancelContribution(id, username);

            return ResponseEntity.ok(ApiResponse.success("Contribution cancelled successfully", contribution));
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to cancel contribution: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to cancel contribution: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to cancel contribution: " + e.getMessage()));
        }
    }

    /**
     * GET /api/user/reports/word/{wordId}
     * Get OPEN report for a specific word by the authenticated user
     * Returns the report if user has an OPEN report for this word, null otherwise
     * Requires authentication (USER or ADMIN role)
     *
     * @param wordId Dictionary word ID
     * @param authentication Current authentication (to get username)
     * @return ReportDTO if exists, null otherwise
     */
    @GetMapping("/reports/word/{wordId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<ReportDTO>> getOpenReportForWord(
            @PathVariable Long wordId,
            Authentication authentication) {
        try {
            var userPrincipal = (UserPrincipal) authentication.getPrincipal();
            var username = userPrincipal.getUsername();

            log.debug("Checking for OPEN report for user: {}, wordId: {}", username, wordId);
            var report = userFeatureService.getOpenReportForWord(wordId, username);

            if (report != null) {
                return ResponseEntity.ok(ApiResponse.success("Open report found", report));
            } else {
                return ResponseEntity.ok(ApiResponse.success("No open report found", null));
            }
        } catch (IllegalArgumentException e) {
            log.warn("Invalid request to get report for word: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to get report for word: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get report for word: " + e.getMessage()));
        }
    }
}

