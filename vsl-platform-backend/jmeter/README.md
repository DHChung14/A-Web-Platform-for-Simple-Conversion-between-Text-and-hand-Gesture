# 🚀 JMeter Load Testing cho VSL Platform

Hướng dẫn sử dụng JMeter GUI để tạo traffic ảo và theo dõi metrics trên Grafana.

---

## 📋 Yêu Cầu

- **JMeter 5.6+** đã cài đặt trên máy
- Backend đang chạy tại `http://localhost:8081`
- Prometheus & Grafana đã được setup

---

## 💻 Sử Dụng JMeter GUI (Khuyên Dùng)

### 1. Cài Đặt JMeter

**macOS:**
```bash
brew install jmeter
```

**Linux:**
```bash
sudo apt-get install jmeter
# hoặc
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.2.tgz
tar -xzf apache-jmeter-5.6.2.tgz
```

**Windows:**
- Tải từ: https://jmeter.apache.org/download_jmeter.cgi
- Giải nén và chạy `bin/jmeter.bat`

### 2. Mở Test Plan

Có 3 test plans để chọn:

**Quick Test (15 users, 5 phút):**
```bash
jmeter -t jmeter/quick-test-15-users.jmx
```

**Medium Load (200 users, 10 phút):**
```bash
jmeter -t jmeter/load-test-200-users.jmx
```

**Heavy Load (500 users, 10 phút):**
```bash
jmeter -t jmeter/load-test-500-users.jmx
```

Hoặc mở file trong JMeter GUI.

### 3. Chạy Test

1. Mở JMeter GUI
2. File → Open → Chọn một trong các file:
   - `quick-test-15-users.jmx` - Quick test/verification
   - `load-test-200-users.jmx` - Medium load test
   - `load-test-500-users.jmx` - Heavy load test
3. Chỉnh sửa thông số (nếu cần):
   - **Thread Groups**:
     - Public Endpoints: 10 threads, ramp-up 30s, duration 5 phút
     - Authenticated Endpoints: 5 threads, ramp-up 10s, duration 5 phút
4. Click **Run** → **Start** (Ctrl+R)
5. Xem kết quả trong **View Results Tree** và **Summary Report**

---

## 🎨 Giao Diện JMeter GUI

### Các Panel Quan Trọng

1. **Test Plan Tree** (Bên trái):
   - Hiển thị cấu trúc test plan
   - Click vào các elements để chỉnh sửa

2. **View Results Tree**:
   - Xem chi tiết từng request/response
   - Kiểm tra request body, response body, headers
   - Xem errors nếu có

3. **Summary Report**:
   - Thống kê tổng quan:
     - **Samples**: Tổng số requests
     - **Average**: Response time trung bình (ms)
     - **Min/Max**: Response time min/max (ms)
     - **Error %**: Tỷ lệ lỗi (%)
     - **Throughput**: Requests/second
     - **KB/sec**: Bandwidth sử dụng

### Tips Sử Dụng GUI

- **Xem request/response**: Click vào request trong **View Results Tree** để xem chi tiết
- **Filter results**: Dùng search box trong **View Results Tree** để lọc
- **Clear results**: Right-click listener → **Clear** để xóa kết quả cũ
- **Save results**: Right-click listener → **Save As...** để export

---

## ⚙️ Cấu Hình Test Plan

### Thread Groups

#### **Public Endpoints Load Test**
- **Threads**: 10 users
- **Ramp-up**: 30 giây
- **Duration**: 5 phút (300 giây)
- **Endpoints**:
  - `GET /api/dictionary/search?query=hello`
  - `GET /api/dictionary/random?count=6`
  - `GET /api/dictionary/count`

#### **Authenticated Endpoints Load Test**
- **Threads**: 5 users
- **Ramp-up**: 10 giây
- **Duration**: 5 phút
- **Endpoints**:
  - `POST /api/auth/login` (để lấy JWT token)
  - `GET /api/user/history` (với JWT token)
  - `GET /api/user/favorites` (với JWT token)

### Variables

Có thể chỉnh sửa trong **User Defined Variables**:
- `BASE_URL`: http://localhost:8081
- `API_PREFIX`: /api
- `TEST_USERNAME`: admin
- `TEST_PASSWORD`: admin123

---

## 📊 Xem Kết Quả

### Trong JMeter GUI

1. **View Results Tree**: Xem chi tiết từng request/response
2. **Summary Report**: Xem thống kê tổng quan
   - Samples: Tổng số requests
   - Average: Thời gian response trung bình
   - Min/Max: Thời gian response min/max
   - Error %: Tỷ lệ lỗi
   - Throughput: Requests/second

### Trong Grafana

1. Mở Grafana: http://localhost:3001
2. Vào dashboard **VSL Platform Backend Metrics**
3. Xem các metrics real-time:
   - **Requests per Second**: Tăng khi JMeter chạy
   - **Response Time**: Thời gian phản hồi
   - **Error Rate**: Tỷ lệ lỗi (nếu có)
   - **Memory Usage**: Memory sử dụng tăng
   - **CPU Usage**: CPU usage tăng
   - **Threads**: Số threads đang xử lý

