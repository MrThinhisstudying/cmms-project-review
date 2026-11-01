# 🚀 PROMPT TRIỂN KHAI BẢN CẬP NHẬT (DEPLOY) LÊN PRODUCTION SERVER AN TOÀN TUYỆT ĐỐI

> **Mục đích:** Tài liệu này cung cấp **System Prompt chuẩn** dành cho AI Agent hoặc Kỹ sư DevOps khi SSH vào Production Server để chẩn đoán sự cố, phục hồi hệ thống sau khi reboot/chuyển hạ tầng và cập nhật code cho hệ thống **CMMS VCS**. Đảm bảo:
> 1. **Cập nhật hạ tầng Mắt Bão (01/11/2026):** Rà soát chuyển đổi từ **IP cũ (`103.15.50.119`)** sang **IP mới (`103.110.128.209`)**, hướng dẫn lấy lại mật khẩu SSH trên ID Portal và cấu hình lại DNS A Record.
> 2. **Kiểm tra đường dẫn file `.env` 100% chuẩn xác:** Tránh triệt để lỗi gõ nhầm `REACT_APP_BASE_URL` (sai domain, thiếu `/api`, thừa dấu gạch chéo `/`, dùng IP cũ, hoặc nhầm `localhost`).
> 3. **An toàn dữ liệu tuyệt đối (Zero Data Loss):** Tự động bật Database trước khi backup, sao lưu cả Database PostgreSQL (`pg_dump`) lẫn file đính kèm thực tế (`uploads/`).
> 4. **Chống sụp/treo Server (Anti-OOM & Anti-Freeze):** Kích hoạt 4GB RAM ảo (SWAP), tinh chỉnh `vm.swappiness=10`, khóa RAM build 512MB và hạ độ ưu tiên tiến trình build (`nice -n 19`) để SSH không bị đơ kẹt.
> 5. **Bảo vệ vĩnh viễn (Log Rotation & Auto Restart):** Đã tích hợp `restart: unless-stopped` và giới hạn kích thước log tối đa 20MB trong `docker-compose.yml`.

---

## 🔴 THÔNG TIN NÂNG CẤP HẠ TẦNG CLOUD SERVER MẮT BÃO
*(Áp dụng từ đợt bảo trì đêm 31/10/2026 - rạng sáng 01/11/2026)*

