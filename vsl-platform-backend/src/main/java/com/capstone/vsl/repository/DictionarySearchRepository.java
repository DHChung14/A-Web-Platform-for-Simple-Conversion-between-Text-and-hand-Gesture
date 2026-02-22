package com.capstone.vsl.repository;

import com.capstone.vsl.document.DictionaryDocument;
import org.springframework.data.elasticsearch.annotations.Query;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DictionarySearchRepository extends ElasticsearchRepository<DictionaryDocument, Long> {
    
    /**
     * Advanced Vietnamese Dictionary Search
     * Prioritizes results in this order:
     * 1. Exact match or Phrase match on WORD (Highest relevance)
     * 2. Starts with query on WORD (High relevance)
     * 3. Contains query on WORD (Medium relevance)
     * 4. Fuzzy match on DEFINITION (Low relevance)
     */
    @Query("{\"bool\": {\"should\": [" +
           "  {\"multi_match\": {\"query\": \"?0\", \"fields\": [\"word^10\"], \"type\": \"phrase\"}}," +
           "  {\"multi_match\": {\"query\": \"?0\", \"fields\": [\"word^5\"], \"type\": \"phrase_prefix\"}}," +
           "  {\"query_string\": {\"query\": \"*?0*\", \"fields\": [\"word^2\"], \"analyze_wildcard\": true}}," +
           "  {\"multi_match\": {\"query\": \"?0\", \"fields\": [\"definition\"], \"fuzziness\": \"AUTO\"}}" +
           "], \"minimum_should_match\": 1}}")
    List<DictionaryDocument> searchByQuery(String query);

    /**
     * Search ONLY in word field (for short queries)
     * Excludes definition search to avoid noise
     */
    @Query("{\"bool\": {\"should\": [" +
           "  {\"multi_match\": {\"query\": \"?0\", \"fields\": [\"word^10\"], \"type\": \"phrase\"}}," +
           "  {\"multi_match\": {\"query\": \"?0\", \"fields\": [\"word^5\"], \"type\": \"phrase_prefix\"}}," +
           "  {\"query_string\": {\"query\": \"*?0*\", \"fields\": [\"word^2\"], \"analyze_wildcard\": true}}" +
           "], \"minimum_should_match\": 1}}")
    List<DictionaryDocument> searchByWordOnly(String query);
}

