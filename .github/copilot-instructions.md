# VSL Platform - AI Agent Instructions

## Project Overview

Vietnamese Sign Language (VSL) Platform: A full-stack application for gesture-to-text translation with dictionary management. **3-tier architecture**: Next.js frontend, Spring Boot backend (Java 21), and Python AI service (Flask).

**Monorepo Structure**:

- `vsl-platform-frontend/` - Next.js 16 (React 19.2) web UI
- `vsl-platform-backend/` - Spring Boot 3.3 (Java 21) API gateway with package `com.capstone.vsl`
- `vsl-platform-ai-model/` - Python Flask AI service (gesture recognition + accent restoration)
- `infrastructure/` - Terraform code for AWS deployment (EC2, RDS, Route 53)

**Docker Compose Location**: `vsl-platform-backend/docker-compose.yml` (defines all 5 services)

## 🚀 Quickstart - Thiết lập lần đầu

### Yêu cầu hệ thống

- **Docker Desktop** (recommended) hoặc Docker + Docker Compose
- **Java 21** (cho local development)
- **Node.js 18+** (cho frontend development)
- **Python 3.10-3.12** (cho AI service development)
- **Git** để clone repository
- **8GB RAM** tối thiểu (12GB+ recommended cho Docker)

### Bước 1: Clone Repository

```bash
git clone <repository-url> vsl-platform
cd vsl-platform
```

### Bước 2: Khởi động Full Stack với Docker (Recommended)

```bash
# Navigate to backend directory (contains docker-compose.yml)
cd vsl-platform-backend

# Start all services (postgres, elasticsearch, ai-service, backend, frontend)
docker-compose up -d --build

# Wait 2-3 minutes for all services to start
# Monitor startup progress
docker-compose logs -f

# Verify all services are healthy
docker-compose ps
```

**Access URLs:**

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8081/api
- **Swagger UI**: http://localhost:8081/swagger-ui.html
- **Elasticsearch**: http://localhost:9200

### Bước 3: Tạo tài khoản Admin đầu tiên

```bash
# Execute SQL in postgres container
docker exec -it vsl-postgres psql -U postgres -d vsl_db

# Create admin user
INSERT INTO users (username, email, password, role, created_at, updated_at)
VALUES ('admin', 'admin@vsl.com', '$2a$10$...bcrypt_hash...', 'ADMIN', NOW(), NOW());
```

**Hoặc** đăng ký qua UI và manually update role trong database:

```sql
UPDATE users SET role = 'ADMIN' WHERE username = 'your_username';
```

### Bước 4: Verify Setup

```bash
# Test Backend
curl http://localhost:8081/api/dictionary/search?keyword=

# Test AI Service
curl http://localhost:5000/health

# Test Elasticsearch
curl http://localhost:9200/_cluster/health
```

### Local Development (Non-Docker)

**Prerequisites:**

1. PostgreSQL 16 running on port 5433
2. Elasticsearch 8.11 running on port 9200
3. Python AI service running on port 5000

**Start Backend:**

```bash
cd vsl-platform-backend
./mvnw spring-boot:run
```

**Start Frontend:**

```bash
cd vsl-platform-frontend
npm install
npm run dev
```

**Start AI Service:**

