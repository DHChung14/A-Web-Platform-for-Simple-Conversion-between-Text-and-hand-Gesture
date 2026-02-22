package com.capstone.vsl.service;

import com.capstone.vsl.document.DictionaryDocument;
import com.capstone.vsl.dto.DictionaryDTO;
import com.capstone.vsl.entity.Dictionary;
import com.capstone.vsl.repository.DictionaryRepository;
import com.capstone.vsl.repository.DictionarySearchRepository;
import com.capstone.vsl.repository.ReportRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Dictionary Service
 * Handles dictionary operations with dual-write pattern:
 * - Primary: PostgreSQL (source of truth)
 * - Secondary: Elasticsearch (for fast fuzzy search)
 * 
 * Dual-Write Strategy:
 * 1. Write to PostgreSQL first (transactional)
 * 2. Sync to Elasticsearch asynchronously (non-blocking)
 * 3. Mark sync status in PostgreSQL
 */
@Service
@Slf4j
public class DictionaryService {

    private final DictionaryRepository dictionaryRepository;
    private final ReportRepository reportRepository;
    // Optional: Only available when Elasticsearch is enabled
    // For Free Tier deployment without Elasticsearch, this will be null
    private DictionarySearchRepository dictionarySearchRepository;

    // Constructor with required repositories
    @Autowired
    public DictionaryService(DictionaryRepository dictionaryRepository, ReportRepository reportRepository) {
        this.dictionaryRepository = dictionaryRepository;
        this.reportRepository = reportRepository;
        this.dictionarySearchRepository = null; // Will be set via setter if available
    }
    
    // Optional setter for Elasticsearch repository (only called if bean exists)
    @Autowired(required = false)
    public void setDictionarySearchRepository(DictionarySearchRepository dictionarySearchRepository) {
        this.dictionarySearchRepository = dictionarySearchRepository;
    }

