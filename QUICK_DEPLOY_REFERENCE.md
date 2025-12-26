# 🚀 Dictionary Module - Quick Deploy Reference

**Status:** ✅ **READY TO DEPLOY** (2024-12-25)

---

## ⚡ 60-Second Deployment

```bash
# Step 1: Navigate to backend
cd vsl-platform-backend

# Step 2: Build & Start (one command)
docker-compose up -d --build

# Step 3: Wait ~2-3 minutes for services to start

# Step 4: Verify
curl http://localhost:8081/api/dictionary/search?query=test

# Step 5: Open frontend
open http://localhost:3000
```

**Done!** Dictionary module is live. 🎉

---

## 📱 URLs After Deployment

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Web UI |
| **Backend API** | http://localhost:8081/api | API Gateway |
| **Elasticsearch** | http://localhost:9200 | Search Engine |
| **PostgreSQL** | localhost:5433 | Database |

---

## 🔑 Key Credentials

```
Database:
  Username: vsl_user
  Password: vsl_password
  Database: vsl_db
  
Default Admin:
  Username: admin
  Password: admin123
  (Change in production!)
```

---

## 🧪 Quick Tests

### Test 1: Search (Public)
```bash
curl "http://localhost:8081/api/dictionary/search?query=xin"
```
**Expected:** Returns array of words

### Test 2: Get Word Detail (Public)
```bash
curl http://localhost:8081/api/dictionary/1
```
**Expected:** Returns single word with metadata

### Test 3: Check Frontend
```bash
open http://localhost:3000/dictionary
```
**Expected:** Dictionary page loads with search box

---

## 🛠️ Common Commands

```bash
# View logs
docker-compose logs -f backend

# Restart service
docker-compose restart backend

# Stop all services
docker-compose down

# Remove everything (data lost!)
docker-compose down -v

# Check service status
docker-compose ps

# Execute command in container
docker-compose exec postgres psql -U vsl_user -d vsl_db
```

---

## 📊 What's Included

✅ **10 API Endpoints:**
- 3 public (search, get, random)
- 4 authenticated (favorite management)
- 3 admin (CRUD operations)

✅ **Full Features:**
- Dictionary search with Elasticsearch
- User favorites management
- Report system for issues
- Admin word management
- Role-based access control

✅ **Documentation:**
- Deployment guide
- API reference
- Database schema
- Test scripts

---

## 🔍 File Locations

| What | Where |
|------|-------|
| Frontend Code | `/vsl-platform-frontend/app/dictionary/` |
| Backend Code | `/vsl-platform-backend/src/main/java/.../` |
| Docker Config | `/vsl-platform-backend/docker-compose.yml` |
| Database Docs | `/DICTIONARY_DEPLOYMENT_GUIDE.md` |

---

## 🐛 Troubleshooting (5-Minute Fixes)

### "Cannot connect to backend"
```bash
# Check if running
docker-compose ps

# View error logs
docker-compose logs backend

# Restart
docker-compose restart backend
```

### "Search returns no results"
```bash
# Check Elasticsearch
curl http://localhost:9200/_cluster/health

# Should return status: "green"
```

### "Favorite toggle fails"
```bash
# Need to login first at http://localhost:3000/login
# Then retry the operation
```

### "Frontend blank page"
```bash
# Check environment variables
docker-compose ps

# Rebuild frontend
docker-compose up -d --build frontend
```

---

## 📈 Performance

| Operation | Expected Time |
|-----------|----------------|
| Search 10,000 words | <100ms |
| Toggle favorite | <500ms |
| List user favorites | <1s |
| Load word detail | <500ms |
| Admin create word | <1s |

---

## 🔐 Security Notes

1. **JWT Token:** 24-hour expiration
2. **Authentication:** Required for favorites & reports
3. **Authorization:** Role-based (USER/ADMIN)
4. **SQL Injection:** Protected via JPA
5. **CORS:** Configured for localhost:3000

**For Production:**
- Change JWT secret
- Set strong passwords
- Enable HTTPS/SSL
- Configure firewall rules

---

## 📞 Support

### If Something Breaks
1. Check logs: `docker-compose logs`
2. Restart service: `docker-compose restart <service>`
3. Check database: `docker-compose exec postgres psql -U vsl_user -d vsl_db`
4. Verify network: `curl http://localhost:8081/api/dictionary/search?query=test`

### For Code Questions
See detailed docs:
- `DICTIONARY_DEPLOYMENT_GUIDE.md` - Full guide
- `DICTIONARY_IMPLEMENTATION_SUMMARY.md` - Overview
- Inline code comments - Implementation details

---

## ✨ Summary

**Dictionary Module = Complete & Production Ready**

Features:
- ✅ Full-text search
- ✅ Favorites system
- ✅ Report/feedback
- ✅ Admin management
- ✅ Responsive UI
- ✅ Proper authentication

Deploy with confidence! 🚀

---

**Questions?** Check the detailed guides in the repo root.

