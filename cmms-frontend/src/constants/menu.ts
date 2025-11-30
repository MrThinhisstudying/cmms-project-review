export enum Menu {
  TRANG_CHU = "Trang chủ",
  QUAN_LY_NGUOI_DUNG = "Quản lý người dùng",
  QUAN_LY_TTB_PT = "Quản lý TTB_PT",
  QUAN_LY_SUA_CHUA = "Quản lý sửa chữa",
  QUAN_LY_DANG_KIEM = "Quản lý đăng kiểm/kiểm định",
  QUAN_LY_BAO_DUONG = "Quản lý bảo dưỡng",
  QUY_TRINH_BAO_DUONG = "Quy trình bảo dưỡng",
  QUAN_LY_VAT_TU = "Quản lý vật tư",
  THU_VIEN_QUY_TRINH = "Thư viện quy trình",
  QUAN_LY_LICH_SU_PHIEU = "Quản lý lịch sử phiếu",
  BAO_CAO_THONG_KE = "Báo cáo và thống kê",
  ROLLBACK = "Lịch sử thay đổi",
  DANG_XUAT = "Đăng xuất",
}

export interface DashboardMenuItem {
  name: string;
  description: string;
  color: string;
  path: string;
  roles: string[];
}

const colors = [
  "#6c5ce7",
  "#00b894",
  "#e17055",
  "#0984e3",
  "#c77dff",
  "#f39c12",
];

function getRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

export const dashboardMenuItems: DashboardMenuItem[] = [
  {
    name: "Quản lý Người dùng",
    description: "Thêm, sửa, xóa và phân quyền tài khoản trong hệ thống.",
    color: getRandomColor(),
    path: "/quan_ly_nguoi_dung",
    roles: ["admin"],
  },
  {
    name: "Quản lý Thiết bị & Phương tiện",
    description:
      "Theo dõi, cập nhật tình trạng và thông tin thiết bị, phương tiện.",
    color: getRandomColor(),
    path: "/quan_ly_ttb_pt",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: "Quản lý Bảo dưỡng",
    description: "Lập kế hoạch và theo dõi lịch bảo dưỡng định kỳ.",
    color: getRandomColor(),
    path: "/quan_ly_bao_duong",
    roles: ["admin", "staff", "manager"],
  },
  {
    name: "Báo cáo & Thống kê",
    description:
      "Xuất báo cáo nhanh chóng, hỗ trợ phân tích và tối ưu vận hành.",
    color: getRandomColor(),
    path: "/bao_cao_thong_ke",
    roles: ["admin", "manager"],
  },
  {
    name: "Lịch sử thao tác",
    description: "Theo dõi và khôi phục dữ liệu từ lịch sử hoạt động.",
    color: getRandomColor(),
    path: "/lich_su",
    roles: ["admin"],
  },
];
