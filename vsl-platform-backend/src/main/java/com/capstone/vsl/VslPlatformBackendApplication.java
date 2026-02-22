package com.capstone.vsl;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchDataAutoConfiguration;
import org.springframework.boot.autoconfigure.data.elasticsearch.ElasticsearchRepositoriesAutoConfiguration;
import org.springframework.boot.autoconfigure.elasticsearch.ElasticsearchClientAutoConfiguration;

@SpringBootApplication
public class VslPlatformBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(VslPlatformBackendApplication.class, args);
	}

}
