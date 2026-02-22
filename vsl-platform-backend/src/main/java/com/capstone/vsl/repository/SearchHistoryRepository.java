package com.capstone.vsl.repository;

import com.capstone.vsl.entity.SearchHistory;
import com.capstone.vsl.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SearchHistoryRepository extends JpaRepository<SearchHistory, Long> {

    List<SearchHistory> findByUserOrderBySearchedAtDesc(User user);

    List<SearchHistory> findByUserOrderBySearchedAtDesc(User user, org.springframework.data.domain.Pageable pageable);

    void deleteByUser(User user);

    /**
     * Find search history by ID and User (for security: ensure user owns the history)
     */
    java.util.Optional<SearchHistory> findByIdAndUser(Long id, User user);

    /**
     * Delete search history entries by IDs and User (for security: ensure user owns the histories)
     */
    void deleteByIdInAndUser(List<Long> ids, User user);
}

