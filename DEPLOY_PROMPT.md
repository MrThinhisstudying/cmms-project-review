# 🚀 PROMPT TRIỂN KHAI BẢN CẬP NHẬT (DEPLOY) LÊN PRODUCTION SERVER AN TOÀN TUYỆT ĐỐI

> **Mục đích:** Tài liệu này cung cấp **System Prompt chuẩn** dành cho AI Agent hoặc Kỹ sư DevOps khi SSH vào Production Server để cập nhật code cho hệ thống **CMMS VCS**. Đảm bảo:
> 1. **Kiểm tra đường dẫn file `.env` 100% chuẩn xác:** Tránh triệt để lỗi gõ nhầm `REACT_APP_BASE_URL` (sai domain, thiếu `/api`, thừa dấu gạch chéo `/`, hoặc nhầm `localhost`).
> 2. **An toàn dữ liệu tuyệt đối (Zero Data Loss):** Tự động sao lưu cả Database PostgreSQL (`pg_dump`) lẫn toàn bộ file đính kèm thực tế (`uploads/` gồm chữ ký số, avatar, chứng chỉ, hồ sơ nhân sự).
> 3. **Chống sụp server (Anti-OOM Killer & Anti-Disk Full):** Tự động kiểm tra dung lượng ổ đĩa, tự kích hoạt 4GB RAM ảo (SWAP), khóa RAM build ở 512MB và build tuần tự từng container.
> 4. **Giảm thiểu thời gian gián đoạn (High Availability):** Không dùng `docker compose down`, build image mới trước khi tái khởi động container.

---

## 📋 NỘI DUNG PROMPT ĐỂ COPY GỬI CHO AGENT / DEVOPS

*Copy toàn bộ nội dung trong khung markdown dưới đây để gửi cho AI Agent hoặc Kỹ sư thực hiện trên server:*

```markdown
# NHIỆM VỤ: CẬP NHẬT MÃ NGUỒN (BIG UPDATE) LÊN SERVER PRODUCTION AN TOÀN

Bạn đang thực hiện thao tác trên Production Server của hệ thống CMMS VCS. 
Mục tiêu: Kiểm tra hệ thống, sao lưu dữ liệu, xác thực đường dẫn cấu hình `.env`, đồng bộ mã nguồn mới từ GitHub, build và khởi chạy phiên bản mới mà KHÔNG làm sập server do thiếu RAM/Disk, KHÔNG làm mất mát dữ liệu và GIẢM THIỂU tối đa thời gian downtime.

---

## ⚠️ 4 NGUYÊN TẮC BẤT DI BẤT DỊCH:
1. **KIỂM TRA ĐƯỜNG DẪN `.env` TRƯỚC KHI BUILD:** 
   - Biến `REACT_APP_BASE_URL` phải trỏ đúng Domain/IP công khai của hệ thống và BẮT BUỘC kết thúc bằng `/api` (Ví dụ: `https://cmms.yourdomain.vn/api` hoặc `http://103.xxx.xxx.xxx/api`).
   - TUYỆT ĐỐI KHÔNG để `localhost`, `localhost.com`, `127.0.0.1` hoặc tên container nội bộ `cmms_backend`.
   - TUYỆT ĐỐI KHÔNG có dấu gạch chéo `/` ở cuối cùng (tránh lỗi URL kép `.../api//users`).
2. **AN TOÀN DỮ LIỆU LÀ SỐ 1 (BACKUP ĐỦ CẢ DB VÀ UPLOADS):** 
   - BẮT BUỘC sao lưu Database PostgreSQL (`pg_dump`) và nén thư mục `uploads/` (chứa avatar, chứng chỉ, chữ ký) trước khi can thiệp code. Nếu file backup rỗng (0 bytes) $\rightarrow$ DỪNG LẠI NGAY LẬP TỨC.
