package com.capstone.vsl.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.elasticsearch.repository.config.EnableElasticsearchRepositories;

/**
 * Elasticsearch Configuration Documentation
 * 
 * The Vietnamese analyzer configuration should be set up in Elasticsearch
 * using the following settings (can be done via Kibana or Elasticsearch API):
 * 
 * PUT /dictionary
 * {
 *   "settings": {
 *     "analysis": {
 *       "analyzer": {
 *         "vietnamese_analyzer": {
 *           "type": "custom",
 *           "tokenizer": "standard",
 *           "filter": [
 *             "lowercase",
 *             "icu_folding"
 *           ]
 *         }
 *       }
 *     }
 *   },
 *   "mappings": {
 *     "properties": {
 *       "id": { "type": "long" },
 *       "word": {
 *         "type": "text",
 *         "analyzer": "vietnamese_analyzer",
 *         "search_analyzer": "vietnamese_analyzer"
 *       },
 *       "definition": {
 *         "type": "text",
 *         "analyzer": "vietnamese_analyzer",
 *         "search_analyzer": "vietnamese_analyzer"
 *       },
 *       "videoUrl": { "type": "keyword" },
 *       "elasticSynced": { "type": "boolean" }
 *     }
 *   }
 * }
 * 
 * Note: Spring Boot 3.3+ uses application.properties for Elasticsearch connection.
 * The Vietnamese analyzer setup is done at the Elasticsearch cluster level.
 * 
 * IMPORTANT: This configuration is only enabled when spring.elasticsearch.uris is set and not empty.
 * For Free Tier deployment without Elasticsearch, leave spring.elasticsearch.uris empty or unset.
 */
/**
 * Elasticsearch Configuration
 * 
 * NOTE: For Free Tier deployment without Elasticsearch, this configuration is disabled.
 * Comment out @EnableElasticsearchRepositories to disable Elasticsearch completely.
 * 
 * To enable Elasticsearch:
 * 1. Uncomment @EnableElasticsearchRepositories
 * 2. Set spring.elasticsearch.uris in application.properties or environment variable
 * 3. Ensure Elasticsearch service is running
 */
@Configuration
@ConditionalOnProperty(
    name = "spring.elasticsearch.uris",
    matchIfMissing = false
)
@EnableElasticsearchRepositories(basePackages = "com.capstone.vsl.repository")
@Slf4j
public class ElasticsearchConfig {
    // Configuration is handled via application.properties
    // Vietnamese analyzer setup is done at Elasticsearch cluster level
    // This config is only enabled when spring.elasticsearch.uris is provided and not empty
}