### Trong Prometheus

1. Mở Prometheus: http://localhost:9090
2. Query metrics:
   ```promql
   # Requests per second
   rate(http_server_requests_seconds_count[1m])
   
   # Response time
   histogram_quantile(0.95, rate(http_server_requests_seconds_bucket[5m]))
   
   # Error rate
   rate(http_server_requests_seconds_count{status=~"5.."}[5m])
   ```

---

## 🎯 Scenarios Test

### Scenario 1: Light Load (Kiểm Tra Cơ Bản)
- Public Endpoints: 5 threads, 10s ramp-up, 1 phút
- Authenticated: 2 threads, 5s ramp-up, 1 phút

### Scenario 2: Medium Load (Load Bình Thường)
- Public Endpoints: 10 threads, 30s ramp-up, 5 phút
- Authenticated: 5 threads, 10s ramp-up, 5 phút

### Scenario 3: Heavy Load (Stress Test)
- Public Endpoints: 50 threads, 60s ramp-up, 10 phút
- Authenticated: 20 threads, 30s ramp-up, 10 phút

### Scenario 4: Spike Test (Tăng Đột Ngột)
- Public Endpoints: 100 threads, 5s ramp-up, 2 phút
- Authenticated: 30 threads, 5s ramp-up, 2 phút

---

## 📈 Metrics Quan Trọng Cần Theo Dõi

### Performance Metrics
- **Response Time (p95, p99)**: Thời gian phản hồi
- **Throughput**: Requests/second
- **Error Rate**: Tỷ lệ lỗi (4xx, 5xx)

### Resource Metrics
- **Memory Usage**: Heap memory sử dụng
- **CPU Usage**: CPU utilization
- **Thread Count**: Số threads đang xử lý
- **GC Pause Time**: Thời gian garbage collection

### Business Metrics
- **Success Rate**: Tỷ lệ requests thành công
- **Concurrent Users**: Số users đồng thời

---

## 🔧 Tùy Chỉnh Test Plan

### Thêm Endpoint Mới

1. Mở test plan trong JMeter GUI
2. Right-click Thread Group → Add → Sampler → HTTP Request
3. Cấu hình:
   - **Name**: Tên endpoint
   - **Method**: GET/POST/PUT/DELETE
   - **Path**: `/api/your-endpoint`
   - **Parameters/Body**: Nếu cần

### Thay Đổi Load

1. Chọn Thread Group
2. Thay đổi:
   - **Number of Threads**: Số users
   - **Ramp-up Period**: Thời gian tăng dần
   - **Duration**: Thời gian chạy test

### Thêm Assertions

1. Right-click HTTP Request → Add → Assertions → Response Assertion
2. Cấu hình:
   - **Response Code**: 200
   - **Response Message**: Contains "success"

---

## 🐛 Troubleshooting

### JMeter không kết nối được backend

1. Kiểm tra backend có chạy không:
   ```bash
   curl http://localhost:8081/actuator/health
   ```

2. Kiểm tra network (nếu dùng Docker):
   ```bash
   docker network inspect vsl-platform-backend_vsl-network
   ```

3. Kiểm tra firewall/port:
   ```bash
   netstat -an | grep 8081
   ```

### JWT Token không được extract

1. Kiểm tra response từ `/api/auth/login`
2. Kiểm tra JSON path trong **JSON Post Processor**: `$.data.token`
3. Kiểm tra **Header Manager** có set `Authorization: Bearer ${jwt_token}`

### Metrics không hiển thị trong Grafana

1. Kiểm tra Prometheus có scrape được backend không:
   - Vào http://localhost:9090 → Status → Targets
   - Kiểm tra `vsl-backend` có status **UP**

2. Kiểm tra Grafana data source:
   - Vào Grafana → Configuration → Data sources
   - Test connection với Prometheus

3. Kiểm tra query trong dashboard:
   - Đảm bảo query đúng format PromQL
   - Kiểm tra time range

---

## 📚 Tài Liệu Tham Khảo

- **JMeter Documentation**: https://jmeter.apache.org/usermanual/
- **JMeter Best Practices**: https://jmeter.apache.org/usermanual/best-practices.html
- **Prometheus Querying**: https://prometheus.io/docs/prometheus/latest/querying/basics/
- **Grafana Dashboards**: https://grafana.com/docs/grafana/latest/dashboards/

---

## ✅ Checklist

- [ ] Backend đang chạy và healthy
- [ ] Prometheus & Grafana đang chạy
- [ ] JMeter test plan đã được cấu hình
- [ ] Test credentials (username/password) đúng
- [ ] Dashboard Grafana đã được tạo
- [ ] Đã chạy test và xem metrics trong Grafana

---

**Chúc bạn load testing thành công! 🚀**