3. **CHỐNG SỤP SERVER (ANTI-OOM & ANTI-DISK-FULL):** 
   - Kiểm tra dung lượng ổ cứng còn trống tối thiểu 5GB (`df -h`).
   - Kích hoạt tối thiểu 4GB SWAP (`free -h`).
   - TUYỆT ĐỐI KHÔNG build đồng thời Frontend và Backend. Phải build tuần tự từng container với `NODE_OPTIONS="--max_old_space_size=512"`.
4. **HIGH AVAILABILITY (KHÔNG DÙNG DOCKER COMPOSE DOWN):**
   - TUYỆT ĐỐI KHÔNG gõ `docker compose down` vì sẽ ngắt kết nối Database và Proxy của người dùng trong suốt quá trình build.
   - Thứ tự chuẩn: Giữ app cũ chạy $\rightarrow$ Build Image mới $\rightarrow$ Chạy Database Migration $\rightarrow$ Recreate container Backend/Frontend $\rightarrow$ Dọn dẹp cache.

---

## 🛠️ CÁC BƯỚC TRIỂN KHAI CHI TIẾT (STEP-BY-STEP):

### BƯỚC 1: XÁC ĐỊNH THƯ MỤC LÀM VIỆC & KIỂM TRA TÀI NGUYÊN HỆ THỐNG
1. Di chuyển vào đúng thư mục gốc của dự án (nơi có file `docker-compose.yml` và `.env`):
```bash
# Thay đường dẫn bên dưới bằng đường dẫn thực tế trên server của bạn nếu khác
cd ~/cmms-project-review || cd /var/www/cmms-project-review

# Đảm bảo đang đứng đúng thư mục gốc chứa các file cốt lõi
if [ ! -f "docker-compose.yml" ] || [ ! -f ".env" ]; then
    echo "❌ LỖI: Không tìm thấy docker-compose.yml hoặc .env tại $(pwd)! Hãy kiểm tra lại đường dẫn."
    exit 1
fi
echo "✅ Đang đứng đúng thư mục dự án: $(pwd)"
```

2. Kiểm tra dung lượng ổ cứng:
```bash
AVAILABLE_DISK=$(df -m . | awk 'NR==2 {print $4}')
echo "Dung lượng ổ đĩa còn trống: ${AVAILABLE_DISK} MB"
if [ "$AVAILABLE_DISK" -lt 3000 ]; then
    echo "⚠️ Ổ cứng còn dưới 3GB trống! Đang dọn bớt image/cache cũ để lấy chỗ build..."
    docker system prune -f
fi
```

3. Kiểm tra và kích hoạt bộ nhớ ảo (SWAP) tối thiểu 4GB:
```bash
TOTAL_SWAP=$(free -m | awk '/Swap:/ {print $2}')
if [ "$TOTAL_SWAP" -lt 2048 ]; then
    echo "⚠️ Swap nhỏ hơn 2GB ($TOTAL_SWAP MB). Đang kích hoạt 4GB Swap an toàn..."
    sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    grep -q "/swapfile" /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi
echo "✅ Bộ nhớ Swap sẵn sàng: $(free -h | awk '/Swap:/ {print $2}')"
```

---

