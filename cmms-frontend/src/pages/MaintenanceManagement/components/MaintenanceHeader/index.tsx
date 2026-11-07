import React, { useState } from "react";
import { Button, Typography, Space, Tooltip, Grid, Dropdown } from "antd";
import {
  PlusOutlined,
  CalendarOutlined,
  TableOutlined,
  FileExcelOutlined,
  UploadOutlined,
  ToolFilled,
  ReloadOutlined,
  AppstoreOutlined,
  DownOutlined,
} from "@ant-design/icons";
import MasterPlanModal from "../MasterPlanModal";
import OriginalPlanModal from "../OriginalPlanModal";

const { Title } = Typography;
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: isMobile ? 10 : 16,
        marginBottom: isMobile ? 12 : 20,
        padding: isMobile ? "12px 14px" : "18px 24px",
        background: "linear-gradient(135deg, #ffffff 0%, #fbfcfe 100%)",
        borderRadius: 12,
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14, minWidth: 0, flex: 1 }}>
        <div
          style={{
            width: isMobile ? 38 : 46,
            height: isMobile ? 38 : 46,
            borderRadius: 10,
            background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
            flexShrink: 0,
          }}
        >
          <ToolFilled style={{ fontSize: isMobile ? 18 : 22, color: "#fff" }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <Title
            level={4}
            style={{
              margin: 0,
              fontWeight: 700,
              color: "#0f172a",
              fontSize: isMobile ? 16 : 18,
              lineHeight: 1.3,
            }}
          >
            Quản Lý Kế Hoạch & Bảo Dưỡng
          </Title>
          <div style={{ color: "#64748b", fontSize: isMobile ? 12 : 13, marginTop: 2 }}>
            Theo dõi chu kỳ bảo dưỡng, tạo kế hoạch và ghi nhận thực hiện định kỳ
          </div>
        </div>
      </div>

      {isMobile ? (
        <div style={{ display: "flex", width: "100%", gap: 8, flexWrap: "wrap" }}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreate}
            style={{
              flex: 1,
              borderRadius: 8,
              fontWeight: 600,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
            }}
          >
            Lập Phiếu BD
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: "createPlan",
                  icon: <PlusOutlined />,
                  label: "Thêm chuỗi kế hoạch",
                  onClick: onCreatePlan,
                },
                {
                  key: "batch",
                  icon: <FileExcelOutlined style={{ color: "#52c41a" }} />,
                  label: "Làm bảo dưỡng (Excel)",
                  onClick: onBatchMaintenance,
                },
                {
                  key: "yearTable",
                  icon: <TableOutlined />,
                  label: "Bảng kế hoạch năm",
                  onClick: () => setIsOriginalViewOpen(true),
                },
                {
                  key: "masterPlan",
                  icon: <CalendarOutlined />,
                  label: "Kế hoạch tổng thể",
                  onClick: () => setIsMasterOpen(true),
                },
                {
                  key: "import",
                  icon: <UploadOutlined />,
                  label: "Import Excel",
                  onClick: onImport,
                },
              ],
            }}
            trigger={["click"]}
          >
            <Button icon={<AppstoreOutlined />} style={{ borderRadius: 8, fontWeight: 500 }}>
              Kế hoạch & Tiện ích <DownOutlined style={{ fontSize: 11 }} />
            </Button>
          </Dropdown>
          {onRefresh && (
            <Button icon={<ReloadOutlined />} onClick={onRefresh} style={{ borderRadius: 8 }} />
          )}
        </div>
      ) : (
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
      )}

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
