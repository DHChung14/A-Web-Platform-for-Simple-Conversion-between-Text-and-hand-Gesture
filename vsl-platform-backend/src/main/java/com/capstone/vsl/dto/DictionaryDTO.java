package com.capstone.vsl.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
    @Size(max = 100, message = "Word must not exceed 100 characters")
    private String word;
    
    @Size(max = 2000, message = "Definition must not exceed 2000 characters")
    private String definition;
    
    // Video URL is optional - not all words have video tutorials
    @Size(max = 500, message = "Video URL must not exceed 500 characters")
    @Pattern(
        regexp = "^(https?://|/).*|^$",
        message = "Video URL must be a valid HTTP/HTTPS URL, relative path, or empty"
    )
    private String videoUrl;
    
    private Boolean elasticSynced;
}