```bash
cd vsl-platform-ai-model
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

## Architecture & Data Flow

### Service Communication Pattern

1. **Frontend (Next.js)** → Captures hand landmarks via MediaPipe → Sends to `/api/vsl/recognize`
2. **Backend (Spring Boot)** → Acts as gateway → Proxies to Python AI service → Returns Vietnamese text with diacritics
3. **Python AI Service** → Processes landmarks → Predicts gesture → Restores accents → Returns final text

**Critical**: Backend is a **stateless gateway**. All AI processing (gesture recognition + accent restoration) happens in Python service as a **single unified pipeline**.

### Docker Network Architecture (5 Services)

All services run in `vsl-network` (bridge mode) via docker-compose:

| Service           | Container Name    | Internal Port | Host Port  | Network Alias |
| ----------------- | ----------------- | ------------- | ---------- | ------------- |
| **postgres**      | vsl-postgres      | 5432          | 5433       | postgres      |
| **elasticsearch** | vsl-elasticsearch | 9200, 9300    | 9200, 9300 | elasticsearch |
| **ai-service**    | vsl-ai-service    | 5000          | 5000       | ai-service    |
| **backend**       | vsl-backend       | 8080          | 8081       | backend       |
| **frontend**      | vsl-frontend      | 3000          | 3000       | frontend      |

### Connection Patterns

**Container-to-Container (Internal):**

- Backend → PostgreSQL: `jdbc:postgresql://postgres:5432/vsl_db`
- Backend → Elasticsearch: `http://elasticsearch:9200`
- Backend → AI Service: `http://ai-service:5000/predict`
- Backend Health Check: `http://localhost:8080/api/auth/login` (internal port)

**Browser-to-Container (From Host):**

- Frontend (browser) → Backend: `http://host.docker.internal:8081/api`
  - **Critical**: Frontend uses `host.docker.internal` because client-side code runs in **browser**, not container
  - Set in Dockerfile: `NEXT_PUBLIC_API_URL=http://host.docker.internal:8081/api`
  - Requires `extra_hosts: - "host.docker.internal:host-gateway"` in docker-compose

**Local Development (Non-Docker):**

- Backend: `localhost:8081`
- PostgreSQL: `localhost:5433` (avoids conflicts with system Postgres)
- Frontend: `localhost:3000` → calls `localhost:8081`

## Authentication & Authorization

### JWT Flow

- **Token storage**: Frontend stores in `localStorage`, automatically attached via axios interceptor (`lib/api-client.ts`)
- **Token format**: `Bearer <JWT>` in `Authorization` header
- **Stateless**: No server-side sessions, JWT contains all user context
- **Auditing**: `BaseEntity` tracks `createdBy`/`updatedBy` via `AuditorAwareImpl` pulling username from `SecurityContext`

### RBAC Endpoints

- **Public**: `/api/auth/login`, `/api/auth/register`, `/api/vsl/recognize`, `/api/vsl/spell`, `/api/dictionary/search`
- **USER role**: `/api/user/favorites/**`, `/api/user/contributions/**`, `/api/user/profile/**`
- **ADMIN role**: `/api/admin/users/**`, `/api/admin/contributions/**`, `/api/dictionary` (POST)

**Pattern**: Controllers check roles via `@PreAuthorize("hasRole('ADMIN')")` or SecurityConfig rules. User entity `role` field is enum: `USER`, `ADMIN`.

## Database Patterns

### Dual-Write Pattern (Dictionary)

- **Create**: Write to PostgreSQL JPA → Async sync to Elasticsearch via `ElasticsearchSyncService`
- **Search**: Elasticsearch first (via `DictionaryDocument`), fallback to PostgreSQL if ES unavailable
- **Field**: `Dictionary.elasticSynced` tracks sync status

### Entity Relationships

- `Dictionary` extends `BaseEntity` → Auto-auditing (`createdBy`, `updatedBy`, timestamps)
- `UserFavorite`: Composite unique constraint on `(user_id, dictionary_id)` prevents duplicates
- `Contribution`: JSON field `stagingData` stores proposed changes before admin approval

## Backend Development (Spring Boot)

### Standard Response Wrapper

**Always** wrap responses in `ApiResponse<T>`:

```java
return ResponseEntity.ok(ApiResponse.success("Operation successful", dataObject));
return ResponseEntity.badRequest().body(ApiResponse.error("Error message"));
```

Never return raw POJOs. Frontend expects `{ code, message, data }` structure defined in `ApiResponse<T>`.

### Running Commands

**Docker Deployment (Recommended for Full Stack):**

