package com.capstone.vsl.repository;

import com.capstone.vsl.entity.Dictionary;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DictionaryRepository extends JpaRepository<Dictionary, Long> {

    Optional<Dictionary> findByWordIgnoreCase(String word);

    boolean existsByWordIgnoreCase(String word);

    /**
     * Search using PostgreSQL ILIKE (case-insensitive pattern matching)
     * Fallback when Elasticsearch is unavailable
     */
    @Query("SELECT d FROM Dictionary d WHERE " +
           "LOWER(d.word) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.definition) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Dictionary> searchByQuery(@Param("query") String query);

    /**
     * Get a random dictionary entry (PostgreSQL specific).
     */
    @Query(value = "SELECT * FROM dictionary ORDER BY RANDOM() LIMIT 1", nativeQuery = true)
    Optional<Dictionary> findRandom();

    /**
     * Get multiple random dictionary entries (PostgreSQL specific).
     * @param limit Number of random entries to return
     */
    @Query(value = "SELECT * FROM dictionary ORDER BY RANDOM() LIMIT :limit", nativeQuery = true)
    List<Dictionary> findRandomWords(@Param("limit") int limit);
}

