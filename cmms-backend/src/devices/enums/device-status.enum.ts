export enum DeviceStatus {
    MOI = 'MOI', // Mới
    DANG_SU_DUNG = 'DANG_SU_DUNG', // Đang sử dụng
    SU_DUNG_HAN_CHE = 'SU_DUNG_HAN_CHE', // Sử dụng hạn chế
    DANG_SUA_CHUA = 'DANG_SUA_CHUA', // Đang sửa chữa
    THANH_LY = 'THANH_LY', // Thanh lý
}

export const columnMapping: Record<string, string> = {
    'Tên phương tiện': 'name',
    'Nhãn hiệu': 'brand',
    'Biển đăng ký': 'reg_number', // Updates to reg_number
    'Số máy (Serial Number)': 'serial_number', // Keep tracking serial
    'Nước sản xuất': 'country_of_origin',
    'Năm sản xuất': 'manufacture_year',
    'Ghi chú': 'note',
    'Mục đích sử dụng thiết bị': 'usage_purpose',
    'Phạm vi hoạt động': 'operating_scope',
    'Năm sử dụng': 'usage_start_year',
    'Mã số - địa chỉ kỹ thuật': 'technical_code_address',
    'Địa điểm - tọa độ thiết bị': 'location_coordinates',
    'Thời gian hoạt động hàng ngày': 'daily_operation_time',
    'Xuất xứ khi di dời thiết bị': 'relocation_origin',
    'Năm di dời thiết bị': 'relocation_year',
    'Mã số tài sản cố định (TSCĐ)': 'fixed_asset_code',
    'Đơn vị sử dụng thiết bị': 'using_department',
    'Kích thước - Dài': 'length',
    'Kích thước - Rộng': 'width',
    'Kích thước - Cao': 'height',
    'Khối lượng thiết bị': 'weight',
    'Nguồn điện cung cấp': 'power_source',
    'Công suất tiêu thụ': 'power_consumption',
    'Tình trạng kỹ thuật': 'other_specifications',
    // Add new fields if they appear in Excel, for now mapping Reg Number is key
};
