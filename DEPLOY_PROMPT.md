# 🚀 PROMPT TRIỂN KHAI BẢN CẬP NHẬT (DEPLOY) LÊN SERVER AN TOÀN

> **Mục đích:** Tài liệu này cung cấp **System Prompt chuẩn** dành cho AI Agent hoặc Kỹ sư DevOps khi SSH vào Production Server để cập nhật code mới cho hệ thống **CMMS VCS**. Đảm bảo:
> 1. **An toàn dữ liệu 100%:** Luôn backup snapshot database PostgreSQL trước khi can thiệp.
> 2. **Chống sụp server (Anti-OOM):** Ngăn chặn triệt để tình trạng Out Of Memory khi build Docker/Node.js làm đứng server.
> 3. **Không gián đoạn dịch vụ (High Availability):** Không dùng `docker compose down`, build image mới trước khi tái khởi động container.

---

## 📋 NỘI DUNG PROMPT ĐỂ COPY

*Copy toàn bộ nội dung trong khung dưới đây để gửi cho AI Agent hoặc Kỹ sư thực hiện:*

```markdown
# NHIỆM VỤ: CẬP NHẬT MÃ NGUỒN (BIG UPDATE) LÊN SERVER PRODUCTION AN TOÀN

Bạn đang thực hiện thao tác trên Production Server của hệ thống CMMS VCS. 
Mục tiêu: Đồng bộ mã nguồn mới từ GitHub, build và khởi chạy phiên bản mới mà KHÔNG làm sập server do thiếu RAM (OOM Killer), KHÔNG làm mất mát dữ liệu và GIẢM THIỂU tối đa thời gian downtime.

---

## ⚠️ 3 NGUYÊN TẮC BẤT DI BẤT DỊCH:
1. **AN TOÀN DỮ LIỆU LÀ SỐ 1:** BẮT BUỘC sao lưu Database PostgreSQL (`pg_dump`) trước khi pull code hoặc chạy migration. Nếu bước backup thất bại hoặc file backup rỗng, DỪNG LẠI NGAY LẬP TỨC.
2. **CHỐNG SỤP SERVER (ANTI-OOM KILLER):** 
   - Kiểm tra bộ nhớ SWAP (yêu cầu tối thiểu 2GB - 4GB SWAP). Nếu chưa có, phải tạo/bật SWAP trước khi build.
   - TUYỆT ĐỐI KHÔNG build song song Frontend và Backend cùng lúc. Phải build tuần tự từng container để tránh CPU và RAM bị nghẽn 100%.
   - Đảm bảo giữ giới hạn RAM khi build qua biến môi trường: `NODE_OPTIONS="--max_old_space_size=512"`.
3. **ZERO-DOWNTIME (KHÔNG DÙNG DOCKER COMPOSE DOWN):**
   - TUYỆT ĐỐI KHÔNG gõ `docker compose down` vì sẽ ngắt kết nối Database và Proxy ngay từ đầu quá trình build kéo dài nhiều phút.
   - Thứ tự chuẩn: Giữ dịch vụ cũ chạy -> Build Image mới -> Chạy Migration -> Recreate container Backend/Frontend -> Dọn dẹp cache.

---

## 🛠️ CÁC BƯỚC TRIỂN KHAI CHI TIẾT (STEP-BY-STEP):

### BƯỚC 1: KIỂM TRA TÀI NGUYÊN & KÍCH HOẠT BỘ NHỚ ẢO (SWAP)
Kiểm tra tình trạng bộ nhớ:
```bash
free -h
```
Nếu mục `Swap` hiển thị `0B` hoặc nhỏ hơn 2GB, hãy kích hoạt ngay 4GB Swap an toàn:
```bash
sudo fallocate -l 4G /swapfile || sudo dd if=/dev/zero of=/swapfile bs=1M count=4096
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
# Cấu hình lưu vĩnh viễn sau khi reboot
grep -q "/swapfile" /etc/fstab || echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### BƯỚC 2: SAO LƯU DỮ LIỆU DATABASE POSTGRESQL (CRITICAL)
Tạo thư mục sao lưu nằm ngoài source code và xuất snapshot:
```bash
mkdir -p ~/backups_cmms
BACKUP_PATH=~/backups_cmms/cmms_db_$(date +%Y%m%d_%H%M%S).sql.gz

# Đọc cấu hình từ .env
source .env

# Xuất dữ liệu nén
docker exec -t cmms_db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-cmms_db}" | gzip > "$BACKUP_PATH"

# Xác nhận file backup hợp lệ (> 0 byte)
if [ -s "$BACKUP_PATH" ]; then
    echo "✅ Backup thành công: $BACKUP_PATH ($(du -h "$BACKUP_PATH" | cut -f1))"
else
    echo "❌ LỖI: File backup không có dữ liệu! DỪNG NGAY QUY TRÌNH."
    exit 1
fi
```

### BƯỚC 3: ĐỒNG BỘ MÃ NGUỒN MỚI TỪ GITHUB
```bash
git fetch origin --tags
# Khuyến nghị: Deploy theo Tag phát hành chính thức
git checkout tags/v2.0.0
# Hoặc nếu deploy theo nhánh main:
# git checkout main && git pull origin main
```
Kiểm tra file `.env` xem có bổ sung biến môi trường mới nào không.

