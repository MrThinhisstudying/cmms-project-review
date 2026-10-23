import React, { useState } from "react";
import { Button, Typography, Space } from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  TableOutlined,
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
        marginBottom: 24,
        padding: "16px 24px",
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ flexShrink: 0, minWidth: 260 }}>
        <Title level={4} style={{ margin: 0, whiteSpace: "nowrap" }}>
          🔧 Quản Lý Bảo Dưỡng
        </Title>
        <div style={{ color: "#888", fontSize: "13px", marginTop: 4 }}>
          Lập kế hoạch và theo dõi quy trình bảo dưỡng thiết bị
        </div>
      </div>

      <Space wrap style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
        {/* Nút Làm bảo dưỡng hàng loạt bằng Excel */}
        <Button
          type="primary"
          ghost
          icon={<CalendarOutlined />}
          onClick={onBatchMaintenance}
          style={{ fontWeight: 600 }}
        >
          Làm bảo dưỡng (Excel)
        </Button>

        {/* Nút Import Kế hoạch */}
        <Button icon={<CalendarOutlined />} onClick={onImport}>
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
        <Button onClick={onCreatePlan} icon={<PlusOutlined />}>
          Thêm kế hoạch
        </Button>
        {/* Nút Tạo Phiếu Mới */}
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
