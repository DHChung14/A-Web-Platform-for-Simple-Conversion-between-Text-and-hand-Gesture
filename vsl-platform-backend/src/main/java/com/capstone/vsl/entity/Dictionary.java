package com.capstone.vsl.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "dictionary")
@Data
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class Dictionary extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String word;

    @Column(columnDefinition = "TEXT")
    private String definition;

    @Column(name = "video_url", nullable = true) // Changed to nullable - video URL is optional
    private String videoUrl;

    @Column(name = "elastic_synced", nullable = false)
    @Builder.Default
    private Boolean elasticSynced = false;

    @OneToMany(mappedBy = "dictionary", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<SearchHistory> searchHistories = new ArrayList<>();

    @OneToMany(mappedBy = "dictionary", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<UserFavorite> favorites = new ArrayList<>();
}