### BƯỚC 4: BUILD DOCKER IMAGES TUẦN TỰ (CHỐNG NGHẼN RAM/CPU)
*Lưu ý: Không dùng `docker compose build` (mặc định build đồng thời). Hãy build tuần tự từng dịch vụ:*
```bash
# 1. Build Backend trước
docker compose build backend

# 2. Build Frontend sau
docker compose build frontend
```

### BƯỚC 5: TÁI TẠO DỊCH VỤ VÀ CHẠY DATABASE MIGRATION
Khởi động container Backend với image mới:
```bash
docker compose up -d --no-deps backend
```

Chạy Database Migration (TypeORM) trên bản JS đã compile trong `dist`:
```bash
docker compose exec -T backend npx typeorm migration:run -d dist/data-source.js
```

Khởi động container Frontend với image mới:
```bash
docker compose up -d --no-deps frontend
```

### BƯỚC 6: XÁC THỰC HOẠT ĐỘNG (HEALTH CHECK & LOGS)
Xem logs để đảm bảo hệ thống kết nối Database và khởi động thành công:
```bash
# Xem 50 dòng log mới nhất của Backend
docker logs --tail 50 cmms_backend

# Xem log Frontend
docker logs --tail 30 cmms_frontend

# Kiểm tra trạng thái toàn bộ containers
docker compose ps
```

### BƯỚC 7: DỌN DẸP BỘ NHỚ VÀ IMAGE CŨ
Giải phóng dung lượng ổ cứng bị chiếm bởi các image cũ sau khi build:
```bash
docker image prune -f
```

---

## 🆘 KỊCH BẢN KHÔI PHỤC KHẨN CẤP (ROLLBACK PLAN)
Nếu sau khi deploy phát hiện lỗi nghiêm trọng (Backend crash loop, giao diện trắng, lỗi API diện rộng):

1. **Quay lại phiên bản code trước:**
   ```bash
   git checkout tags/v1.0-stable # hoặc commit hash cũ
   docker compose build backend frontend
   docker compose up -d --no-deps backend frontend
   ```
2. **Khôi phục Database từ snapshot đã backup ở Bước 2 (nếu cấu trúc bảng bị hỏng):**
   ```bash
   source .env
   gunzip < ~/backups_cmms/[TÊN_FILE_BACKUP].sql.gz | docker exec -i cmms_db psql -U "$POSTGRES_USER" "$POSTGRES_DB"
   ```
```

---

## ⚡ BONUS: SCRIPT TỰ ĐỘNG HÓA `deploy.sh` SẴN DÙNG TRÊN SERVER

Để đơn giản hóa và loại bỏ sai sót do gõ lệnh thủ công, bạn chỉ cần tạo file `deploy.sh` trên server:

```bash
#!/bin/bash
set -e

echo "========================================================"
echo "🚀 BẮT ĐẦU QUY TRÌNH DEPLOY CMMS VCS AN TOÀN"
echo "========================================================"

BACKUP_DIR="$HOME/backups_cmms"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cmms_db_$TIMESTAMP.sql.gz"

# 1. BẢO ĐẢM BỘ NHỚ SWAP
TOTAL_SWAP=$(free -m | awk '/Swap:/ {print $2}')
if [ "$TOTAL_SWAP" -lt 2048 ]; then
    echo "⚠️ Swap hiện tại nhỏ hơn 2GB ($TOTAL_SWAP MB). Đang kích hoạt 4GB Swap an toàn..."
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

# 2. BACKUP DATABASE
echo "💾 Đang backup Database PostgreSQL..."
if docker ps --format '{{.Names}}' | grep -q "^cmms_db$"; then
    source .env
    docker exec -t cmms_db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-cmms_db}" | gzip > "$BACKUP_FILE"
    if [ -s "$BACKUP_FILE" ]; then
        echo "✅ Backup hoàn tất: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
    else
        echo "❌ LỖI: Backup rỗng! Dừng tiến trình."
        exit 1
    fi
fi

# 3. KÉO CODE
TARGET="${1:-v2.0.0}"
echo "📥 Đang đồng bộ code mục tiêu: $TARGET ..."
git fetch origin --tags
git checkout "$TARGET"
if [ "$TARGET" = "main" ]; then
    git pull origin main
fi

# 4. BUILD TUẦN TỰ
echo "🏗️ Đang build Backend..."
docker compose build backend

echo "🏗️ Đang build Frontend..."
docker compose build frontend

# 5. RESTART DỊCH VỤ & MIGRATE
echo "🔄 Khởi động lại Backend..."
docker compose up -d --no-deps backend

echo "⚙️ Chạy Database Migration..."
docker compose exec -T backend npx typeorm migration:run -d dist/data-source.js || true

echo "🔄 Khởi động lại Frontend..."
docker compose up -d --no-deps frontend

# 6. DỌN DẸP
docker image prune -f

echo "========================================================"
echo "🎉 DEPLOY THÀNH CÔNG!"
echo "Database Snapshot lưu tại: $BACKUP_FILE"
echo "Kiểm tra log: docker logs --tail 30 cmms_backend"
echo "========================================================"
```

### Cách cấp quyền và chạy trên server:
```bash
chmod +x deploy.sh
./deploy.sh v2.0.0
```