| Mục thông tin | Chi tiết |
| :--- | :--- |
| **Nhà cung cấp** | Cloud Server Mắt Bão |
| **Địa chỉ IP CŨ** | `103.15.50.119` *(Không còn hoạt động)* |
| **Địa chỉ IP MỚI** | **`103.110.128.209`** *(Địa chỉ chính thức)* |
| **Lệnh SSH mới** | `ssh root@103.110.128.209` |
| **Mật khẩu SSH** | Đã được hệ thống Mắt Bão tự động khởi tạo lại. Lấy tại: [https://id.matbao.net](https://id.matbao.net) |
| **Bản ghi DNS A** | **Bắt buộc** trỏ tất cả bản ghi A của Tên miền sang **`103.110.128.209`** |

---

## 📋 NỘI DUNG PROMPT ĐỂ COPY GỬI CHO AGENT / DEVOPS

*Copy toàn bộ nội dung trong khung markdown dưới đây để gửi cho AI Agent hoặc Kỹ sư thực hiện trên server:*

```markdown
# NHIỆM VỤ: PHỤC HỒI HỆ THỐNG SAU CHUYỂN HẠ TẦNG IP & CẬP NHẬT MÃ NGUỒN AN TOÀN

Bạn đang thao tác trực tiếp trên Production Server của hệ thống CMMS VCS (sau khi nhà mạng Mắt Bão nâng cấp hạ tầng và đổi IP máy chủ từ 103.15.50.119 sang 103.110.128.209).

Mục tiêu:
1. Xác nhận IP mới (103.110.128.209) và kiểm tra dung lượng ổ đĩa, đảm bảo Docker daemon hoạt động.
2. Kiểm tra file cấu hình .env (ngăn chặn triệt để việc còn sót IP cũ 103.15.50.119 hoặc localhost).
3. Khởi động trước Database để sao lưu an toàn 100% (không bị lỗi rỗng file backup).
4. Đồng bộ mã nguồn mới nhất từ nhánh `main` trên GitHub.
5. Build tuần tự và khởi động lại Backend, Frontend, Nginx Proxy Manager với cơ chế chống nghẽn CPU/RAM (Anti-Freeze).

---

## ⚠️ 5 NGUYÊN TẮC BẤT DI BẤT DỊCH:
1. **IP MỚI LÀ 103.110.128.209:** Tuyệt đối không để cấu hình `.env` trỏ về IP cũ `103.15.50.119` hoặc `localhost`. Biến `REACT_APP_BASE_URL` BẮT BUỘC kết thúc bằng `/api` (Ví dụ: `https://cmms.yourdomain.vn/api` hoặc `http://103.110.128.209/api`).
2. **ĐẢM BẢO DATABASE CHẠY TRƯỚC KHI BACKUP:** Sau khi server reboot/di dời hạ tầng, container `cmms_db` có thể đang tắt. Phải `docker compose up -d db` và đợi `pg_isready` trước khi gõ lệnh `pg_dump`. File backup rỗng (0 bytes) $\rightarrow$ DỪNG LẠI NGAY LẬP TỨC.
3. **CHỐNG TREO MÁY CHỦ KHI BUILD (ANTI-FREEZE):** Tuyệt đối KHÔNG gõ `docker compose build` đồng thời. Phải build tuần tự Backend rồi đến Frontend, luôn đi kèm lệnh `nice -n 19` để giữ kết nối SSH không bị đơ cứng.
4. **BẢO VỆ Ổ CỨNG (ANTI-DISK-FULL):** Dọn sạch Docker log rác cũ và dangling images. Cấu hình log rotation 20MB trong `docker-compose.yml` để không bao giờ bị đầy ổ cứng 100%.
5. **KHÔNG DÙNG DOCKER COMPOSE DOWN:** Giữ các dịch vụ đang chạy, chỉ recreate từng container sau khi build xong image mới để hạn chế tối đa thời gian downtime.

---

## 🛠️ CÁC BƯỚC TRIỂN KHAI CHI TIẾT (STEP-BY-STEP):

### BƯỚC 0: KIỂM TRA HẠ TẦNG MỚI & DỌN DẸP DUNG LƯỢNG SAU REBOOT
1. Kiểm tra địa chỉ IP mạng nội bộ và dung lượng ổ cứng:
```bash
echo "🔍 1. Kiểm tra IP hiện tại của server:"
curl -s ifconfig.me || ip a | grep 'inet ' | grep -v '127.0.0.1'
echo ""

echo "🔍 2. Kiểm tra dung lượng ổ đĩa:"
df -h

echo "🔍 3. Kiểm tra trạng thái các container Docker:"
docker ps -a
```

2. Đảm bảo dịch vụ Docker daemon đang chạy và tối ưu Swappiness:
```bash
sudo systemctl start docker || true

# Tinh chỉnh Swappiness = 10 (tránh kernel đẩy dữ liệu ồ ạt sang Swap làm đơ ổ cứng SSD)
sudo sysctl vm.swappiness=10
```

3. Dọn sạch các file log Docker cũ khổng lồ (nếu ổ cứng đang bị đầy > 80%):
```bash
echo "🧹 Dọn dẹp log Docker cũ để giải phóng ổ đĩa..."
sudo truncate -s 0 /var/lib/docker/containers/*/*-json.log 2>/dev/null || true
docker system prune -f
```

---

### BƯỚC 1: XÁC ĐỊNH THƯ MỤC DỰ ÁN & KÍCH HOẠT SWAP
1. Di chuyển vào thư mục gốc của dự án:
```bash
cd ~/cmms-project-review || cd /var/www/cmms-project-review || cd /var/www/html/cmms-project-review

if [ ! -f "docker-compose.yml" ] || [ ! -f ".env" ]; then
    echo "❌ LỖI: Không tìm thấy docker-compose.yml hoặc .env tại $(pwd)! Hãy kiểm tra lại thư mục."
    exit 1
fi
echo "✅ Đang đứng đúng thư mục dự án: $(pwd)"
```

2. Kiểm tra và kích hoạt bộ nhớ ảo (SWAP) tối thiểu 4GB:
```bash
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
echo "✅ Bộ nhớ Swap sẵn sàng: $(free -h | awk '/Swap:/ {print $2}')"
```

---

### BƯỚC 2: KIỂM TRA TOÀN DIỆN FILE CẤU HÌNH `.env` (CHẶN IP CŨ 103.15.50.119)
```bash
echo "🔍 Đang rà soát biến môi trường .env..."
set -a
source .env
set +a

if [ -z "$REACT_APP_BASE_URL" ]; then
    echo "❌ LỖI: REACT_APP_BASE_URL đang bị trống trong .env!"
    exit 1
fi

echo "   -> REACT_APP_BASE_URL hiện tại: $REACT_APP_BASE_URL"

# Kiểm tra nếu còn sót IP cũ của Mắt Bão
if [[ "$REACT_APP_BASE_URL" =~ 103\.15\.50\.119 ]]; then
    echo "❌ CẢNH BÁO NGUY HIỂM: REACT_APP_BASE_URL đang chứa IP CŨ '103.15.50.119'!"
    echo "   Mắt Bão đã chuyển IP sang '103.110.128.209'."
    echo "   Vui lòng sửa lại thành Tên miền hoặc IP mới (Ví dụ: http://103.110.128.209/api)."
    exit 1
fi

# Kiểm tra nếu còn chứa localhost hoặc 127.0.0.1
if [[ "$REACT_APP_BASE_URL" =~ localhost|127\.0\.0\.1|cmms_backend ]]; then
    echo "❌ CẢNH BÁO NGUY HIỂM: REACT_APP_BASE_URL đang chứa '$REACT_APP_BASE_URL'!"
    echo "   Trên Production, người dùng ngoài Internet sẽ KHÔNG thể kết nối được."
    echo "   Vui lòng sửa thành Domain hoặc IP công khai mới (Ví dụ: https://cmms.yourdomain.vn/api)."
    exit 1
fi

# Kiểm tra định dạng http/https và /api ở cuối
if [[ ! "$REACT_APP_BASE_URL" =~ ^https?:// ]]; then
    echo "❌ LỖI: REACT_APP_BASE_URL phải bắt đầu bằng http:// hoặc https://"
    exit 1
fi

if [[ ! "$REACT_APP_BASE_URL" =~ /api$ ]]; then
    echo "❌ LỖI: REACT_APP_BASE_URL phải kết thúc chính xác bằng '/api' (không có dấu gạch chéo thừa ở cuối)."
    exit 1
fi

echo "✅ File .env hoàn toàn hợp lệ 100%!"
```

---

### BƯỚC 3: KHỞI ĐỘNG DATABASE & SAO LƯU DỮ LIỆU AN TOÀN
```bash
BACKUP_DIR="$HOME/backups_cmms"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "🔄 1. Bật container Database (phòng trường hợp DB đang tắt sau khi nâng cấp hạ tầng)..."
docker compose up -d db

echo "⏳ Đang đợi PostgreSQL sẵn sàng..."
for i in {1..30}; do
    if docker exec cmms_db pg_isready -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-cmms_db}" >/dev/null 2>&1; then
        echo "   ✅ PostgreSQL đã sẵn sàng tiếp nhận kết nối."
        break
    fi
    sleep 1
done

echo "💾 2. Đang sao lưu Database PostgreSQL..."
BACKUP_DB_FILE="$BACKUP_DIR/cmms_db_$TIMESTAMP.sql.gz"
docker exec -t cmms_db pg_dump -U "${POSTGRES_USER:-postgres}" "${POSTGRES_DB:-cmms_db}" | gzip > "$BACKUP_DB_FILE"

if [ -s "$BACKUP_DB_FILE" ]; then
    echo "   ✅ Backup Database thành công: $BACKUP_DB_FILE ($(du -h "$BACKUP_DB_FILE" | cut -f1))"
else
    echo "   ❌ LỖI: File backup DB rỗng! DỪNG LẠI NGAY LẬP TỨC để bảo vệ an toàn dữ liệu."
    exit 1
fi

echo "💾 3. Đang sao lưu thư mục uploads/ (chữ ký, avatar, chứng chỉ)..."
BACKUP_UPLOADS_FILE="$BACKUP_DIR/cmms_uploads_$TIMESTAMP.tar.gz"
if [ -d "cmms-backend/uploads" ]; then
    tar -czf "$BACKUP_UPLOADS_FILE" -C cmms-backend uploads || true
    echo "   ✅ Backup Uploads thành công: $BACKUP_UPLOADS_FILE ($(du -h "$BACKUP_UPLOADS_FILE" | cut -f1))"
elif [ -d "uploads" ]; then
    tar -czf "$BACKUP_UPLOADS_FILE" uploads || true
    echo "   ✅ Backup Uploads thành công: $BACKUP_UPLOADS_FILE ($(du -h "$BACKUP_UPLOADS_FILE" | cut -f1))"
fi
```

---

### BƯỚC 4: ĐỒNG BỘ MÃ NGUỒN MỚI TỪ GITHUB
```bash
echo "📥 Đang kéo mã nguồn mới nhất từ GitHub..."
git fetch origin main
git stash || true
git checkout main
git pull origin main

echo "✅ Mã nguồn hiện tại: $(git log -1 --oneline)"
```

---

### BƯỚC 5: BUILD DOCKER IMAGES TUẦN TỰ (CƠ CHẾ CHỐNG TREO SERVER)
```bash
# 1. Build Backend trước với nice -n 19 để không chiếm trọn CPU của SSH
echo "🏗️ Đang build Image Backend..."
nice -n 19 docker compose build backend

# 2. Build Frontend sau
echo "🏗️ Đang build Image Frontend..."
nice -n 19 docker compose build frontend

echo "✅ Đã build xong tất cả Docker Images mới an toàn."
```

---

### BƯỚC 6: TÁI TẠO CONTAINER & CHẠY DATABASE MIGRATION
```bash
# 1. Khởi động lại Backend với Image mới
echo "🔄 Khởi động Backend container mới..."
docker compose up -d --no-deps backend
sleep 5

# 2. Chạy Database Migration TypeORM
echo "⚙️ Đang thực thi Database Migration..."
docker compose exec -T backend npx typeorm migration:run -d dist/data-source.js || true

# 3. Đồng bộ bản vá khóa ngoại ON DELETE CASCADE (chống lỗi khi xóa tài khoản)
echo "⚙️ Cập nhật ràng buộc khóa ngoại Cascade Delete..."
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

# 4. Khởi động lại Frontend và Nginx Proxy Manager
echo "🔄 Khởi động Frontend container mới..."
docker compose up -d --no-deps frontend

echo "🔄 Khởi động/Đảm bảo Nginx Proxy Manager đang chạy đón traffic từ IP mới 103.110.128.209..."
docker compose up -d npm
```

---

### BƯỚC 7: KIỂM TRA TRẠNG THÁI VÀ LOGS HỆ THỐNG
```bash
echo "📊 Trạng thái các containers:"
docker compose ps

echo "📋 Log 25 dòng gần nhất của Backend:"
docker logs --tail 25 cmms_backend

echo "📋 Log 15 dòng gần nhất của Frontend:"
docker logs --tail 15 cmms_frontend

echo "📋 Log 15 dòng gần nhất của Proxy Manager:"
docker logs --tail 15 nginx_proxy_manager

# Dọn dẹp image dangling rác
docker image prune -f

echo "🎉 CHÚC MỪNG: BẢN CẬP NHẬT ĐÃ ĐƯỢC DEPLOY THÀNH CÔNG TRÊN HẠ TẦNG IP MỚI 103.110.128.209!"
```

---

## 🆘 KỊCH BẢN KHÔI PHỤC KHẨN CẤP (ROLLBACK PLAN)
Nếu sau khi deploy phát hiện lỗi nghiêm trọng (màn hình trắng, backend crash loop):

1. **Khôi phục lại mã nguồn phiên bản trước:**
   ```bash
   git checkout HEAD~1
   docker compose build backend
   docker compose build frontend
   docker compose up -d --no-deps backend frontend npm
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

## ⚡ PHƯƠNG THỨC CHẠY 1 LỆNH DUY NHẤT: `deploy.sh`

File `deploy.sh` đã được tích hợp sẵn toàn bộ các bước an toàn ở trên. Trên Server, bạn chỉ cần gõ:

```bash
chmod +x deploy.sh
./deploy.sh
```