    /**
     * Search dictionary entries
     * Strategy: Try Elasticsearch first, fallback to PostgreSQL if ES is down
     *
     * @param query Search query string
     * @return List of matching dictionary entries
     */
    @Transactional(readOnly = true)
    public List<DictionaryDTO> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return List.of();
        }

        // Try Elasticsearch first for fuzzy matching (if available)
        if (dictionarySearchRepository != null) {
            try {
                log.debug("Searching Elasticsearch for query: {}", query);
                List<DictionaryDocument> esResults;
                
                // For very short queries (1-2 chars), ONLY search in the 'word' field.
                // This prevents irrelevant matches where a common letter/word appears in the definition.
                // Example: searching "b" shouldn't return "NÓI CHUYỆN" just because definition has "bằng".
                if (query.trim().length() <= 2) {
                    log.debug("Short query detected (<= 2 chars), using word-only search");
                    esResults = dictionarySearchRepository.searchByWordOnly(query);
                } else {
                    esResults = dictionarySearchRepository.searchByQuery(query);
                }
                
                if (!esResults.isEmpty()) {
                    log.debug("Found {} results from Elasticsearch", esResults.size());
                    return esResults.stream()
                            .map(this::documentToDTO)
                            .collect(Collectors.toList());
                }
            } catch (Exception e) {
                log.warn("Elasticsearch search failed, falling back to PostgreSQL: {}", e.getMessage());
            }
        } else {
            log.debug("Elasticsearch not available, using PostgreSQL search");
        }

        // Fallback to PostgreSQL ILIKE search
        log.debug("Falling back to PostgreSQL search for query: {}", query);
        var pgResults = dictionaryRepository.searchByQuery(query.trim());
        log.debug("Found {} results from PostgreSQL", pgResults.size());
        
        return pgResults.stream()
                .map(this::entityToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get all dictionary words (for admin listing)
     * Returns all words from PostgreSQL
     *
     * @return List of all dictionary entries
     */
    @Transactional(readOnly = true)
    public List<DictionaryDTO> getAllWords() {
        log.debug("Getting all dictionary words");
        var results = dictionaryRepository.findAll();
        log.debug("Found {} words", results.size());
        
        return results.stream()
                .map(this::entityToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Create a new dictionary word
     * Dual-Write Pattern:
     * 1. Save to PostgreSQL (transactional, source of truth)
     * 2. Sync to Elasticsearch asynchronously (non-blocking)
     *
     * @param dto Dictionary data transfer object
     * @return Created dictionary DTO
     */
    @Transactional
    public DictionaryDTO createWord(DictionaryDTO dto) {
        // Check if word already exists
        if (dictionaryRepository.existsByWordIgnoreCase(dto.getWord())) {
            throw new IllegalArgumentException("Word already exists: " + dto.getWord());
        }

        // 1. Save to PostgreSQL (Primary - Source of Truth)
        // Handle null videoUrl - set to empty string if null (video URL is optional)
        var dictionary = Dictionary.builder()
                .word(dto.getWord())
                .definition(dto.getDefinition())
                .videoUrl(dto.getVideoUrl() != null ? dto.getVideoUrl() : "") // Default to empty string if null
                .elasticSynced(false) // Will be updated after ES sync
                .build();

        dictionary = dictionaryRepository.save(dictionary);
        log.info("Saved dictionary word to PostgreSQL: {}", dictionary.getWord());

        // 2. Sync to Elasticsearch asynchronously (Secondary - Non-blocking)
        syncToElasticsearch(dictionary);

        return entityToDTO(dictionary);
    }

    /**
     * Get dictionary word by ID
     */
    @Transactional(readOnly = true)
    public DictionaryDTO getWordById(Long id) {
        var dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dictionary word not found: " + id));
        return entityToDTO(dictionary);
    }

    /**
     * Get a random dictionary word (for Word of the Day, etc.)
     */
    @Transactional(readOnly = true)
    public DictionaryDTO getRandomWord() {
        var dictionary = dictionaryRepository.findRandom()
                .orElseThrow(() -> new IllegalArgumentException("No dictionary entries available"));
        return entityToDTO(dictionary);
    }

    /**
     * Get multiple random dictionary words
     * @param count Number of random words to return
     * @return List of random dictionary DTOs
     */
    @Transactional(readOnly = true)
    public List<DictionaryDTO> getRandomWords(int count) {
        if (count <= 0) {
            throw new IllegalArgumentException("Count must be greater than 0");
        }
        
        var dictionaries = dictionaryRepository.findRandomWords(count);
        log.debug("Retrieved {} random dictionary words", dictionaries.size());
        
        return dictionaries.stream()
                .map(this::entityToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Get total count of dictionary words
     * @return Total number of words in the dictionary
     */
    @Transactional(readOnly = true)
    public long getTotalCount() {
        return dictionaryRepository.count();
    }

    /**
     * Update an existing dictionary word
     * 1. Update in PostgreSQL
     * 2. Sync updated document to Elasticsearch
     *
     * @param id  Dictionary ID
     * @param dto New dictionary data
     * @return Updated dictionary DTO
     */
    @Transactional
    public DictionaryDTO updateWord(Long id, DictionaryDTO dto) {
        var dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dictionary word not found: " + id));

        dictionary.setWord(dto.getWord());
        dictionary.setDefinition(dto.getDefinition());
        dictionary.setVideoUrl(dto.getVideoUrl());
        dictionary.setElasticSynced(false);

        dictionary = dictionaryRepository.save(dictionary);
        log.info("Updated dictionary word in PostgreSQL: {} (id={})", dictionary.getWord(), dictionary.getId());

        syncToElasticsearch(dictionary);
        return entityToDTO(dictionary);
    }

    /**
     * Delete a dictionary word
     * 1. Delete related Reports (foreign key constraint)
     * 2. Delete from Elasticsearch
     * 3. Delete from PostgreSQL (cascade will handle SearchHistory and UserFavorite)
     *
     * @param id Dictionary ID
     */
    @Transactional
    public void deleteWord(Long id) {
        var dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dictionary word not found: " + id));

        // Delete related Reports first (to avoid foreign key constraint violation)
        // Note: Reports are not cascade-deleted, so we need to delete them manually
        try {
            var reports = reportRepository.findByDictionary(dictionary);
            if (!reports.isEmpty()) {
                reportRepository.deleteAll(reports);
                log.info("Deleted {} report(s) related to dictionary word id={}", reports.size(), dictionary.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to delete reports for dictionary word {}: {}", dictionary.getId(), e.getMessage());
            // Continue with deletion even if report deletion fails
        }

        if (dictionarySearchRepository != null) {
            try {
                dictionarySearchRepository.deleteById(dictionary.getId());
                log.info("Deleted dictionary word from Elasticsearch: id={}", dictionary.getId());
            } catch (Exception e) {
                log.warn("Failed to delete dictionary word {} from Elasticsearch: {}", dictionary.getId(), e.getMessage());
            }
        } else {
            log.debug("Elasticsearch not available, skipping delete from Elasticsearch");
        }

        dictionaryRepository.delete(dictionary);
        log.info("Deleted dictionary word from PostgreSQL: id={}", dictionary.getId());
    }

    /**
     * Asynchronously sync dictionary entry to Elasticsearch
     * This method runs in a separate thread pool and does not block the main transaction
     *
     * @param dictionary Dictionary entity to sync
     */
    @Async("elasticsearchSyncExecutor")
    public void syncToElasticsearch(Dictionary dictionary) {
        if (dictionarySearchRepository == null) {
            log.debug("Elasticsearch not available, skipping sync for word: {}", dictionary.getWord());
            return;
        }
        
        try {
            var document = DictionaryDocument.builder()
                    .id(dictionary.getId())
                    .word(dictionary.getWord())
                    .definition(dictionary.getDefinition())
                    .videoUrl(dictionary.getVideoUrl())
                    .elasticSynced(true)
                    .build();

            dictionarySearchRepository.save(document);
            log.info("Synced dictionary word to Elasticsearch: {}", dictionary.getWord());

            // Update sync status in PostgreSQL
            dictionary.setElasticSynced(true);
            dictionaryRepository.save(dictionary);

        } catch (Exception e) {
            log.error("Failed to sync dictionary to Elasticsearch (id: {}): {}", 
                    dictionary.getId(), e.getMessage());
            // Note: We don't throw exception here to avoid breaking the main flow
            // The sync can be retried later if needed
        }
    }

    /**
     * Sync all dictionary words to Elasticsearch
     * Useful for initial data migration or re-indexing
     */
    @Async("elasticsearchSyncExecutor")
    public void syncAllToElasticsearch() {
        if (dictionarySearchRepository == null) {
            log.warn("Elasticsearch not available, skipping full sync");
            return;
        }

        log.info("Starting full sync to Elasticsearch...");
        try {
            long count = dictionaryRepository.count();
            log.info("Found {} words in PostgreSQL to sync", count);

            int pageSize = 1000;
            for (int i = 0; i < count; i += pageSize) {
                // Fetch batch from DB
                // Note: using simple pagination here. For huge datasets, key-set pagination is better.
                // But for dictionary (tens of thousands), this is fine.
                // We use stream or separate query to avoid memory issues if possible, 
                // but standard findAll(Pageable) is easiest.
                
                // For simplicity in this codebase, let's just fetch all (if not huge) 
                // or use simple chunks. Given strict time, let's load all if < 50k, 
                // else chunks. Assuming < 50k words for now.
                
                var allWords = dictionaryRepository.findAll(); 
                // Optimizing: Convert to Documents
                var documents = allWords.stream()
                        .map(entity -> DictionaryDocument.builder()
                                .id(entity.getId())
                                .word(entity.getWord())
                                .definition(entity.getDefinition())
                                .videoUrl(entity.getVideoUrl())
                                .elasticSynced(true)
                                .build())
                        .collect(Collectors.toList());
                
                dictionarySearchRepository.saveAll(documents);
                
                // Update synced status in DB
                allWords.forEach(w -> w.setElasticSynced(true));
                dictionaryRepository.saveAll(allWords);
                
                log.info("Synced {} words to Elasticsearch", documents.size());
                break; // Since we loaded ALL, we break. Use loop if using pagination.
            }
            
            log.info("Full sync to Elasticsearch completed successfully");

        } catch (Exception e) {
            log.error("Failed to sync all words to Elasticsearch: {}", e.getMessage(), e);
        }
    }

    /**
     * Convert Dictionary entity to DTO
     */
    private DictionaryDTO entityToDTO(Dictionary entity) {
        return DictionaryDTO.builder()
                .id(entity.getId())
                .word(entity.getWord())
                .definition(entity.getDefinition())
                .videoUrl(entity.getVideoUrl())
                .elasticSynced(entity.getElasticSynced())
                .build();
    }

    /**
     * Convert DictionaryDocument to DTO
     */
    private DictionaryDTO documentToDTO(DictionaryDocument document) {
        return DictionaryDTO.builder()
                .id(document.getId())
                .word(document.getWord())
                .definition(document.getDefinition())
                .videoUrl(document.getVideoUrl())
                .elasticSynced(document.getElasticSynced())
                .build();
    }
}

