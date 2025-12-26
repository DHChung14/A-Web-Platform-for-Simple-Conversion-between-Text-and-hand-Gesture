# Dictionary Module - Deployment Checklist ✅

## Overview
Phần deploy dictionary web đã được **hoàn thành 95%**. Tài liệu này giúp bạn kiểm tra và deploy.

---

## ✅ Frontend (Completed)

### 1. Dictionary Pages
- [x] `/app/dictionary/page.tsx` - Trang danh sách từ điển
  - ✅ Search với debounce 300ms
  - ✅ Gọi API: `GET /api/dictionary/search?query={query}`
  - ✅ Hiển thị results trong grid
  
- [x] `/app/dictionary/[wordId]/page.tsx` - Trang chi tiết từ
  - ✅ Fetch word detail: `GET /api/dictionary/{id}`
  - ✅ Check favorite status: `GET /api/user/favorites/check/{wordId}`
  - ✅ Toggle favorite: `POST /api/user/favorites/{wordId}`
  - ✅ Submit report: `POST /api/user/reports`
  - ✅ Video player + metadata display

### 2. Styles
- [x] `styles/dictionary.module.css` - Trang danh sách
- [x] `styles/word-detail.module.css` - Trang chi tiết
- [x] Hỗ trợ responsive design + terminal theme

### 3. Types & API Client
- [x] `types/api.ts` - Định nghĩa tất cả DTOs:
  - `DictionaryDTO`, `FavoriteToggleResponse`, `ReportRequest`
- [x] `lib/api-client.ts` - Axios client với JWT interceptor
- [x] `lib/admin-api-client.ts` - Admin-specific endpoints

---

## ✅ Backend (Completed)

### 1. Dictionary Controller & Service
- [x] `DictionaryController.java`
  - ✅ `GET /api/dictionary/search` - Search từ ES/PostgreSQL
  - ✅ `GET /api/dictionary/{id}` - Get chi tiết từ
  - ✅ `GET /api/dictionary/random` - Get random word
  - ✅ `POST /api/dictionary` (ADMIN) - Create từ
  - ✅ `PUT /api/admin/dictionary/{id}` (ADMIN) - Update từ
  - ✅ `DELETE /api/admin/dictionary/{id}` (ADMIN) - Delete từ

- [x] `DictionaryService.java`
  - ✅ Dual-write pattern (PostgreSQL + Elasticsearch)
  - ✅ Fallback from ES to PostgreSQL if ES down
  - ✅ Search via ILIKE query
  - ✅ DTO conversion

### 2. User Favorites
- [x] `UserFavoriteController.java`
  - ✅ `POST /api/user/favorites/{wordId}` - Toggle favorite
  - ✅ `GET /api/user/favorites` - List favorites
  - ✅ `GET /api/user/favorites/check/{wordId}` - Check status

- [x] `FavoriteService.java` - Business logic
- [x] `UserFavorite.java` entity + repository

### 3. User Reports
- [x] `UserInteractionController.java`
  - ✅ `POST /api/user/reports` - Create report

- [x] `UserFeatureService.java`
- [x] `Report.java` entity + repository
- [x] `ReportDTO.java`, `ReportRequest.java`

### 4. Database Entities
- [x] `Dictionary.java` - Main dictionary entity
  - ✅ Extends `BaseEntity` (auditing: createdBy, updatedAt)
  - ✅ Relationships: OneToMany with `UserFavorite`
  
- [x] `UserFavorite.java`
  - ✅ Composite unique constraint: (user_id, dictionary_id)
  - ✅ Prevents duplicate favorites
  
- [x] `Report.java`
  - ✅ Tracks reported issues
  - ✅ Status enum: OPEN, RESOLVED, REJECTED

---

## 🔍 API Endpoints Summary

### Public Endpoints (No Auth Required)
```
GET  /api/dictionary/search?query=hello        # Search dictionary
GET  /api/dictionary/{id}                      # Get word detail
GET  /api/dictionary/random                    # Random word
```

### Authenticated Endpoints (USER+)
```
GET  /api/user/favorites/{wordId}              # Check if favorite
GET  /api/user/favorites                       # List user favorites
POST /api/user/favorites/{wordId}              # Toggle favorite
POST /api/user/reports                         # Report word
```

### Admin Endpoints (ADMIN only)
```
POST   /api/dictionary                         # Create word
PUT    /api/admin/dictionary/{id}              # Update word
DELETE /api/admin/dictionary/{id}              # Delete word
```

---

## 🚀 Deployment Steps

### Step 1: Build Backend
```bash
cd vsl-platform-backend
./mvnw clean install
```

