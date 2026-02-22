package com.capstone.vsl.repository;

import com.capstone.vsl.entity.Report;
import com.capstone.vsl.entity.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReportRepository extends JpaRepository<Report, Long> {
    
    List<Report> findByStatus(ReportStatus status);
    
    Page<Report> findByStatus(ReportStatus status, Pageable pageable);
    
    Page<Report> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    List<Report> findByUserOrderByCreatedAtDesc(com.capstone.vsl.entity.User user);
    
    @Query("SELECT COUNT(r) FROM Report r WHERE r.status = :status")
    long countByStatus(ReportStatus status);
    
    /**
     * Find an OPEN report by user and dictionary word
     * Used to prevent duplicate reports for the same word
     */
    @Query("SELECT r FROM Report r WHERE r.user = :user AND r.dictionary.id = :dictionaryId AND r.status = 'OPEN'")
    java.util.Optional<Report> findOpenReportByUserAndDictionary(
            com.capstone.vsl.entity.User user, 
            Long dictionaryId
    );
    
    /**
     * Count OPEN reports by user
     * Used to enforce limit of 5 OPEN reports per user
     */
    @Query("SELECT COUNT(r) FROM Report r WHERE r.user = :user AND r.status = 'OPEN'")
    long countOpenReportsByUser(com.capstone.vsl.entity.User user);
    
    /**
     * Find all reports for a dictionary word
     * Used when deleting a dictionary word to clean up related reports
     */
    List<Report> findByDictionary(com.capstone.vsl.entity.Dictionary dictionary);
}

