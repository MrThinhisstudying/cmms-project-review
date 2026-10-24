import dayjs from 'dayjs';

export enum MaintenanceLevel {
    ONE_WEEK = 'Tuần', // Thêm mới
    ONE_MONTH = '1M', // Thêm mới
    THREE_MONTH = '3M', // Đổi ngắn gọn cho dễ quản lý
    SIX_MONTH = '6M',
    NINE_MONTH = '9M',
    ONE_YEAR = '1Y', // Thay cho 12_month
    TWO_YEARS = '2Y', // Thay cho 24_month
}

export enum MaintenanceStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    CANCELED = 'canceled',
    // Thêm 2 trạng thái này để Cron Job chạy được
    WARNING = 'warning',
    OVERDUE = 'overdue',
}

/**
 * Chuẩn hóa mọi định dạng cấp độ bảo dưỡng (Tiếng Việt, viết tắt, không dấu)
 * về định dạng chuẩn của hệ thống: 'Tuần', '1M', '3M', '6M', '9M', '1Y', '2Y'
 */
export function normalizeMaintenanceLevel(lvl?: string): string {
    if (!lvl) return 'Tuần';
    const clean = lvl.trim().toLowerCase();

    // 1. Kiểm tra Tuần
    if (
        clean.includes('tuần') ||
        clean.includes('tuan') ||
        clean === '1w' ||
        clean === 'w' ||
        clean.includes('week')
    ) {
        return 'Tuần';
    }

    // 2. Kiểm tra 2 Năm (24 Tháng)
    if (
        clean.includes('2 năm') ||
        clean.includes('02 năm') ||
        clean.includes('2 nam') ||
        clean.includes('02 nam') ||
        clean.includes('24 tháng') ||
        clean.includes('24 thang') ||
        clean === '2y' ||
        clean === '24_month'
    ) {
        return '2Y';
    }

    // 3. Kiểm tra 1 Năm (12 Tháng)
    if (
        clean.includes('1 năm') ||
        clean.includes('01 năm') ||
        clean.includes('1 nam') ||
        clean.includes('01 nam') ||
        clean.includes('12 tháng') ||
        clean.includes('12 thang') ||
        clean === '1y' ||
        clean === '12_month'
    ) {
        return '1Y';
    }

    // 4. Kiểm tra 9 Tháng
    if (
        clean.includes('9 tháng') ||
        clean.includes('09 tháng') ||
        clean.includes('9 thang') ||
        clean.includes('09 thang') ||
        clean === '9m' ||
        clean === '9_month'
    ) {
        return '9M';
    }

    // 5. Kiểm tra 6 Tháng
    if (
        clean.includes('6 tháng') ||
        clean.includes('06 tháng') ||
        clean.includes('6 thang') ||
        clean.includes('06 thang') ||
        clean === '6m' ||
        clean === '6_month'
    ) {
        return '6M';
    }

    // 6. Kiểm tra 3 Tháng
    if (
        clean.includes('3 tháng') ||
        clean.includes('03 tháng') ||
        clean.includes('3 thang') ||
        clean.includes('03 thang') ||
        clean === '3m' ||
        clean === '3_month'
    ) {
        return '3M';
    }

    // 7. Kiểm tra 1 Tháng
    if (
        clean.includes('1 tháng') ||
        clean.includes('01 tháng') ||
        clean.includes('1 thang') ||
        clean.includes('01 thang') ||
        clean === '1m' ||
        clean === '1_month' ||
        clean === 'tháng' ||
        clean === 'thang'
    ) {
        return '1M';
    }

    return lvl.trim();
}

/**
 * So sánh 2 cấp độ bảo dưỡng xem có khớp nhau không sau khi chuẩn hóa
 */
export function isMatchLevel(levelA?: string, levelB?: string): boolean {
    if (!levelA || !levelB) return false;
    return normalizeMaintenanceLevel(levelA) === normalizeMaintenanceLevel(levelB);
}

/**
 * Tính hạn chót của chu kỳ bảo dưỡng:
 * - Tuần: từ ngày 1 đến ngày 7 là 1 tuần -> hạn chót là start + 6 ngày. Sau ngày này mới quá hạn.
 * - 1M: trọn vẹn 1 tháng -> hạn chót là start + 1 tháng - 1 ngày.
 * - 3M: trọn vẹn 3 tháng -> start + 3 tháng - 1 ngày.
 * - 6M: trọn vẹn 6 tháng -> start + 6 tháng - 1 ngày.
 * - 9M: trọn vẹn 9 tháng -> start + 9 tháng - 1 ngày.
 * - 1Y: trọn vẹn 1 năm -> start + 1 năm - 1 ngày.
 * - 2Y: trọn vẹn 2 năm -> start + 2 năm - 1 ngày.
 */
export function getMaintenanceCycleDeadline(startDate: Date | string | dayjs.Dayjs, level?: string): dayjs.Dayjs {
    const start = dayjs(startDate).startOf('day');
    const norm = normalizeMaintenanceLevel(level);

    if (norm === 'Tuần') {
        return start.add(6, 'day').endOf('day');
    }
    if (norm === '1M') {
        return start.add(1, 'month').subtract(1, 'day').endOf('day');
    }
    if (norm === '3M') {
        return start.add(3, 'month').subtract(1, 'day').endOf('day');
    }
    if (norm === '6M') {
        return start.add(6, 'month').subtract(1, 'day').endOf('day');
    }
    if (norm === '9M') {
        return start.add(9, 'month').subtract(1, 'day').endOf('day');
    }
    if (norm === '1Y') {
        return start.add(1, 'year').subtract(1, 'day').endOf('day');
    }
    if (norm === '2Y') {
        return start.add(2, 'year').subtract(1, 'day').endOf('day');
    }

    return start.add(6, 'day').endOf('day');
}

/**
 * Kiểm tra xem một kế hoạch bảo dưỡng có thực sự quá hạn hay không:
 * Chỉ coi là quá hạn khi:
 * 1. Kế hoạch đang Active (hoặc Warning/Overdue) và chưa hoàn thành (chưa có last_maintenance_date)
 * 2. Ngày hiện tại đã vượt qua hạn chót của chu kỳ bảo dưỡng
 */
export function isMaintenanceOverdue(
    record: { status?: string; next_maintenance_date?: Date | string | null; last_maintenance_date?: Date | string | null; level?: string },
    currentDate: Date | dayjs.Dayjs = new Date()
): boolean {
    if (!record || record.status === MaintenanceStatus.INACTIVE || record.status === MaintenanceStatus.CANCELED) {
        return false;
    }
    if (record.last_maintenance_date) {
        return false;
    }
    if (!record.next_maintenance_date) {
        return false;
    }

    const today = dayjs(currentDate).startOf('day');
    const deadline = getMaintenanceCycleDeadline(record.next_maintenance_date, record.level).startOf('day');
    return today.isAfter(deadline);
}



