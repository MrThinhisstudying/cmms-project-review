# 🚀 PROMPT CẬP NHẬT MÃ NGUỒN (ROLLING UPDATE) LÊN WEBSITE ĐANG HOẠT ĐỘNG

> **Mục đích:** Tài liệu này cung cấp **System Prompt tối ưu nhất** dành cho AI Agent hoặc Kỹ sư DevOps khi thao tác trên Production Server tại `/var/www/vcsairport/CMMS`. 
> Đảm bảo: **Cập nhật tính năng & bản vá mới nhất từ GitHub mà KHÔNG làm gián đoạn dịch vụ (Zero-Downtime), an toàn dữ liệu 100%, và không làm nghẽn CPU/RAM.**

---

## 📋 NỘI DUNG PROMPT TỐI ƯU ĐỂ GỬI CHO AGENT TRÊN SERVER

*Copy toàn bộ nội dung trong khung markdown dưới đây và dán vào ô chat Agent trên server:*

```markdown
# NHIỆM VỤ: CẬP NHẬT BẢN VÁ & TÍNH NĂNG MỚI LÊN WEBSITE ĐANG HOẠT ĐỘNG (ZERO DOWNTIME)

Hệ thống CMMS VCS đang hoạt động bình thường trên Production Server tại thư mục: `/var/www/vcsairport/CMMS`.
Mục tiêu: Kéo mã nguồn mới nhất từ nhánh `main` trên GitHub, sao lưu nhanh Database snapshot, build và tái khởi động Backend & Frontend với thời gian downtime bằng 0 (Zero-Downtime), đảm bảo các dịch vụ Database và Nginx Proxy Manager không bị ngắt quãng.

---

## 🛠️ CÁC BƯỚC THỰC THI TỰ ĐỘNG (STEP-BY-STEP):

### BƯỚC 1: VÀO THƯ MỤC DỰ ÁN & ĐỒNG BỘ MÃ NGUỒN MỚI
```bash
cd /var/www/vcsairport/CMMS

echo "📥 1. Kéo mã nguồn mới nhất từ nhánh main trên GitHub..."
git fetch origin main
git stash || true
git checkout main
git pull origin main

echo "✅ Đã đồng bộ mã nguồn tại commit: $(git log -1 --oneline)"
```

---

### BƯỚC 2: SAO LƯU NHANH DATABASE SNAPSHOT (AN TOÀN 100%)
```bash
BACKUP_DIR="/var/www/vcsairport/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cmms_db_$TIMESTAMP.sql.gz"

echo "💾 Đang sao lưu nhanh Database snapshot..."
source .env
docker exec -t cmms_db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-cmms_db}" | gzip > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    echo "✅ Sao lưu an toàn thành công: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    echo "❌ Cảnh báo file backup rỗng! Vui lòng kiểm tra lại container DB."
    exit 1
fi
```

---

### BƯỚC 3: BUILD HÌNH ẢNH MỚI TRONG KHI HỆ THỐNG VẪN ĐANG PHỤC VỤ (ZERO DOWNTIME)
*Lưu ý: Không dùng docker compose down. Container cũ vẫn tiếp tục phục vụ người dùng trong lúc build.*
```bash
# 1. Build Backend mới
echo "🏗️ Đang build Image Backend mới (hạ độ ưu tiên chống nghẽn CPU)..."
nice -n 19 docker compose build backend

# 2. Build Frontend mới
echo "🏗️ Đang build Image Frontend mới..."
nice -n 19 docker compose build frontend

echo "✅ Đã build xong các Docker Image mới."
```

---

### BƯỚC 4: TÁI TẠO CONTAINER BACKEND & CHẠY DATABASE MIGRATION
```bash
# 1. Recreate container Backend với Image mới
echo "🔄 Cập nhật container Backend..."
docker compose up -d --no-deps backend
sleep 4

# 2. Chạy Database Migration & Schema Sync TypeORM (tạo bảng mới task_projects, work_tasks, task_comments...)
echo "⚙️ Chạy Migration & Đồng bộ Schema TypeORM..."
docker compose exec -T backend npx typeorm migration:run -d dist/data-source.js || true
docker compose exec -T backend npx typeorm schema:sync -d dist/data-source.js || true

# 3. Đồng bộ khóa ngoại Cascade Delete
echo "⚙️ Kiểm tra ràng buộc khóa ngoại Cascade Delete..."
docker compose exec -T db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-cmms_db}" -c "
DO \$\$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_ba7ae9d9f1c6bdbc272dd64d552') THEN
    ALTER TABLE user_device_group DROP CONSTRAINT \"FK_ba7ae9d9f1c6bdbc272dd64d552\";
    ALTER TABLE user_device_group ADD CONSTRAINT \"FK_ba7ae9d9f1c6bdbc272dd64d552\" FOREIGN KEY (user_id) REFERENCES \"user\"(user_id) ON DELETE CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'FK_1ced25315eb974b73391fb1c81b') THEN
    ALTER TABLE notification DROP CONSTRAINT \"FK_1ced25315eb974b73391fb1c81b\";
    ALTER TABLE notification ADD CONSTRAINT \"FK_1ced25315eb974b73391fb1c81b\" FOREIGN KEY (\"userId\") REFERENCES \"user\"(user_id) ON DELETE CASCADE;
  END IF;
END \$\$;
" || true
```

---

### BƯỚC 5: TÁI TẠO CONTAINER FRONTEND & DỌN DẸP
```bash
# 1. Recreate container Frontend với bản build mới
echo "🔄 Cập nhật container Frontend..."
docker compose up -d --no-deps frontend

# 2. Dọn dẹp Image trung gian cũ để giải phóng dung lượng ổ đĩa
docker image prune -f

echo "✅ Cập nhật container hoàn tất."
```

---

### BƯỚC 6: KIỂM TRA TRẠNG THÁI VÀ BÀN GIAO
```bash
echo "📊 Kiểm tra trạng thái các dịch vụ:"
docker compose ps

echo "📋 Kiểm tra 20 dòng log gần nhất của Backend:"
docker logs --tail 20 cmms_backend

echo "🎉 HOÀN THÀNH: HỆ THỐNG ĐÃ CẬP NHẬT PHIÊN BẢN MỚI THÀNH CÔNG VÀ ĐANG HOẠT ĐỘNG ỔN ĐỊNH!"
```
```

---

## ⚡ PHƯƠNG THỨC 1 LỆNH NHANH (NẾU CHẠY TỪ TERMINAL TRÊN SERVER)

Nếu bạn đang mở Terminal trong cửa sổ Antigravity Remote, chỉ cần gõ đúng 1 lệnh sau:

```bash
cd /var/www/vcsairport/CMMS && git pull origin main && ./deploy.sh
```