### BƯỚC 2: KIỂM TRA VÀ XÁC THỰC TOÀN DIỆN FILE CẤU HÌNH `.env`
Đoạn script này sẽ tự động phân tích các biến trong file `.env` và ngăn chặn sai sót:
```bash
echo "🔍 Đang rà soát các biến môi trường trong file .env..."

# 1. Đọc file .env
set -a
source .env
set +a

# 2. Kiểm tra biến REACT_APP_BASE_URL (CỰC KỲ QUAN TRỌNG)
if [ -z "$REACT_APP_BASE_URL" ]; then
    echo "❌ LỖI: Biến REACT_APP_BASE_URL đang bị trống trong .env!"
    exit 1
fi

echo "   -> REACT_APP_BASE_URL hiện tại: $REACT_APP_BASE_URL"

# Kiểm tra nếu còn chứa localhost hoặc 127.0.0.1
if [[ "$REACT_APP_BASE_URL" =~ localhost|127\.0\.0\.1|cmms_backend ]]; then
    echo "❌ CẢNH BÁO NGUY HIỂM: REACT_APP_BASE_URL đang chứa '$REACT_APP_BASE_URL'!"
    echo "   Trên Production, người dùng ngoài Internet sẽ KHÔNG thể kết nối được."
    echo "   Vui lòng sửa thành Domain hoặc IP công khai của server (Ví dụ: https://cmms.yourdomain.vn/api)."
    exit 1
fi

# Kiểm tra xem có bắt đầu bằng http:// hoặc https:// không
if [[ ! "$REACT_APP_BASE_URL" =~ ^https?:// ]]; then
    echo "❌ LỖI: REACT_APP_BASE_URL phải bắt đầu bằng http:// hoặc https://"
    exit 1
fi

# Kiểm tra xem có kết thúc bằng /api không
if [[ ! "$REACT_APP_BASE_URL" =~ /api$ ]]; then
    echo "❌ LỖI: REACT_APP_BASE_URL phải kết thúc chính xác bằng '/api' (không có dấu gạch chéo thừa ở cuối)."
    echo "   Ví dụ đúng: https://cmms.yourdomain.vn/api"
    echo "   Ví dụ sai:  https://cmms.yourdomain.vn/api/ hoặc https://cmms.yourdomain.vn"
    exit 1
fi

# 3. Kiểm tra cấu hình Database
if [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ] || [ -z "$POSTGRES_DB" ]; then
    echo "❌ LỖI: Thiếu thông tin cấu hình PostgreSQL (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB) trong .env!"
    exit 1
fi

# 4. Kiểm tra cấu hình JWT
if [ -z "$JWT_SECRET" ]; then
    echo "❌ LỖI: JWT_SECRET đang bị trống trong .env!"
    exit 1
fi

echo "✅ File .env hoàn toàn hợp lệ và chuẩn xác 100%!"
```

---

### BƯỚC 3: SAO LƯU DỮ LIỆU TOÀN DIỆN (DATABASE + UPLOADS)
```bash
BACKUP_DIR="$HOME/backups_cmms"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "💾 1. Đang sao lưu Database PostgreSQL..."
BACKUP_DB_FILE="$BACKUP_DIR/cmms_db_$TIMESTAMP.sql.gz"
docker exec -t cmms_db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-cmms_db}" | gzip > "$BACKUP_DB_FILE"

if [ -s "$BACKUP_DB_FILE" ]; then
    echo "   ✅ Backup Database thành công: $BACKUP_DB_FILE ($(du -h "$BACKUP_DB_FILE" | cut -f1))"
else
    echo "   ❌ LỖI: File backup DB rỗng! DỪNG LẠI NGAY LẬP TỨC."
    exit 1
fi

echo "💾 2. Đang sao lưu thư mục tải lên uploads/ (chữ ký, avatar, chứng chỉ)..."
BACKUP_UPLOADS_FILE="$BACKUP_DIR/cmms_uploads_$TIMESTAMP.tar.gz"
if [ -d "cmms-backend/uploads" ]; then
    tar -czf "$BACKUP_UPLOADS_FILE" -C cmms-backend uploads
    echo "   ✅ Backup Uploads thành công: $BACKUP_UPLOADS_FILE ($(du -h "$BACKUP_UPLOADS_FILE" | cut -f1))"
elif [ -d "uploads" ]; then
    tar -czf "$BACKUP_UPLOADS_FILE" uploads
    echo "   ✅ Backup Uploads thành công: $BACKUP_UPLOADS_FILE ($(du -h "$BACKUP_UPLOADS_FILE" | cut -f1))"
else
    echo "   ℹ️ Chưa thấy thư mục uploads cục bộ (có thể đang dùng volume)."
fi
```

---

### BƯỚC 4: ĐỒNG BỘ MÃ NGUỒN TỪ GITHUB
```bash
echo "📥 Đang kéo mã nguồn mới nhất từ GitHub..."
git fetch origin main

# Đồng bộ nhánh main
git checkout main
git pull origin main

echo "✅ Mã nguồn hiện tại: $(git log -1 --oneline)"
```

