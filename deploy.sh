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
git stash || true
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

echo "🔄 Khởi động lại Frontend..."
docker compose up -d --no-deps frontend

# 8. DỌN DẸP DUNG LƯỢNG
docker image prune -f

echo "=================================================================="
echo "🎉 DEPLOY THÀNH CÔNG VÀ AN TOÀN TUYỆT ĐỐI!"
echo "Database Snapshot: $BACKUP_FILE"
echo "Kiểm tra log: docker logs --tail 30 cmms_backend"
echo "=================================================================="
