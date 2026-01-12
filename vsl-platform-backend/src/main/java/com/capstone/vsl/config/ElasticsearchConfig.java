package com.capstone.vsl.config;

import lombok.extern.slf4j.Slf4j;
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
 */
@Configuration
@EnableElasticsearchRepositories(basePackages = "com.capstone.vsl.repository")
@Slf4j
public class ElasticsearchConfig {
    // Configuration is handled via application.properties
    // Vietnamese analyzer setup is done at Elasticsearch cluster level
}

