import React, { useState } from "react";
import { Button, Upload, message, Typography, Space } from "antd";
import {
  UploadOutlined,
  PlusOutlined,
  FileExcelOutlined,
  CalendarOutlined,
  TableOutlined,
} from "@ant-design/icons";
import {
  importTemplate,
} from "../../../../apis/maintenance";
import { getToken } from "../../../../utils/auth";
import MasterPlanModal from "../MasterPlanModal";
import OriginalPlanModal from "../OriginalPlanModal";

const { Title } = Typography;

interface Props {
  onCreate: () => void; // Hàm callback mở Modal tạo phiếu
  onRefresh?: () => void; // Hàm callback reload lại dữ liệu
  onImport?: () => void; // Hàm mở modal import
}

const MaintenanceHeader: React.FC<Props> = ({ onCreate, onRefresh, onImport }) => {
  // State loading riêng cho từng nút để UX tốt hơn
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isOriginalViewOpen, setIsOriginalViewOpen] = useState(false);
  // 1. Xử lý Import QUY TRÌNH (Template)
  const handleImportTemplate = async (file: File) => {
    const token = getToken(); // Luôn lấy token mới nhất từ hàm chuẩn
    if (!token) {
      message.error("Phiên đăng nhập hết hạn, vui lòng đăng nhập lại!");
      return false;
    }

    setUploadingTemplate(true);
    try {
      const templateName = `Quy trình Import ${new Date().toLocaleDateString(
        "vi-VN"
      )}`;
      await importTemplate(file, templateName, "khac", "VH", token);
      message.success(`Đã import quy trình "${file.name}" thành công!`);

      if (onRefresh) onRefresh();
    } catch (error) {
      console.error(error);
      message.error("Import quy trình thất bại.");
    } finally {
      setUploadingTemplate(false);
    }

    return false; // Chặn hành vi upload mặc định của Antd
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
        padding: "16px 24px",
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div>
        <Title level={4} style={{ margin: 0 }}>
          🔧 Quản Lý Bảo Dưỡng
        </Title>
        <div style={{ color: "#888", fontSize: "13px", marginTop: 4 }}>
          Lập kế hoạch và theo dõi quy trình bảo dưỡng thiết bị
        </div>
      </div>

      <Space>
        {/* Nút 1: Import Quy trình - Tạm ẩn theo code gốc hoặc để nguyên nếu cần */}
        
        {/* Nút 2: Import Kế hoạch (Mới) */}
        <Button
          icon={<CalendarOutlined />}
          onClick={onImport} // Gọi hàm mở modal
        >
          Import Kế hoạch (Excel)
        </Button>

        <Button
          icon={<TableOutlined />}
          onClick={() => setIsOriginalViewOpen(true)}
        >
          Xem bảng kế hoạch
        </Button>
        <Button
          icon={<CalendarOutlined />}
          onClick={() => setIsMasterOpen(true)}
        >
          Kế hoạch tổng thể
        </Button>
        {/* Nút 3: Tạo Phiếu Mới */}
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          Lập Phiếu Bảo Dưỡng
        </Button>
      </Space>
      <MasterPlanModal
        open={isMasterOpen}
        onCancel={() => setIsMasterOpen(false)}
      />
      <OriginalPlanModal
        open={isOriginalViewOpen}
        onCancel={() => setIsOriginalViewOpen(false)}
      />
    </div>
  );
};

export default MaintenanceHeader;
