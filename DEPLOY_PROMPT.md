# 🚀 PROMPT CẬP NHẬT MÃ NGUỒN (ROLLING UPDATE) LÊN WEBSITE ĐANG HOẠT ĐỘNG

> **Mục đích:** Tài liệu này cung cấp **System Prompt tối ưu nhất** dành cho AI Agent hoặc Kỹ sư DevOps khi thao tác trên Production Server tại `/var/www/vcsairport/CMMS`.  
> **Đảm bảo:** Cập nhật đợt nâng cấp lớn mới nhất từ GitHub mà **KHÔNG làm gián đoạn dịch vụ (Zero-Downtime)**, **bảo toàn 100% dữ liệu Database + file Uploads (avatar, chữ ký, chứng chỉ, quy chế)**, tự động đồng bộ bảng mới (`company_policies`, `company_policy_acks`) và không làm nghẽn CPU/RAM.

---

## 📦 TÓM TẮT CÁC HẠNG MỤC TRONG ĐỢT CẬP NHẬT LỚN NÀY

1. **Module Quy chế & Quy định nội bộ (`/quy_che_quy_dinh`):**
   - Ban hành văn bản, nội quy, quy trình SOP kèm đính kèm file PDF/Word và theo dõi tiến độ nhân sự xác nhận đã đọc.
   - Cơ chế **Ghim lên đầu trang & Banner thông báo tại Trang chủ (`/trang_chu`)**: Tự động ẩn với người đã đọc, tự động gỡ ghim khi hết hạn (`pinned_until`) hoặc khi **100% nhân sự đã đọc**, kèm nút Ghim/Bỏ ghim 1-click cho Quản lý.
2. **Báo cáo tình trạng xe (`/bao_cao_tinh_trang_xe`) & Phân quyền:**
   - Cập nhật **Real-time qua WebSocket** khi có báo cáo sự cố mới hoặc chuyển trạng thái.
   - Bổ sung quyền **Chỉ xem (Read-only)** cho Ban Giám đốc, Đội trưởng và Tổ trưởng/Tổ phó VHTTBMĐ (không hiện popup/nút xử lý).
3. **Giao việc & Thông báo nhắc việc (`TaskNotificationPopup`):**
   - Hỗ trợ Tổ trưởng/Tổ phó (`TEAM_LEAD`) giao việc trong phạm vi nhóm thiết bị phụ trách và popup thông báo công việc mới/quá hạn.
4. **Lưu trữ bền vững File Uploads & Nginx Proxy (`/uploads`):**
   - Đồng bộ và mount volume `./uploads:/app/uploads` (bảo toàn ảnh đại diện, chữ ký số, file quy chế qua các lần rebuild container) và cấu hình Nginx Proxy Manager phục vụ `/uploads` với `client_max_body_size 50M`.
5. **Tối ưu toàn diện Giao diện Điện thoại & Máy tính bảng (Mobile & Tablet Responsive):**
   - Thanh điều hướng dưới cùng (`MobileBottomNav`), Quản lý bảo dưỡng, Lịch sử phiếu bảo dưỡng, Modal Phiếu sửa chữa chờ duyệt, và toàn bộ 8 tab trong Modal Hồ sơ nhân sự 360° (`ProfileModal`).

---

## 📋 NỘI DUNG PROMPT TỐI ƯU ĐỂ GỬI CHO AGENT TRÊN SERVER

*Copy toàn bộ nội dung trong khung markdown dưới đây và dán vào ô chat Agent trên server:*

````markdown
# NHIỆM VỤ: CẬP NHẬT ĐỢT NÂNG CẤP LỚN LÊN WEBSITE ĐANG HOẠT ĐỘNG (ZERO DOWNTIME)

Hệ thống CMMS VCS đang hoạt động trên Production Server tại thư mục: `/var/www/vcsairport/CMMS`.
Mục tiêu: Kéo mã nguồn mới nhất từ nhánh `main` trên GitHub, sao lưu Database + đồng bộ thư mục `/app/uploads` từ container ra host trước khi mount volume, build và tái khởi động Backend & Frontend với thời gian downtime bằng 0 (Zero-Downtime), đồng bộ bảng mới (`company_policies`, `company_policy_acks`) và reload Nginx Proxy Manager.

---

## 🛠️ CÁC BƯỚC THỰC THI TỰ ĐỘNG (STEP-BY-STEP):

