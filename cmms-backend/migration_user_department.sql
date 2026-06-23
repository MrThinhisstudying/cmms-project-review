-- =====================================================
-- Migration: Thêm cấu trúc phân cấp Phòng ban > Đội > Tổ
-- Ngày: 2026-04-29 (Cập nhật: 2026-05-02)
-- AN TOÀN: Có thể chạy nhiều lần (idempotent)
-- =====================================================

-- 1. Thêm enum level cho Department
DO $$ BEGIN
    CREATE TYPE department_level_enum AS ENUM ('PHONG_BAN', 'DOI', 'TO');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE department ADD COLUMN IF NOT EXISTS level department_level_enum DEFAULT 'TO';
ALTER TABLE department ADD COLUMN IF NOT EXISTS is_technical BOOLEAN DEFAULT false;

-- 2. Tạo enum role_in_dept
DO $$ BEGIN
    CREATE TYPE role_in_dept_enum AS ENUM ('MEMBER', 'DEPUTY_LEAD', 'LEAD');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Tạo bảng user_department
CREATE TABLE IF NOT EXISTS user_department (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES "user"(user_id) ON DELETE CASCADE,
    dept_id INTEGER NOT NULL REFERENCES department(dept_id) ON DELETE CASCADE,
    role_in_dept role_in_dept_enum DEFAULT 'MEMBER',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, dept_id)
);

CREATE INDEX IF NOT EXISTS idx_user_department_user ON user_department(user_id);
CREATE INDEX IF NOT EXISTS idx_user_department_dept ON user_department(dept_id);

-- 4. Cập nhật level dựa trên cấu trúc parent hiện tại
-- Department không có parent → DOI
-- Department có parent → TO
UPDATE department SET level = 'DOI' WHERE parent_id IS NULL AND level IS DISTINCT FROM 'DOI';
UPDATE department SET level = 'TO' WHERE parent_id IS NOT NULL AND level IS DISTINCT FROM 'TO';

-- 5. Auto-set is_technical cho các đơn vị kỹ thuật
UPDATE department SET is_technical = true
WHERE (name ILIKE '%kỹ thuật%' OR name ILIKE '%VHTTBMĐ%' OR name ILIKE '%vận hành%')
  AND is_technical IS DISTINCT FROM true;

-- 6. Migrate dữ liệu từ user.dept_id + user.role → user_department
-- UNIT_HEAD ở cấp DOI → LEAD (Đội trưởng)
-- TEAM_LEAD ở cấp TO → LEAD (Tổ trưởng)
-- Còn lại → MEMBER
INSERT INTO user_department (user_id, dept_id, role_in_dept, is_primary)
SELECT
    u.user_id,
    u.dept_id,
    CASE
        WHEN u.role = 'UNIT_HEAD' AND d.level = 'DOI' THEN 'LEAD'::role_in_dept_enum
        WHEN u.role = 'TEAM_LEAD' AND d.level = 'TO' THEN 'LEAD'::role_in_dept_enum
        WHEN u.role = 'UNIT_HEAD' THEN 'DEPUTY_LEAD'::role_in_dept_enum
        ELSE 'MEMBER'::role_in_dept_enum
    END,
    true
FROM "user" u
JOIN department d ON d.dept_id = u.dept_id
WHERE u.dept_id IS NOT NULL
ON CONFLICT (user_id, dept_id) DO NOTHING;

-- 7. Verify
DO $$
DECLARE
    dept_count INTEGER;
    ud_count INTEGER;
    tech_count INTEGER;
BEGIN
    SELECT count(*) INTO dept_count FROM department;
    SELECT count(*) INTO ud_count FROM user_department;
    SELECT count(*) INTO tech_count FROM department WHERE is_technical = true;

    RAISE NOTICE '=== Migration Summary ===';
    RAISE NOTICE 'Departments: %', dept_count;
    RAISE NOTICE 'User-Department records: %', ud_count;
    RAISE NOTICE 'Technical departments: %', tech_count;

    IF tech_count = 0 THEN
        RAISE WARNING '⚠️ Không có department nào được đánh dấu is_technical=true! Cần kiểm tra lại.';
    END IF;
    IF ud_count = 0 THEN
        RAISE WARNING '⚠️ Bảng user_department trống! Có thể users chưa có dept_id.';
    END IF;
END $$;

-- =====================================================
-- HƯỚNG DẪN CHẠY:
-- Local:  psql -h localhost -U <user> -d device-management -f migration_user_department.sql
-- Docker: docker exec -i cmms_db psql -U admin_vcs -d cmms_database < migration_user_department.sql
-- =====================================================
