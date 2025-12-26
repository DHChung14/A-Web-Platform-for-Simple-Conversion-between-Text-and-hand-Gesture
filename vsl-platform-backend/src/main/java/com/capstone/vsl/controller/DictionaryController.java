package com.capstone.vsl.controller;

import com.capstone.vsl.dto.ApiResponse;
import com.capstone.vsl.dto.DictionaryDTO;
import com.capstone.vsl.service.DictionaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Dictionary Controller
 * Handles dictionary search and management endpoints
 */
@RestController
@RequestMapping("/api/dictionary")
@RequiredArgsConstructor
@Slf4j
public class DictionaryController {

    private final DictionaryService dictionaryService;

    /**
     * GET /api/dictionary/search
     * Public endpoint for searching dictionary entries
     * Uses Elasticsearch for fuzzy matching, falls back to PostgreSQL if ES is unavailable
     *
     * @param query Search query string
     * @return List of matching dictionary entries
     */
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<DictionaryDTO>>> search(
            @RequestParam(required = false) String query) {
        try {
            if (query == null || query.trim().isEmpty()) {
                return ResponseEntity.ok(ApiResponse.success("Please provide a search query", List.of()));
            }

            var results = dictionaryService.search(query.trim());
            return ResponseEntity.ok(ApiResponse.success(
                    String.format("Found %d result(s)", results.size()),
                    results
            ));
        } catch (Exception e) {
            log.error("Search failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Search failed: " + e.getMessage()));
        }
    }

    /**
     * GET /api/dictionary/list
     * Get all dictionary entries (for admin listing)
     * No pagination, returns all entries
     */
    @GetMapping("/list")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<DictionaryDTO>>> getAll() {
        try {
            var results = dictionaryService.getAllWords();
            return ResponseEntity.ok(ApiResponse.success(
                    String.format("Found %d word(s)", results.size()),
                    results
            ));
        } catch (Exception e) {
            log.error("Failed to get all dictionary words: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get all dictionary words: " + e.getMessage()));
        }
    }

    /**
     * GET /api/dictionary/{id}
     * Get detailed dictionary entry by ID (public)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<DictionaryDTO>> getById(@PathVariable Long id) {
        try {
            var dto = dictionaryService.getWordById(id);
            return ResponseEntity.ok(ApiResponse.success("Dictionary word retrieved", dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to get dictionary word {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get dictionary word: " + e.getMessage()));
        }
    }

    /**
     * GET /api/dictionary/random
     * Get a random dictionary entry (public)
     */
    @GetMapping("/random")
    public ResponseEntity<ApiResponse<DictionaryDTO>> getRandom() {
        try {
            var dto = dictionaryService.getRandomWord();
            return ResponseEntity.ok(ApiResponse.success("Random dictionary word", dto));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to get random dictionary word: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to get random dictionary word: " + e.getMessage()));
        }
    }

    /**
     * POST /api/dictionary
     * Create a new dictionary word (requires ADMIN role)
     * 
     * Note: Regular users should use POST /api/user/contributions to submit words for review.
     * This endpoint is for admins to directly create dictionary entries.
     * 
     * Implements dual-write: PostgreSQL first, then async sync to Elasticsearch
     *
     * @param dto Dictionary data
     * @return Created dictionary entry
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DictionaryDTO>> createWord(@RequestBody DictionaryDTO dto) {
        try {
            var created = dictionaryService.createWord(dto);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("Dictionary word created successfully", created));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to create dictionary word: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to create dictionary word: " + e.getMessage()));
        }
    }

    /**
     * PUT /api/admin/dictionary/{id}
     * Update an existing dictionary word (ADMIN only)
     */
    @PutMapping("/admin/dictionary/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<DictionaryDTO>> updateWord(
            @PathVariable Long id,
            @RequestBody DictionaryDTO dto) {
        try {
            var updated = dictionaryService.updateWord(id, dto);
            return ResponseEntity.ok(
                    ApiResponse.success("Dictionary word updated successfully", updated)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to update dictionary word {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to update dictionary word: " + e.getMessage()));
        }
    }

    /**
     * DELETE /api/admin/dictionary/{id}
     * Delete an existing dictionary word (ADMIN only)
     */
    @DeleteMapping("/admin/dictionary/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> deleteWord(@PathVariable Long id) {
        try {
            dictionaryService.deleteWord(id);
            return ResponseEntity.ok(
                    ApiResponse.success("Dictionary word deleted successfully", "OK")
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Failed to delete dictionary word {}: {}", id, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to delete dictionary word: " + e.getMessage()));
        }
    }
}

