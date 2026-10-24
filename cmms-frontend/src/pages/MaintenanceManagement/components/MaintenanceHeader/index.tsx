import React, { useState } from "react";
import { Button, Typography, Space, Tooltip } from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  TableOutlined,
  FileExcelOutlined,
  UploadOutlined,
  ToolFilled,
  ReloadOutlined,
} from "@ant-design/icons";
import MasterPlanModal from "../MasterPlanModal";
import OriginalPlanModal from "../OriginalPlanModal";

const { Title } = Typography;

interface Props {
  onCreate: () => void;
  onCreatePlan: () => void;
  onRefresh?: () => void;
  onImport?: () => void;
  onBatchMaintenance?: () => void;
}

const MaintenanceHeader: React.FC<Props> = ({
  onCreate,
  onCreatePlan,
  onRefresh,
  onImport,
  onBatchMaintenance,
}) => {
  const [isMasterOpen, setIsMasterOpen] = useState(false);
  const [isOriginalViewOpen, setIsOriginalViewOpen] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 20,
        padding: "18px 24px",
        background: "linear-gradient(135deg, #ffffff 0%, #fbfcfe 100%)",
        borderRadius: 14,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 260 }}>
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
          }}
        >
          <ToolFilled style={{ fontSize: 22, color: "#fff" }} />
        </div>
        <div>
          <Title level={4} style={{ margin: 0, fontWeight: 700, color: "#0f172a", fontSize: 18 }}>
            Quản Lý Kế Hoạch & Bảo Dưỡng
          </Title>
          <div style={{ color: "#64748b", fontSize: "13px", marginTop: 2 }}>
            Theo dõi chu kỳ bảo dưỡng, tạo kế hoạch và ghi nhận thực hiện định kỳ
          </div>
        </div>
      </div>

      <Space wrap size={10} style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
        {onRefresh && (
          <Tooltip title="Tải lại dữ liệu">
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>
        )}

        <Button
          icon={<TableOutlined />}
          onClick={() => setIsOriginalViewOpen(true)}
          style={{ borderRadius: 8, fontWeight: 500 }}
        >
          Bảng kế hoạch năm
        </Button>

        <Button
          icon={<CalendarOutlined />}
          onClick={() => setIsMasterOpen(true)}
          style={{ borderRadius: 8, fontWeight: 500 }}
        >
          Kế hoạch tổng thể
        </Button>

        <Button
          icon={<UploadOutlined />}
          onClick={onImport}
          style={{ borderRadius: 8, fontWeight: 500 }}
        >
          Import Excel
        </Button>

        <Button
          onClick={onCreatePlan}
          icon={<PlusOutlined />}
          style={{ borderRadius: 8, fontWeight: 500 }}
        >
          Thêm chuỗi kế hoạch
        </Button>

        {/* Nút Làm bảo dưỡng hàng loạt bằng Excel (Nổi bật) */}
        <Button
          type="primary"
          ghost
          icon={<FileExcelOutlined style={{ color: "#52c41a", fontSize: 16 }} />}
          onClick={onBatchMaintenance}
          style={{
            borderRadius: 8,
            fontWeight: 600,
            borderColor: "#52c41a",
            color: "#389e0d",
            background: "#f6ffed",
          }}
        >
          Làm bảo dưỡng (Excel)
        </Button>

        {/* Nút Lập Phiếu Mới (Hero Primary Button) */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onCreate}
          style={{
            borderRadius: 8,
            fontWeight: 600,
            background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
            boxShadow: "0 4px 14px rgba(22, 119, 255, 0.35)",
            border: "none",
            height: 36,
            paddingLeft: 18,
            paddingRight: 18,
          }}
        >
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
