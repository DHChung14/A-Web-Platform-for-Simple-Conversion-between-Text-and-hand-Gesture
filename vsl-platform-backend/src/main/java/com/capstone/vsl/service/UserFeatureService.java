package com.capstone.vsl.service;

import com.capstone.vsl.dto.ReportDTO;
import com.capstone.vsl.dto.SearchHistoryDTO;
import com.capstone.vsl.entity.Report;
import com.capstone.vsl.entity.ReportStatus;
import com.capstone.vsl.entity.SearchHistory;
import com.capstone.vsl.repository.DictionaryRepository;
import com.capstone.vsl.repository.ReportRepository;
import com.capstone.vsl.repository.SearchHistoryRepository;
import com.capstone.vsl.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * User Feature Service
 * Handles user interaction features:
 * - Search History logging
 * - Report creation
 * 
 * Important: All methods require authenticated users (no guest access)
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserFeatureService {

    private final SearchHistoryRepository searchHistoryRepository;
    private final ReportRepository reportRepository;
    private final UserRepository userRepository;
    private final DictionaryRepository dictionaryRepository;

    /**
     * Log search history
     * Important: If username is null or anonymous, DO NOTHING (return void).
     * Do not throw exception, just ignore.
     *
     * @param keyword Search keyword
     * @param dictionaryId Dictionary entry ID that was found
     * @param username Username of the user (null/empty for guests)
     */
    @Transactional
    public void logSearchHistory(String keyword, Long dictionaryId, String username) {
        // If username is null or anonymous, DO NOTHING (return void)
        if (username == null || username.trim().isEmpty() || username.equalsIgnoreCase("anonymous")) {
            log.debug("Skipping search history log for guest/anonymous user");
            return;
        }

        try {
            var user = userRepository.findByUsername(username)
                    .orElse(null);
            
            if (user == null) {
                log.debug("User not found for search history: {}", username);
                return;
            }

            var dictionary = dictionaryRepository.findById(dictionaryId)
                    .orElse(null);
            
            if (dictionary == null) {
                log.debug("Dictionary not found for search history: {}", dictionaryId);
                return;
            }

            var searchHistory = SearchHistory.builder()
                    .user(user)
                    .dictionary(dictionary)
                    .searchQuery(keyword)
                    .build();

            searchHistoryRepository.save(searchHistory);
            log.debug("Logged search history: user={}, keyword={}, dictionaryId={}", 
                    username, keyword, dictionaryId);

        } catch (Exception e) {
            // Silently handle errors - don't break the main flow
            log.warn("Failed to log search history: {}", e.getMessage());
        }
    }

    /**
     * Get user's search history
     *
     * @param username Username of the authenticated user
     * @return List of search history entries
     */
    @Transactional(readOnly = true)
    public List<SearchHistoryDTO> getUserSearchHistory(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        var history = searchHistoryRepository.findByUserOrderBySearchedAtDesc(user);
        log.debug("Retrieved {} search history entries for user: {}", history.size(), username);

        return history.stream()
                .map(this::searchHistoryToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Clear user's search history (delete all)
     *
     * @param username Username of the authenticated user
     */
    @Transactional
    public void clearUserSearchHistory(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        searchHistoryRepository.deleteByUser(user);
        log.info("Cleared all search history for user: {}", username);
    }

    /**
     * Delete selected search history entries by IDs
     * Security: Only deletes histories that belong to the authenticated user
     *
     * @param historyIds List of search history IDs to delete
     * @param username Username of the authenticated user
     * @return Number of deleted entries
     */
    @Transactional
    public int deleteSearchHistoryByIds(List<Long> historyIds, String username) {
        if (historyIds == null || historyIds.isEmpty()) {
            throw new IllegalArgumentException("History IDs list cannot be empty");
        }

        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        // Verify all histories belong to the user before deleting
        var histories = historyIds.stream()
                .map(id -> searchHistoryRepository.findByIdAndUser(id, user))
                .filter(java.util.Optional::isPresent)
                .map(java.util.Optional::get)
                .collect(Collectors.toList());

        if (histories.size() != historyIds.size()) {
            // Some IDs don't belong to this user or don't exist
            var foundIds = histories.stream()
                    .map(SearchHistory::getId)
                    .collect(Collectors.toSet());
            var notFoundIds = historyIds.stream()
                    .filter(id -> !foundIds.contains(id))
                    .collect(Collectors.toList());
            
            log.warn("Some history IDs not found or don't belong to user {}: {}", username, notFoundIds);
            throw new IllegalArgumentException(
                    "Some history entries not found or you don't have permission to delete them. " +
                    "Invalid IDs: " + notFoundIds
            );
        }

        // Delete all verified histories
        var idsToDelete = histories.stream()
                .map(SearchHistory::getId)
                .collect(Collectors.toList());
        
        searchHistoryRepository.deleteByIdInAndUser(idsToDelete, user);
        log.info("Deleted {} search history entries for user: {}", histories.size(), username);
        
        return histories.size();
    }

    /**
     * Create or update a report for a dictionary word
     * If user already has an OPEN report for this word, update it instead of creating a new one
     * This prevents spam reports for the same word
     *
     * @param wordId Dictionary word ID
     * @param reason Report reason
     * @param username Username of the authenticated user
     * @return Created or updated report DTO
     */
    @Transactional
    public ReportDTO createOrUpdateReport(Long wordId, String reason, String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        var dictionary = dictionaryRepository.findById(wordId)
                .orElseThrow(() -> new IllegalArgumentException("Dictionary word not found: " + wordId));

        // Check if user already has an OPEN report for this word
        var existingReport = reportRepository.findOpenReportByUserAndDictionary(user, wordId);
        
        if (existingReport.isPresent()) {
            // Update existing report instead of creating a new one
            var report = existingReport.get();
            report.setReason(reason);
            report = reportRepository.save(report);
            log.info("Updated existing report: user={}, wordId={}, reportId={}, reason={}", 
                    username, wordId, report.getId(), reason);
            return reportToDTO(report);
        }

        // Check limit: user can only have maximum 5 OPEN reports
        long openReportsCount = reportRepository.countOpenReportsByUser(user);
        if (openReportsCount >= 5) {
            throw new IllegalArgumentException(
                    "You have reached the maximum limit of 5 OPEN reports. " +
                    "Please wait for admin to resolve your existing reports before creating new ones. " +
                    "You can check the status of your reports in your profile."
            );
        }

        // Create new report if no OPEN report exists and limit not reached
        var report = Report.builder()
                .user(user)
                .dictionary(dictionary)
                .reason(reason)
                .status(ReportStatus.OPEN)
                .build();

        report = reportRepository.save(report);
        log.info("Created new report: user={}, wordId={}, reason={}, totalOpenReports={}", 
                username, wordId, reason, openReportsCount + 1);

        return reportToDTO(report);
    }

    /**
     * Update an existing report (for user to update their own report)
     *
     * @param reportId Report ID
     * @param reason New reason
     * @param username Username of the authenticated user (must be the owner)
     * @return Updated report DTO
     */
    @Transactional
    public ReportDTO updateReport(Long reportId, String reason, String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        var report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));

        // Verify that the user owns this report
        if (!report.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only update your own reports");
        }

        // Only allow updating OPEN reports
        if (report.getStatus() != ReportStatus.OPEN) {
            throw new IllegalArgumentException("You can only update OPEN reports. This report is already " + report.getStatus());
        }

        report.setReason(reason);
        report = reportRepository.save(report);
        log.info("Updated report: user={}, reportId={}, reason={}", username, reportId, reason);

        return reportToDTO(report);
    }

    /**
     * Convert SearchHistory entity to DTO
     */
    private SearchHistoryDTO searchHistoryToDTO(SearchHistory history) {
        return SearchHistoryDTO.builder()
                .id(history.getId())
                .dictionaryId(history.getDictionary().getId())
                .word(history.getDictionary().getWord())
                .searchQuery(history.getSearchQuery())
                .searchedAt(history.getSearchedAt())
                .build();
    }

    /**
     * Get reports created by a specific user (for "My Reports" view)
     *
     * @param username Username of the authenticated user
     * @return List of reports created by the user
     */
    @Transactional(readOnly = true)
    public List<ReportDTO> getUserReports(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        var reports = reportRepository.findByUserOrderByCreatedAtDesc(user);
        log.debug("Retrieved {} reports for user: {}", reports.size(), username);

        return reports.stream()
                .map(this::reportToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get count of OPEN reports for a user
     *
     * @param username Username of the authenticated user
     * @return Count of OPEN reports
     */
    @Transactional(readOnly = true)
    public long getOpenReportsCount(String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        return reportRepository.countOpenReportsByUser(user);
    }

    /**
     * Get OPEN report for a specific word by user
     * Returns null if user doesn't have an OPEN report for this word
     *
     * @param wordId Dictionary word ID
     * @param username Username of the authenticated user
     * @return ReportDTO if exists, null otherwise
     */
    @Transactional(readOnly = true)
    public ReportDTO getOpenReportForWord(Long wordId, String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        var existingReport = reportRepository.findOpenReportByUserAndDictionary(user, wordId);
        
        if (existingReport.isPresent()) {
            return reportToDTO(existingReport.get());
        }
        
        return null;
    }

    /**
     * Cancel a report (user can only cancel their own OPEN reports)
     *
     * @param reportId Report ID
     * @param username Username of the authenticated user (must be the owner)
     * @return Cancelled report DTO
     */
    @Transactional
    public ReportDTO cancelReport(Long reportId, String username) {
        var user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        var report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));

        // Verify that the user owns this report
        if (!report.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only cancel your own reports");
        }

        // Only allow cancelling OPEN reports
        if (report.getStatus() != ReportStatus.OPEN) {
            throw new IllegalArgumentException("You can only cancel OPEN reports. This report is already " + report.getStatus());
        }

        report.setStatus(ReportStatus.CANCELLED);
        report = reportRepository.save(report);
        log.info("Cancelled report: user={}, reportId={}", username, reportId);

        return reportToDTO(report);
    }

    /**
     * Convert Report entity to DTO
     */
    private ReportDTO reportToDTO(Report report) {
        return ReportDTO.builder()
                .id(report.getId())
                .dictionaryId(report.getDictionary().getId())
                .word(report.getDictionary().getWord())
                .reason(report.getReason())
                .status(report.getStatus())
                .createdAt(report.getCreatedAt())
                .updatedAt(report.getUpdatedAt())
                .build();
    }
}

