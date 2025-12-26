package com.capstone.vsl.service;

import com.capstone.vsl.document.DictionaryDocument;
import com.capstone.vsl.dto.DictionaryDTO;
import com.capstone.vsl.entity.Dictionary;
import com.capstone.vsl.repository.DictionaryRepository;
import com.capstone.vsl.repository.DictionarySearchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
@RequiredArgsConstructor
@Slf4j
public class DictionaryService {

    private final DictionaryRepository dictionaryRepository;
    private final DictionarySearchRepository dictionarySearchRepository;

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

        // Try Elasticsearch first for fuzzy matching
        try {
            log.debug("Searching Elasticsearch for query: {}", query);
            var esResults = dictionarySearchRepository
                    .findByWordContainingIgnoreCaseOrDefinitionContainingIgnoreCase(query, query);
            
            if (!esResults.isEmpty()) {
                log.debug("Found {} results from Elasticsearch", esResults.size());
                return esResults.stream()
                        .map(this::documentToDTO)
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            log.warn("Elasticsearch search failed, falling back to PostgreSQL: {}", e.getMessage());
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
        var dictionary = Dictionary.builder()
                .word(dto.getWord())
                .definition(dto.getDefinition())
                .videoUrl(dto.getVideoUrl())
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
     * 1. Delete from Elasticsearch
     * 2. Delete from PostgreSQL
     *
     * @param id Dictionary ID
     */
    @Transactional
    public void deleteWord(Long id) {
        var dictionary = dictionaryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Dictionary word not found: " + id));

        try {
            dictionarySearchRepository.deleteById(dictionary.getId());
            log.info("Deleted dictionary word from Elasticsearch: id={}", dictionary.getId());
        } catch (Exception e) {
            log.warn("Failed to delete dictionary word {} from Elasticsearch: {}", dictionary.getId(), e.getMessage());
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