```bash
# IMPORTANT: docker-compose.yml is in backend directory
cd vsl-platform-backend

# Build and start all 5 services
docker-compose up -d --build

# Service startup sequence (with health checks):
# 1. postgres (10-20s)
# 2. elasticsearch (30-60s)
# 3. ai-service (20-40s)
# 4. backend (40-60s, waits for DB + ES + AI)
# 5. frontend (40-60s, waits for backend)
# Total: ~2-3 minutes for first build

# View logs (real-time)
docker-compose logs -f backend
docker-compose logs -f ai-service
docker-compose logs -f postgres
docker-compose logs -f elasticsearch
docker-compose logs -f frontend

# Check all container status
docker-compose ps

# Stop all services (preserves data)
docker-compose down

# Stop and remove volumes (⚠️ DESTROYS DATA)
docker-compose down -v

# Restart specific service
docker-compose restart backend
docker-compose restart frontend

# Rebuild specific service
docker-compose up -d --build backend

# Check health endpoints
curl http://localhost:8081/api/auth/login      # Backend (host port)
curl http://localhost:9200/_cluster/health     # Elasticsearch
curl http://localhost:5000/health              # AI Service
curl http://localhost:3000                     # Frontend
```

**Local Development (Non-Docker):**

```bash
# Requires: Docker services (DB, ES) running + Python AI service
cd vsl-platform-backend
./mvnw clean install
./mvnw spring-boot:run  # Backend on 8081

# In another terminal
cd vsl-platform-frontend
npm run dev  # Frontend on 3000
```

### Rate Limiting

`RateLimitingFilter` uses Bucket4j (in-memory, per-IP, configured in `SecurityConfig`):

- `/api/vsl/recognize`: 10 req/sec (high-frequency gesture processing)
- `/api/auth/**`: 5 req/min (brute-force protection)
- Returns `429 Too Many Requests` on exceed

**Note**: Rate limits reset per-IP, no distributed cache in current implementation.

## Frontend Development

### State Management

- **Zustand** for auth state (`stores/auth-store.ts`) with `persist` middleware
- **React hooks** for local state
- No Redux (legacy `app/redux/` directory is unused)

### MediaPipe Integration

- `useHandTracking` hook manages HandLandmarker lifecycle
- Buffers 30 frames before sending to backend (see `BUFFER_SIZE` in `useHandTracking.ts`)
- Landmarks format: Array of 21 points, each `{x, y, z}`

### API Client Pattern

All backend calls use `apiClient` from `lib/api-client.ts`:

- Auto-attaches JWT from `localStorage`
- Auto-redirects to `/login` on 401
- Set `NEXT_PUBLIC_API_URL` env var for backend base URL

## Python AI Service

### Model Loading

- Models loaded once at startup in `load_models()` (Flask app.py)
- **Scaler**: `models/scaler.pkl` (StandardScaler for landmark normalization)
- **Classifier**: `models/model_mlp.pkl` (MLPClassifier for gesture prediction)

### Processing Pipeline

1. Validate landmarks (21 points × 3 coords = 63 features)
2. Scale features → Predict gesture → Get confidence
3. If confidence < `CONFIDENCE_THRESHOLD` (0.7), reject
4. Restore Vietnamese accents via `restore_diacritics()` from `src/utils/vn_accent_restore.py`

**Endpoint**: `POST /predict`

```json
{
  "frames": [[{x, y, z}, ...], ...],  // Array of landmark arrays
  "current_text": "chua co dau"      // Optional context for accent restoration
}
```

## Testing & Debugging

### Backend Logs

- **JPA SQL**: Set `spring.jpa.show-sql=true` (already enabled)
- **Service logs**: Use `@Slf4j` (Lombok), log at DEBUG for integrations
- **Check health**: Elasticsearch at `http://localhost:9200/_cluster/health`

### Common Issues

1. **Port conflicts**:

   - PostgreSQL uses host port `5433` to avoid conflicts with system Postgres
   - Check: `lsof -i :8081` or `lsof -i :3000` if ports are busy