### Step 2: Build Frontend
```bash
cd ../vsl-platform-frontend
npm install
npm run build
```

### Step 3: Start Docker Compose
```bash
cd ../vsl-platform-backend
docker-compose up -d --build
```

### Step 4: Verify Services
```bash
# Check all services running
docker-compose ps

# Logs
docker-compose logs -f backend
docker-compose logs -f elasticsearch
docker-compose logs -f postgres
```

---

## 🧪 Test Endpoints

### 1. Search Dictionary
```bash
curl "http://localhost:8081/api/dictionary/search?query=xin"
```

**Response:**
```json
{
  "code": 200,
  "message": "Found 3 result(s)",
  "data": [
    {
      "id": 1,
      "word": "xin chào",
      "definition": "greeting",
      "videoUrl": "https://...",
      "createdBy": "admin",
      "createdAt": "2024-12-25T10:00:00"
    }
  ]
}
```

### 2. Get Word Detail
```bash
curl "http://localhost:8081/api/dictionary/1"
```

### 3. Toggle Favorite (Authenticated)
```bash
curl -X POST "http://localhost:8081/api/user/favorites/1" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Response:**
```json
{
  "code": 200,
  "message": "Favorite added successfully",
  "data": {
    "wordId": 1,
    "isFavorite": true
  }
}
```

### 4. Check Favorite Status
```bash
curl "http://localhost:8081/api/user/favorites/check/1" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### 5. Submit Report
```bash
curl -X POST "http://localhost:8081/api/user/reports" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "wordId": 1,
    "reason": "Video không chính xác"
  }'
```

---

## ✅ Pre-Deployment Checklist

- [ ] Database migrations applied (PostgreSQL)
- [ ] Elasticsearch indices created
- [ ] Environment variables configured:
  - Backend: `JWT_SECRET`, `DATABASE_URL`, `ELASTICSEARCH_URL`
  - Frontend: `NEXT_PUBLIC_API_URL=http://host.docker.internal:8081/api`
- [ ] All Docker services healthy (postgres, elasticsearch, backend, frontend)
- [ ] Rate limiting configured (10 req/sec for recognize)
- [ ] CORS configured for frontend origin
- [ ] Search indexes synced with database
- [ ] Test API endpoints manually

---

## 📋 Known Issues & Fixes

### Issue 1: Search returns empty results
**Cause:** Elasticsearch not synced
**Fix:** Check `Dictionary.elasticSynced` field
```sql
SELECT * FROM dictionary WHERE elastic_synced = false;
```

### Issue 2: Favorite toggle returns 401
**Cause:** JWT token expired or missing
**Fix:** Re-login to get fresh token

### Issue 3: Report endpoint returns 400
**Cause:** Missing `wordId` or `reason` in request
**Fix:** Validate request body matches `ReportRequest` DTO

### Issue 4: Frontend can't reach backend
**Cause:** `NEXT_PUBLIC_API_URL` not set correctly
**Fix:** In Docker, use `http://host.docker.internal:8081/api`

---

## 📦 Database Schema (Key Tables)

### dictionary
```
id (PK)
word (VARCHAR, UNIQUE)
definition (TEXT)
video_url (VARCHAR)
elastic_synced (BOOLEAN)
created_by (VARCHAR)
updated_by (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
```

### user_favorites
```
id (PK)
user_id (FK) → users
dictionary_id (FK) → dictionary
created_at (TIMESTAMP)
UNIQUE(user_id, dictionary_id)
```

### reports
```
id (PK)
user_id (FK) → users
dictionary_id (FK) → dictionary
reason (TEXT)
status (ENUM: OPEN, RESOLVED, REJECTED)
created_at (TIMESTAMP)
```

---

## 🎯 Next Steps

1. **Database Setup**
   - Run migrations: `./mvnw spring-boot:run -DskipTests`
   - Verify tables created in PostgreSQL

2. **Test API Integration**
   - Use Postman/curl to test all endpoints
   - Verify JWT token flow works

3. **Frontend Deployment**
   - Run `npm run build`
   - Test in docker container

4. **Production Ready**
   - Set up CI/CD pipeline
   - Configure SSL/HTTPS
   - Set up monitoring & logging
   - Backup database regularly

---

## 📞 Support

If deployment issues occur:
1. Check logs: `docker-compose logs <service>`
2. Verify environment variables
3. Check database connection
4. Verify Elasticsearch health: `curl http://localhost:9200/_cluster/health`

---

**Status:** ✅ Ready for Deployment
**Last Updated:** 2024-12-25
