package com.capstone.vsl.controller;

import com.capstone.vsl.dto.ApiResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

/**
 * File Upload Controller
 * Handles video file uploads for contributions
 */
@RestController
@RequestMapping("/api/upload")
@RequiredArgsConstructor
@Slf4j
public class FileUploadController {

    @Value("${file.upload-dir:/app/uploads/videos}")
    private String uploadDir;

    @Value("${server.port:8081}")
    private String serverPort;

    @Value("${server.servlet.context-path:}")
    private String contextPath;

    /**
     * POST /api/upload/video
     * Upload a video file for contribution
     * Requires authentication
     *
     * @param file Video file to upload
     * @return URL of uploaded video
     */
    @PostMapping("/video")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<String>> uploadVideo(@RequestParam("file") MultipartFile file) {
        try {
            if (file == null || file.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("Video file is required"));
            }

            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || !contentType.startsWith("video/")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("File must be a video"));
            }

            // Validate file size (50MB max)
            if (file.getSize() > 50 * 1024 * 1024) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(ApiResponse.error("File size must be less than 50MB"));
            }

            // Create upload directory if it doesn't exist
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate unique filename
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String filename = UUID.randomUUID().toString() + extension;
            Path filePath = uploadPath.resolve(filename);

            // Save file
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            log.info("Video file uploaded: {}", filename);

            // Generate URL - Use environment variable or construct from request
            String baseUrl = System.getenv("API_BASE_URL");
            if (baseUrl == null || baseUrl.trim().isEmpty()) {
                // Default to localhost for development
                baseUrl = "http://localhost:" + serverPort;
            }
            if (!contextPath.isEmpty()) {
                baseUrl += contextPath;
            }
            String videoUrl = baseUrl + "/uploads/videos/" + filename;

            return ResponseEntity.ok(
                    ApiResponse.success("Video uploaded successfully", videoUrl)
            );

        } catch (IOException e) {
            log.error("Failed to upload video: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to upload video: " + e.getMessage()));
        } catch (Exception e) {
            log.error("Unexpected error uploading video: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.error("Failed to upload video: " + e.getMessage()));
        }
    }
}
