export const DEPARTMENT_PERMISSIONS = [
    {
        code: 'ADD_DEVICE',
        name: 'Được thêm trang thiết bị',
        description: 'Cho phép thêm mới trang thiết bị hoặc vật tư vào hệ thống quản lý thiết bị của đơn vị.',
    },
    {
        code: 'UPDATE_DEVICE',
        name: 'Được chỉnh sửa thông tin thiết bị',
        description: 'Cho phép cập nhật, chỉnh sửa thông tin chi tiết của trang thiết bị hiện có trong hệ thống.',
    },
    {
        code: 'DELETE_DEVICE',
        name: 'Được xóa thiết bị',
        description: 'Cho phép xóa trang thiết bị khỏi hệ thống (chỉ áp dụng khi thiết bị chưa phát sinh phiếu bảo dưỡng, sửa chữa hoặc kiểm định).',
    },
    {
        code: 'EXPORT_MAINTENANCE',
        name: 'Được lập phiếu bảo dưỡng',
        description: 'Cho phép lập và xuất phiếu yêu cầu bảo dưỡng định kỳ hoặc đột xuất cho thiết bị.',
    },
    {
        code: 'PERFORM_MAINTENANCE',
        name: 'Được thực hiện bảo dưỡng',
        description: 'Cho phép đơn vị trực tiếp thực hiện công việc bảo dưỡng theo kế hoạch hoặc yêu cầu được phê duyệt.',
    },
    {
        code: 'CREATE_REPAIR',
        name: 'Được lập phiếu yêu cầu sửa chữa',
        description: 'Cho phép lập phiếu yêu cầu sửa chữa khi thiết bị hư hỏng, gặp sự cố hoặc cần thay thế linh kiện.',
    },
    {
        code: 'UPDATE_REPAIR',
        name: 'Được chỉnh sửa phiếu sửa chữa',
        description: 'Cho phép cập nhật, bổ sung hoặc chỉnh sửa thông tin phiếu sửa chữa trước khi được duyệt.',
    },
    {
        code: 'APPROVE_REPAIR',
        name: 'Được duyệt hoặc từ chối phiếu sửa chữa',
        description:
            'Cho phép duyệt, phê duyệt hoặc từ chối phiếu yêu cầu sửa chữa của đơn vị khác (áp dụng cho cấp trưởng phòng hoặc quản lý được phân quyền).',
    },
    {
        code: 'DELETE_REPAIR',
        name: 'Được xóa phiếu sửa chữa',
        description: 'Cho phép xóa phiếu sửa chữa khi phiếu chưa được duyệt hoặc đã bị từ chối.',
    },
    {
        code: 'EXPORT_REPAIR',
        name: 'Được xuất báo cáo tổng hợp',
        description: 'Cho phép xuất các báo cáo tổng hợp liên quan đến tình trạng thiết bị, công tác bảo dưỡng, sửa chữa và kiểm định trong đơn vị.',
    },
    {
        code: 'can_approve_request',
        name: 'Duyệt yêu cầu ban đầu',
        description: 'Cho phép duyệt yêu cầu sửa chữa (Bước 1 -> Bước 2)',
    },
    {
        code: 'can_create_inspection',
        name: 'Lập phiếu kiểm tra',
        description: 'Cho phép kỹ thuật viên lập phiếu kiểm tra tình trạng (Bước 3)',
    },
    {
        code: 'can_sign_technical',
        name: 'Ký duyệt kỹ thuật',
        description: 'Cho phép Tổ kỹ thuật ký xác nhận phương án (Bước 3 -> Bước 4)',
    },
    {
        code: 'can_sign_operation',
        name: 'Ký duyệt vận hành',
        description: 'Cho phép Tổ VHTTBMĐ ký xác nhận (Bước 3 -> Bước 4)',
    },
    {
        code: 'can_final_approve',
        name: 'Phê duyệt cuối cùng',
        description: 'Cho phép Ban giám đốc phê duyệt phiếu sửa chữa (Bước 4 -> Bước 5)',
    },
];

export const DEPARTMENT_PERMISSION_CODES = DEPARTMENT_PERMISSIONS.map((p) => p.code);