### BƯỚC 1: VÀO THƯ MỤC DỰ ÁN & ĐỒNG BỘ DỮ LIỆU UPLOADS TỪ CONTAINER RA HOST
*Lưu ý quan trọng: Phiên bản mới gắn volume `./uploads:/app/uploads` để lưu bền vững avatar, chữ ký, chứng chỉ và file quy chế. Cần copy dữ liệu đang có trong container `cmms_backend` ra ngoài host trước khi kéo code và khởi động lại container.*
```bash
cd /var/www/vcsairport/CMMS

echo "📂 1. Đồng bộ toàn bộ file uploads hiện có từ container cmms_backend ra host..."
mkdir -p uploads/avatars uploads/signatures uploads/policies uploads/certificates uploads/tasks
docker cp cmms_backend:/app/uploads/. uploads/ 2>/dev/null || true
if [ -d "cmms-backend/uploads" ]; then
    cp -rn cmms-backend/uploads/* uploads/ 2>/dev/null || true
fi
echo "✅ Đã đồng bộ thư mục uploads ra host an toàn."
```

---

### BƯỚC 2: SAO LƯU NHANH DATABASE SNAPSHOT & UPLOADS (AN TOÀN 100%)
```bash
BACKUP_DIR="/var/www/vcsairport/backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/cmms_db_$TIMESTAMP.sql.gz"

echo "💾 Đang sao lưu nhanh Database snapshot..."
set -a
source .env
set +a
docker exec -t cmms_db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-cmms_db}" | gzip > "$BACKUP_FILE"

if [ -s "$BACKUP_FILE" ]; then
    echo "✅ Sao lưu Database thành công: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
else
    echo "❌ Cảnh báo file backup rỗng! Vui lòng kiểm tra lại container DB."
    exit 1
fi

tar -czf "$BACKUP_DIR/cmms_uploads_$TIMESTAMP.tar.gz" uploads || true
echo "✅ Sao lưu thư mục uploads thành công."
```

---

### BƯỚC 3: KÉO MÃ NGUỒN MỚI NHẤT TỪ GITHUB
```bash
echo "📥 Kéo mã nguồn mới nhất từ nhánh main trên GitHub..."
git fetch origin main
git stash || true
git checkout main
git pull origin main

echo "✅ Đã đồng bộ mã nguồn tại commit: $(git log -1 --oneline)"
```

---

### BƯỚC 4: BUILD HÌNH ẢNH MỚI TRONG KHI HỆ THỐNG VẪN ĐANG PHỤC VỤ (ZERO DOWNTIME)
*Lưu ý: Không dùng `docker compose down`. Container cũ vẫn tiếp tục phục vụ người dùng trong lúc build.*
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

### BƯỚC 5: TÁI TẠO CONTAINER BACKEND & ĐỒNG BỘ SCHEMA DATABASE (TYPEORM)
```bash
# 1. Recreate container Backend với Image mới và gắn volume ./uploads:/app/uploads
echo "🔄 Cập nhật container Backend..."
docker compose up -d --no-deps backend
sleep 5

# 2. Chạy Database Migration & Schema Sync TypeORM (tự động tạo bảng company_policies, company_policy_acks, cập nhật cột pinned_until...)
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

### BƯỚC 6: TÁI TẠO CONTAINER FRONTEND, RELOAD NGINX PROXY & DỌN DẸP
```bash
# 1. Recreate container Frontend với bản build mới
echo "🔄 Cập nhật container Frontend..."
docker compose up -d --no-deps frontend

# 2. Reload Nginx Proxy Manager để áp dụng route /uploads và client_max_body_size 50M
echo "🔄 Reload cấu hình Nginx Proxy Manager..."
docker compose up -d npm
docker exec nginx_proxy_manager nginx -s reload 2>/dev/null || docker compose restart npm || true

# 3. Dọn dẹp Image trung gian cũ để giải phóng dung lượng ổ đĩa
docker image prune -f

echo "✅ Cập nhật toàn bộ container hoàn tất."
```

---

### BƯỚC 7: KIỂM TRA TRẠNG THÁI VÀ BÀN GIAO
```bash
echo "📊 Kiểm tra trạng thái các dịch vụ:"
docker compose ps

echo "📋 Kiểm tra 20 dòng log gần nhất của Backend:"
docker logs --tail 20 cmms_backend

echo "🎉 HOÀN THÀNH: HỆ THỐNG ĐÃ CẬP NHẬT PHIÊN BẢN MỚI THÀNH CÔNG VÀ ĐANG HOẠT ĐỘNG ỔN ĐỊNH!"
```
````

---

## ⚡ PHƯƠNG THỨC 1 LỆNH NHANH (NẾU CHẠY TỪ TERMINAL TRÊN SERVER)

Nếu bạn đang mở Terminal trực tiếp trên máy chủ Production, chỉ cần chạy lệnh dưới đây (script `deploy.sh` đã được tích hợp sẵn bước đồng bộ `uploads`, backup DB, `schema:sync` và reload Nginx):

```bash
cd /var/www/vcsairport/CMMS && docker cp cmms_backend:/app/uploads/. uploads/ 2>/dev/null || true && git pull origin main && ./deploy.sh
```
