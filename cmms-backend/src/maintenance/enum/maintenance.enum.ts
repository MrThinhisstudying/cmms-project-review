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