---

### BƯỚC 5: BUILD DOCKER IMAGES TUẦN TỰ (CHỐNG NGHẼN CPU/RAM)
*Lưu ý: Tuyệt đối KHÔNG gõ `docker compose build` để tránh build 2 service cùng lúc gây sập server.*
```bash
# 1. Build Backend trước
echo "🏗️ Đang build Image Backend..."
docker compose build backend

# 2. Build Frontend sau (truyền đúng REACT_APP_BASE_URL từ .env)
echo "🏗️ Đang build Image Frontend..."
docker compose build frontend

echo "✅ Đã build xong tất cả Docker Images mới an toàn."
```

---

### BƯỚC 6: TÁI TẠO CONTAINER & CHẠY DATABASE MIGRATION
```bash
# 1. Khởi động lại Backend với Image mới
echo "🔄 Khởi động Backend container mới..."
docker compose up -d --no-deps backend

# Đợi Backend sẵn sàng 5 giây
sleep 5

# 2. Chạy Database Migration TypeORM
echo "⚙️ Đang thực thi Database Migration..."
docker compose exec -T backend npx typeorm migration:run -d dist/data-source.js

# 3. Khởi động lại Frontend với Image mới
echo "🔄 Khởi động Frontend container mới..."
docker compose up -d --no-deps frontend
```

---

### BƯỚC 7: KIỂM TRA TRẠNG THÁI VÀ LOGS HỆ THỐNG
```bash
echo "📊 Kiểm tra trạng thái containers:"
docker compose ps

echo "📋 Log 30 dòng gần nhất của Backend (đảm bảo không crash):"
docker logs --tail 30 cmms_backend

echo "📋 Log 20 dòng gần nhất của Frontend:"
docker logs --tail 20 cmms_frontend

# Dọn dẹp các Image trung gian (dangling images) để tiết kiệm ổ cứng
docker image prune -f

echo "🎉 CHÚC MỪNG: BẢN CẬP NHẬT ĐÃ ĐƯỢC DEPLOY THÀNH CÔNG!"
```

---

## 🆘 KỊCH BẢN KHÔI PHỤC KHẨN CẤP (ROLLBACK PLAN)
Nếu sau khi deploy phát hiện lỗi nghiêm trọng (màn hình trắng, backend crash loop):

1. **Khôi phục lại mã nguồn phiên bản trước:**
   ```bash
   # Quay về commit ổn định trước đó
   git checkout HEAD~1
   docker compose build backend
   docker compose build frontend
   docker compose up -d --no-deps backend frontend
   ```

2. **Khôi phục lại Database từ file snapshot vừa backup:**
   ```bash
   source .env
   gunzip < ~/backups_cmms/[TÊN_FILE_BACKUP_DB].sql.gz | docker exec -i cmms_db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
   ```

3. **Khôi phục lại thư mục Uploads (nếu có):**
   ```bash
   tar -xzf ~/backups_cmms/[TÊN_FILE_BACKUP_UPLOADS].tar.gz -C cmms-backend/
   ```
```

---

## ⚡ BONUS: SCRIPT TỰ ĐỘNG HÓA `deploy.sh` TẤT CẢ TRONG MỘT

Để trên server chỉ cần gõ duy nhất 1 lệnh mà không lo gõ sai bước nào, bạn chỉ cần tạo file `deploy.sh` tại thư mục gốc của project:

```bash
#!/bin/bash
set -e

echo "=================================================================="
echo "🚀 BẮT ĐẦU QUY TRÌNH DEPLOY CMMS VCS AN TOÀN TUYỆT ĐỐI"
echo "=================================================================="

# 1. ĐẢM BẢO THƯ MỤC LÀM VIỆC
if [ ! -f "docker-compose.yml" ] || [ ! -f ".env" ]; then
    echo "❌ LỖI: Script phải được chạy từ thư mục gốc của dự án (chứa docker-compose.yml và .env)!"
    exit 1
fi