2. **Frontend can't reach Backend in Docker**:

   - **Cause**: Frontend client-side code runs in **browser**, not container
   - **Solution**: Must use `http://host.docker.internal:8081/api`
   - **Check**: `docker-compose.yml` has `extra_hosts: - "host.docker.internal:host-gateway"`
   - **Dockerfile**: `NEXT_PUBLIC_API_URL=http://host.docker.internal:8081/api` must be set at build time

3. **Backend health check fails**:

   - **Correct endpoint**: `/api/dictionary/search?keyword=` (GET method, permitAll, returns 200 OK)
   - **Wrong endpoints**: `/api/auth/login` (POST-only, returns 405 for GET), `/actuator/health` (403 Forbidden)
   - Health check uses **internal port** `8080`: `http://localhost:8080/api/dictionary/search?keyword=`
   - External access uses **host port** `8081`: `http://localhost:8081/api/dictionary/search?keyword=`
   - Must install `curl` in backend Dockerfile: `RUN apk add --no-cache curl`

4. **Elasticsearch sync**:

   - Check `Dictionary.elasticSynced` field if search fails
   - Verify ES health: `curl http://localhost:9200/_cluster/health`
   - Data persists in `./elasticsearch-data` directory

5. **AI Service models not found**:

   - Ensure `models/scaler.pkl` and `models/model_mlp.pkl` exist in `vsl-platform-ai-model/models/`
   - Check logs: `docker-compose logs ai-service | grep "Models loaded"`

6. **CORS errors**:

   - Backend CORS configured for `localhost:3000`
   - In Docker, frontend at `localhost:3000` calls backend at `host.docker.internal:8081`

7. **Token expiry**:

   - JWT valid for 24h (`jwt.expiration=86400000`)
   - Frontend handles 401 auto-redirect to `/login`

8. **Service startup order**:
   - Backend waits for postgres, elasticsearch, ai-service (health checks)
   - Frontend waits for backend (health check)
   - Use `docker-compose logs -f` to monitor startup progress

## File Conventions

### Backend

- **Controllers**: Thin layer, delegate to services (e.g., `RecognitionController`, `DictionaryController`)
- **Services**: Business logic, call repositories or integration services (e.g., `DictionaryService`, `UserService`)
- **Integration**: External service clients (e.g., `GestureIntegrationService` for Python AI via `RestClient`)
- **DTOs**: Record types for request/response (e.g., `record GestureInputDTO(List<List<Landmark>> frames)`)
- **Security**: `JwtAuthenticationFilter`, `RateLimitingFilter`, `AuditorAwareImpl` for audit trails

### Frontend

- **Components**: In `components/features/` by domain (e.g., `ai/CameraView.tsx`, `dictionary/SearchBar.tsx`)
- **Types**: Shared types in `types/api.ts` matching backend DTOs
- **Hooks**: Custom hooks in `hooks/` (e.g., `useHandTracking.ts`, `useAuthStatus.ts`)
- **Pages**: App Router in `app/` directory (e.g., `app/recognize/page.tsx`)
- **Stores**: Zustand stores in `stores/` (e.g., `auth-store.ts`)

### Python AI Service

