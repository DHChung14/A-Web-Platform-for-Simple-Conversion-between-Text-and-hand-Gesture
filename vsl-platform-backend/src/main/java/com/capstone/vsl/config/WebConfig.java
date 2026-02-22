package com.capstone.vsl.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Web Configuration
 * Configure static resource serving for uploaded files
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:uploads/videos}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Serve uploaded videos at /uploads/videos/**
        String uploadPath = Paths.get(uploadDir).toAbsolutePath().toString();
        registry.addResourceHandler("/uploads/videos/**")
                .addResourceLocations("file:" + uploadPath + "/");
    }
}