# 2. KIỂM TRA & KÍCH HOẠT SWAP
TOTAL_SWAP=$(free -m | awk '/Swap:/ {print $2}')
if [ "$TOTAL_SWAP" -lt 2048 ]; then
    echo "⚠️ Swap nhỏ hơn 2GB ($TOTAL_SWAP MB). Đang kích hoạt 4GB Swap an toàn..."
    if [ ! -f /swapfile ]; then
        sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        grep -q "/swapfile" /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    else
        sudo swapon /swapfile || true
    fi
fi
echo "✅ Bộ nhớ Swap sẵn sàng."

# 3. RÀ SOÁT BIẾN MÔI TRƯỜNG .ENV
set -a
source .env
set +a

if [ -z "$REACT_APP_BASE_URL" ]; then
    echo "❌ LỖI: REACT_APP_BASE_URL đang bị trống trong .env!"
    exit 1
fi

if [[ "$REACT_APP_BASE_URL" =~ localhost|127\.0\.0\.1|cmms_backend ]]; then
    echo "❌ LỖI: REACT_APP_BASE_URL đang trỏ về '$REACT_APP_BASE_URL'!"
    echo "   Vui lòng sửa thành Domain hoặc IP công khai kết thúc bằng /api trước khi deploy."
    exit 1
fi

if [[ ! "$REACT_APP_BASE_URL" =~ /api$ ]]; then
    echo "❌ LỖI: REACT_APP_BASE_URL phải kết thúc chính xác bằng '/api' (hiện tại: $REACT_APP_BASE_URL)!"
    exit 1
fi
echo "✅ Cấu hình .env chuẩn xác: REACT_APP_BASE_URL=$REACT_APP_BASE_URL"

# 4. BACKUP DỮ LIỆU
BACKUP_DIR="$HOME/backups_cmms"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cmms_db_$TIMESTAMP.sql.gz"

echo "💾 Đang sao lưu Database PostgreSQL..."
docker exec -t cmms_db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-cmms_db}" | gzip > "$BACKUP_FILE"
if [ -s "$BACKUP_FILE" ]; then
    echo "✅ Backup Database hoàn tất: $BACKUP_FILE"
else
    echo "❌ LỖI: Backup rỗng! Dừng tiến trình."
    exit 1
fi

echo "💾 Đang sao lưu thư mục uploads..."
if [ -d "cmms-backend/uploads" ]; then
    tar -czf "$BACKUP_DIR/cmms_uploads_$TIMESTAMP.tar.gz" -C cmms-backend uploads || true
elif [ -d "uploads" ]; then
    tar -czf "$BACKUP_DIR/cmms_uploads_$TIMESTAMP.tar.gz" uploads || true
fi

# 5. KÉO CODE MỚI
echo "📥 Đang kéo mã nguồn mới nhất từ origin/main..."
git fetch origin main
git checkout main
git pull origin main

# 6. BUILD TUẦN TỰ (CHỐNG SẬP RAM)
echo "🏗️ Đang build Backend..."
docker compose build backend

echo "🏗️ Đang build Frontend..."
docker compose build frontend

# 7. KHỞI ĐỘNG LẠI DỊCH VỤ & CHẠY MIGRATION
echo "🔄 Khởi động lại Backend..."
docker compose up -d --no-deps backend
sleep 5

echo "⚙️ Thực thi Database Migration..."
docker compose exec -T backend npx typeorm migration:run -d dist/data-source.js || true

echo "🔄 Khởi động lại Frontend..."
docker compose up -d --no-deps frontend

# 8. DỌN DẸP DUNG LƯỢNG
docker image prune -f

echo "=================================================================="
echo "🎉 DEPLOY THÀNH CÔNG VÀ AN TOÀN TUYỆT ĐỐI!"
echo "Database Snapshot: $BACKUP_FILE"
echo "Kiểm tra log: docker logs --tail 30 cmms_backend"
echo "=================================================================="
```

### Cách cấp quyền thực thi và chạy trên Server:
```bash
chmod +x deploy.sh
./deploy.sh
```
