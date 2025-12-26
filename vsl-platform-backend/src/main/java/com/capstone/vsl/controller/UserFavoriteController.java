package com.capstone.vsl.controller;

import com.capstone.vsl.dto.ApiResponse;
import com.capstone.vsl.dto.FavoriteDTO;
import com.capstone.vsl.security.UserPrincipal;
import com.capstone.vsl.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Controller exposing endpoints for managing user favorites.
 */
@RestController
@RequestMapping("/api/user/favorites")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("isAuthenticated()")
public class UserFavoriteController {

    private final FavoriteService favoriteService;

    @PostMapping("/{wordId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> toggleFavorite(
            @PathVariable Long wordId,
            Authentication authentication) {
        try {
            var username = extractUsername(authentication);
            var added = favoriteService.toggleFavorite(wordId, username);
            var message = added ? "Favorite added successfully" : "Favorite removed successfully";

            var payload = Map.<String, Object>of(
                    "wordId", wordId,
                    "isFavorite", added
            );

            return ResponseEntity.ok(ApiResponse.success(message, payload));
        } catch (IllegalArgumentException e) {
            log.warn("Favorite toggle failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error while toggling favorite", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to toggle favorite: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<ApiResponse<java.util.List<FavoriteDTO>>> getFavorites(
            Authentication authentication,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        try {
            var username = extractUsername(authentication);
            var favoritesPage = favoriteService.getFavorites(username, page, size);
            var favoritesList = favoritesPage.getContent();
            return ResponseEntity.ok(ApiResponse.success("Favorites retrieved", favoritesList));
        } catch (IllegalArgumentException e) {
            log.warn("Failed to fetch favorites: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error while retrieving favorites", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to retrieve favorites: " + e.getMessage()));
        }
    }

    @GetMapping("/check/{wordId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> checkFavoriteStatus(
            @PathVariable Long wordId,
            Authentication authentication) {
        try {
            var username = extractUsername(authentication);
            var isFavorite = favoriteService.checkStatus(wordId, username);
            var payload = Map.<String, Object>of(
                    "wordId", wordId,
                    "isFavorite", isFavorite
            );
            return ResponseEntity.ok(ApiResponse.success("Status retrieved", payload));
        } catch (IllegalArgumentException e) {
            log.warn("Failed to check favorite status: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error while checking favorite status", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to check favorite status: " + e.getMessage()));
        }
    }

    private String extractUsername(Authentication authentication) {
        var userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return userPrincipal.getUsername();
    }
}

