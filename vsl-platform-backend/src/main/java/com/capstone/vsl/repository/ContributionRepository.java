package com.capstone.vsl.repository;

import com.capstone.vsl.entity.Contribution;
import com.capstone.vsl.entity.ContributionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContributionRepository extends JpaRepository<Contribution, Long> {

    List<Contribution> findByStatus(ContributionStatus status);

    long countByStatus(ContributionStatus status);

    Optional<Contribution> findByIdAndStatus(Long id, ContributionStatus status);

    /**
     * Get contributions of a specific user ordered by creation time (newest first).
     */
    List<Contribution> findByUserUsernameOrderByCreatedAtDesc(String username);
    
    /**
     * Count PENDING contributions by user
     * Used to enforce limit of 5 PENDING contributions per user
     */
    @Query("SELECT COUNT(c) FROM Contribution c WHERE c.user.username = :username AND c.status = 'PENDING'")
    long countPendingContributionsByUser(String username);
}

