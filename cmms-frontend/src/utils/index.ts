import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface Device {
  [key: string]: any;
  userIds?: number[] | string;
}

interface InventoryItem {
  [key: string]: any;
}

const columnMapping: Record<string, string> = {
  name: "Tên phương tiện",
  brand: "Nhãn hiệu",
  serial_number: "Biển đăng ký",
  country_of_origin: "Nước sản xuất",
  manufacture_year: "Năm sản xuất",
  note: "Ghi chú",
  usage_purpose: "Mục đích sử dụng thiết bị",
  operating_scope: "Phạm vi hoạt động",
  usage_start_year: "Năm sử dụng",
  technical_code_address: "Mã số - địa chỉ kỹ thuật",
  location_coordinates: "Địa điểm - tọa độ thiết bị",
  daily_operation_time: "Thời gian hoạt động hàng ngày",
  relocation_origin: "Xuất xứ khi di dời thiết bị",
  relocation_year: "Năm di dời thiết bị",
  fixed_asset_code: "Mã số tài sản cố định (TSCĐ)",
  using_department: "Đơn vị sử dụng thiết bị",
  weight: "Khối lượng thiết bị",
  width: "Kích thước - Rộng",
  height: "Kích thước - Cao",
  power_source: "Nguồn điện cung cấp",
  power_consumption: "Công suất tiêu thụ",
  other_specifications: "Tình trạng kỹ thuật",
};

export function exportDevicesToExcel(
  devices: Device[],
  filename = "Danh_sach_thiet_bi.xlsx"
) {
  let data: Record<string, any>[] = [];
  if (devices.length === 0) {
    data = [
      Object.fromEntries(
        Object.entries(columnMapping).map(([_, viLabel]) => [viLabel, ""])
      ),
    ];
  } else {
    data = devices.map((device) => {
      const row: Record<string, any> = {};
      for (const [key, viLabel] of Object.entries(columnMapping)) {
        let value = device[key];

        row[viLabel] = value ?? "";
      }
      return row;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách thiết bị");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, filename);
}

const inventoryColumnMapping: Record<string, string> = {
  "Mã số": "code",
  "Tên mặt hàng": "name",
  "Danh mục": "category_name",
  "Mô tả": "info",
  "Số lượng": "quantity",
  "Giá trị": "price",
  "ĐVT": "quantity_unit",
};

export function exportInventoryToExcel(
  items: InventoryItem[],
  filename = "Danh_sach_vat_tu.xlsx"
) {
  let data: Record<string, any>[] = [];

  if (!items || items.length === 0) {
    data = [
      Object.fromEntries(
        Object.entries(inventoryColumnMapping).map(([vi]) => [vi, ""])
      ),
    ];
  } else {
    data = items.map((item) => {
      const row: Record<string, any> = {};
      for (const [viLabel, key] of Object.entries(inventoryColumnMapping)) {
        if (key === "category_name") {
          row[viLabel] = item.category?.name ?? "";
        } else {
          row[viLabel] = item[key] ?? "";
        }
      }
      return row;
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Danh sách vật tư");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, filename);
}
