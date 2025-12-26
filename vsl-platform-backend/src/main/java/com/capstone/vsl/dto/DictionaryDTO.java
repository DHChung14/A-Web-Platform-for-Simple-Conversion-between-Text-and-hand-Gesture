package com.capstone.vsl.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DictionaryDTO {
    
    private Long id;
    
    @NotBlank(message = "Word is required")
    private String word;
    
    private String definition;
    
    // Video URL is optional - not all words have video tutorials
    private String videoUrl;
    
    private Boolean elasticSynced;
}

