# Multi-stage Dockerfile for Spring Boot 3.3 (Java 21)
# Optimized for Ubuntu Linux

# ==================== Build Stage ====================
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /app

# Copy pom.xml and download dependencies (cached layer)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source code and build
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==================== Run Stage ====================
FROM eclipse-temurin:21-jre-alpine

# Install tzdata, wget, and curl for timezone support and healthcheck
RUN apk add --no-cache tzdata wget curl && \
    cp /usr/share/zoneinfo/Asia/Ho_Chi_Minh /etc/localtime && \
    echo "Asia/Ho_Chi_Minh" > /etc/timezone && \
    apk del tzdata

# Set timezone environment variable
ENV TZ=Asia/Ho_Chi_Minh

# Create app user (non-root for security)
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

WORKDIR /app

# Copy jar from build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port
EXPOSE 8080
# Health check (uses GET-compatible endpoint that's always public)
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/dictionary/search?keyword= || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]