- **app.py**: Main Flask entry point, loads models at startup (`load_models()`)
- **src/utils/vn_accent_restore.py**: Vietnamese diacritics restoration using Hugging Face transformers
- **src/data_processing/**: MediaPipe landmark format conversion
- **models/**: Pre-trained models (`scaler.pkl`, `model_mlp.pkl`) - must exist before running

## Key Dependencies

### Backend (Spring Boot 3.3)

- **JDK**: 21 (LTS)
- **Security**: Spring Security 6 + JWT (io.jsonwebtoken)
- **Rate Limiting**: Bucket4j
- **HTTP Client**: RestClient (Spring 6+) configured in `RestClientConfig` and `AiServiceConfig`
- **Search**: Spring Data Elasticsearch

### Frontend (Next.js 16)

- **React**: 19.2.0 (App Router)
- **MediaPipe**: `@mediapipe/tasks-vision` for hand tracking
- **HTTP**: Axios with interceptors (`lib/api-client.ts`)
- **State**: Zustand with persist middleware

### AI Service

- **Python**: 3.8+ (recommended 3.10-3.12)
- **ML**: scikit-learn (joblib for model persistence)
- **NLP**: transformers (Hugging Face), torch
- **Landmarks**: MediaPipe compatibility (expects 21-point format)

## Migration Notes

**Deprecated**: Legacy Python services at ports `5000`/`5001` (separate models) replaced by unified service. If you see `python.model1.url` in `application.properties`, use `ai.service.url` instead.

## Deployment & Infrastructure

### Docker Compose Variants

Multiple compose files available in `vsl-platform-backend/`:

- `docker-compose.yml` - **Full production** (5 services, recommended for development)
- `docker-compose.free-tier.yml` - **AWS Free Tier optimized** (reduced resources)
- `docker-compose.free-tier-optimized.yml` - **Aggressive optimization** (minimal memory/CPU)
- `docker-compose.gitlab-ci.yml` - **CI/CD pipeline** (test execution)

### AWS Deployment via Terraform

Infrastructure code in `infrastructure/` provisions:

- **EC2 t2.micro** (Free Tier): Runs Docker containers
- **RDS PostgreSQL db.t2.micro** (Free Tier): Database
- **Route 53**: DNS for `canhnq.online` domain
- **Security Groups**: Firewall rules for services
- **Elastic IP**: Static IP for EC2

**Deploy Commands**:

```bash
cd infrastructure
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

**Prerequisites**:

1. AWS credentials configured (`aws configure`)
2. Route 53 hosted zone created for domain
3. SSH key generated (`~/.ssh/vsl-platform-key`)

See [infrastructure/README.md](../infrastructure/README.md) for full guide.

### GitLab CI/CD

Pipeline defined in `.gitlab-ci.yml` with stages:

1. **Build**: Compile backend, build Docker images
2. **Test**: Run unit/integration tests via `docker-compose.gitlab-ci.yml`
3. **Deploy**: SSH to EC2, pull images, restart containers

Setup GitLab Runner on EC2: `./setup-gitlab-runner.sh`

See [GITLAB_CI_CD_SETUP.md](../GITLAB_CI_CD_SETUP.md) for configuration.

### Guest Access

**Pattern**: Unauthenticated users can access limited features (see [GUEST_ACCESS_RULES.md](../GUEST_ACCESS_RULES.md)):

- **Public endpoints**: Dictionary search, gesture recognition (demo mode)
- **Restrictions**: No favorites, no contributions, no profile management
- **Implementation**: Security rules in `SecurityConfig`, controllers check authentication status

## Development Tips

### Java Package Structure

All backend code under `com.capstone.vsl` (not `vn.edu.hcmuaf.fit.vsl_platform`):

- `com.capstone.vsl.controller` - REST endpoints
- `com.capstone.vsl.service` - Business logic
- `com.capstone.vsl.integration` - External service clients (AI service)
- `com.capstone.vsl.security` - JWT filters, rate limiting
- `com.capstone.vsl.exception` - Global exception handling

### Quick Debugging Checklist

1. **Container not starting?** Check `docker-compose logs <service-name>`
2. **Connection refused?** Verify service health checks passed
3. **401 Unauthorized?** Check JWT token in browser localStorage
4. **Search not working?** Verify Elasticsearch is healthy and `elasticSynced=true`
5. **AI prediction fails?** Ensure models exist in `vsl-platform-ai-model/models/`

### Testing

```bash
# Backend unit tests
cd vsl-platform-backend
./mvnw test

# Frontend tests (if configured)
cd vsl-platform-frontend
npm test

# Integration tests via Docker Compose
cd vsl-platform-backend
docker-compose -f docker-compose.gitlab-ci.yml up --abort-on-container-exit
```

## Testing Strategy

### Backend Testing (Spring Boot)

**Framework**: JUnit 5, Mockito, Spring Boot Test

**Test Structure**:

- **Unit Tests**: `src/test/java/com/capstone/vsl/service/` - Test business logic in isolation
- **Integration Tests**: `src/test/java/com/capstone/vsl/integration/` - Test full request-response cycle
- **Repository Tests**: `src/test/java/com/capstone/vsl/repository/` - Test JPA queries with `@DataJpaTest`

**Mocking Pattern for AI Service**:

```java
@MockBean
private GestureIntegrationService gestureIntegrationService;

@Test
void testGestureRecognition() {
    // Mock AI service response
    when(gestureIntegrationService.recognizeGesture(any()))
        .thenReturn(new AiResponseDTO("xin chào", 0.95));

    // Test controller/service logic
    // ...
}
```

**Database Testing**:

- Use H2 in-memory database for unit tests
- Use Testcontainers for integration tests with real PostgreSQL

**Running Tests**:

```bash
# Run all tests
./mvnw test

# Run specific test class
./mvnw test -Dtest=DictionaryServiceTest

# Run with coverage (JaCoCo)
./mvnw clean test jacoco:report
# View report: target/site/jacoco/index.html

# Skip tests during build
./mvnw clean install -DskipTests
```

### Frontend Testing (Next.js/React)

**Framework**: Jest, React Testing Library

**Test Structure**:

- **Component Tests**: `__tests__/components/` - Test UI components in isolation
- **Integration Tests**: `__tests__/integration/` - Test user flows
- **Hook Tests**: `__tests__/hooks/` - Test custom React hooks

**Testing MediaPipe Integration**:

```typescript
// Mock MediaPipe hand tracking
jest.mock("@mediapipe/tasks-vision", () => ({
  HandLandmarker: {
    createFromOptions: jest.fn(() => ({
      detect: jest.fn(() => ({ landmarks: mockLandmarks })),
    })),
  },
}));
```

**Running Tests**:

```bash
# Run all tests
npm test

# Run in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage
```

### Python AI Service Testing

**Framework**: pytest, unittest

**Test Structure**:

- **Unit Tests**: `tests/test_models.py` - Test model prediction logic
- **Integration Tests**: `tests/test_api.py` - Test Flask endpoints

**Running Tests**:

```bash
cd vsl-platform-ai-model
pytest tests/
pytest --cov=src tests/  # With coverage
```

### End-to-End Testing

**Tool**: Playwright or Cypress (if configured)

**Test Scenarios**:

1. User registration and login
2. Gesture recognition flow
3. Dictionary search and favorites
4. Admin user management

### CI/CD Testing

GitLab pipeline runs tests automatically:

- Unit tests in `test` stage
- Integration tests with `docker-compose.gitlab-ci.yml`
- Test reports published as artifacts

## API Documentation (Swagger/OpenAPI)

### Accessing Swagger UI

**URL**: http://localhost:8081/swagger-ui.html (when backend is running)

**Alternative JSON**: http://localhost:8081/v3/api-docs

### Swagger Configuration

Located in `com.capstone.vsl.config.OpenApiConfig`:

```java
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "VSL Platform API",
        version = "1.0",
        description = "Vietnamese Sign Language Platform REST API"
    ),
    servers = {
        @Server(url = "http://localhost:8081", description = "Local Development"),
        @Server(url = "https://api.canhnq.online", description = "Production")
    }
)
public class OpenApiConfig {
    // JWT security scheme configuration
}
```

### Using Swagger UI

1. **Authenticate**: Click "Authorize" button, enter JWT token from login response
2. **Test Endpoints**: Expand any endpoint → "Try it out" → Fill parameters → "Execute"
3. **View Models**: Scroll down to see DTOs and request/response schemas

### API Endpoints Overview

**Authentication**:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login (returns JWT)

**Dictionary** (Public):

- `GET /api/dictionary/search?keyword={word}` - Search dictionary
- `GET /api/dictionary/{id}` - Get word details

**Gesture Recognition** (Public):

- `POST /api/vsl/recognize` - Recognize hand gesture from landmarks
- `POST /api/vsl/spell` - Text to gesture spelling

**User Features** (Requires Authentication):

- `GET /api/user/favorites` - Get user's favorite words
- `POST /api/user/favorites/{dictionaryId}` - Add to favorites
- `GET /api/user/profile` - Get user profile

**Admin Features** (Requires ADMIN role):

- `GET /api/admin/users` - List all users
- `POST /api/admin/dictionary` - Create dictionary entry
- `GET /api/admin/contributions` - Review user contributions

## Environment Variables

### Backend (Spring Boot)

**Required Variables** (set in `docker-compose.yml` or `application.properties`):

```yaml
# Database Connection
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/vsl_db
SPRING_DATASOURCE_USERNAME: postgres
SPRING_DATASOURCE_PASSWORD: password

# Elasticsearch
SPRING_ELASTICSEARCH_URIS: http://elasticsearch:9200

# AI Service Integration
AI_SERVICE_URL: http://ai-service:5000
AI_SERVICE_TIMEOUT: 10000 # milliseconds

# JWT Security
JWT_SECRET: your-256-bit-secret-key-change-in-production
JWT_EXPIRATION: 86400000 # 24 hours in milliseconds

# Server Configuration
SERVER_PORT: 8080

# Java Memory
JAVA_OPTS: "-Xmx512m -Xms256m"
```

**Optional Variables**:

```yaml
# JPA Settings
SPRING_JPA_HIBERNATE_DDL_AUTO: update # create, update, validate, none
SPRING_JPA_SHOW_SQL: "false" # true for development

# Logging
LOGGING_LEVEL_COM_CAPSTONE_VSL: INFO # DEBUG for development
```

### Frontend (Next.js)

**Required Variables** (set in `.env.local` or Dockerfile):

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8081/api  # Local dev
# NEXT_PUBLIC_API_URL=http://host.docker.internal:8081/api  # Docker

# Environment
NODE_ENV=development  # production
```

**Build-time Variables** (must be set during Docker build):

```dockerfile
# In Dockerfile
ARG NEXT_PUBLIC_API_URL=http://host.docker.internal:8081/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
```

### Python AI Service (Flask)

**Required Variables**:

```yaml
# Flask Configuration
FLASK_ENV: production # development
FLASK_APP: app.py

# Model Configuration
CONFIDENCE_THRESHOLD: 0.7

# Server
PORT: 5000

# Python Optimization
PYTHONUNBUFFERED: 1 # Real-time logging
```

**Model Files** (must exist):

- `models/scaler.pkl` - StandardScaler for feature normalization
- `models/model_mlp.pkl` - MLPClassifier for gesture prediction

### Production Environment Variables (AWS)

**For Terraform deployment**:

```hcl
# terraform.tfvars
aws_region = "ap-southeast-1"
environment = "production"
domain_name = "canhnq.online"

# RDS Database
rds_instance_class = "db.t2.micro"
db_name = "vsl_db"
db_username = "postgres"
db_password = "strong-password-here"  # Change this!

# EC2
ec2_instance_type = "t2.micro"
ssh_public_key = "ssh-rsa AAAA..."
```

**GitLab CI/CD Variables** (set in GitLab UI):

- `EC2_HOST` - EC2 public IP
- `EC2_USER` - SSH user (ec2-user)
- `SSH_PRIVATE_KEY` - EC2 private key
- `RDS_ENDPOINT` - RDS connection endpoint
- `RDS_PASSWORD` - Database password
- `JWT_SECRET` - Production JWT secret

### Environment Variables Checklist

**Development Setup**:

- [ ] Backend: `SPRING_DATASOURCE_URL`, `JWT_SECRET`, `AI_SERVICE_URL`
- [ ] Frontend: `NEXT_PUBLIC_API_URL`
- [ ] AI Service: Model files in `models/` directory

**Production Setup**:

- [ ] All development variables
- [ ] Strong `JWT_SECRET` (256-bit minimum)
- [ ] Strong `RDS_PASSWORD`
- [ ] Production domain URLs
- [ ] AWS credentials for Terraform
- [ ] GitLab CI/CD variables configured
