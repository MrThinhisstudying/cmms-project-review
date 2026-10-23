import React, { useState } from "react";
import { Modal, Space, Button, Slider, Tooltip } from "antd";
import {
  FilePdfOutlined,
  PrinterOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { RepairTrackingPreview } from "./RepairTrackingPreview";
import { IRepairTrackingRow } from "./types";

interface RepairTrackingPreviewModalProps {
  open: boolean;
  onClose: () => void;
  rows: IRepairTrackingRow[];
  groupLabel: string;
  periodText: string;
  year: number;
  onPrint: () => void;
  onExportPdf: () => void;
  exportingPdf: boolean;
}

export const RepairTrackingPreviewModal: React.FC<RepairTrackingPreviewModalProps> = ({
  open,
  onClose,
  rows,
  groupLabel,
  periodText,
  year,
  onPrint,
  onExportPdf,
  exportingPdf,
}) => {
  const [zoom, setZoom] = useState<number>(0.75);

  return (
    <Modal
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingRight: 32 }}>
          <Space size="middle">
            <EyeOutlined style={{ color: "#1677ff", fontSize: 18 }} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>
              Xem trước bản in sổ theo dõi sửa chữa (Khổ A4 Landscape)
            </span>
          </Space>

          {/* Controls */}
          <Space size="middle">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                width: 170,
                background: "#f8fafc",
                padding: "2px 8px",
                borderRadius: 6,
                border: "1px solid #e2e8f0",
              }}
            >
              <Tooltip title="Thu nhỏ">
                <ZoomOutOutlined
                  style={{ cursor: "pointer", color: "#64748b" }}
                  onClick={() => setZoom(Math.max(0.4, Number((zoom - 0.1).toFixed(1))))}
                />
              </Tooltip>
              <Slider
                min={0.4}
                max={1.2}
                step={0.05}
                value={zoom}
                onChange={setZoom}
                style={{ flex: 1, margin: "0 8px" }}
                tooltip={{ formatter: (val) => `${Math.round((val || 0) * 100)}%` }}
              />
              <Tooltip title="Phóng to">
                <ZoomInOutlined
                  style={{ cursor: "pointer", color: "#64748b" }}
                  onClick={() => setZoom(Math.min(1.2, Number((zoom + 0.1).toFixed(1))))}
                />
              </Tooltip>
            </div>

            <Button icon={<PrinterOutlined />} onClick={onPrint}>
              In trực tiếp
            </Button>
            <Button
              type="primary"
              danger
              icon={<FilePdfOutlined />}
              onClick={onExportPdf}
              loading={exportingPdf}
            >
              Xuất file PDF
            </Button>
          </Space>
        </div>
      }
      open={open}
      onCancel={onClose}
      width="92vw"
      style={{ top: 20 }}
      destroyOnClose
      footer={null}
      styles={{ body: { padding: 0, maxHeight: "82vh", overflow: "hidden" } }}
    >
      <div style={{ height: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <RepairTrackingPreview
          rows={rows}
          groupLabel={groupLabel}
          periodText={periodText}
          year={year}
          zoom={zoom}
        />
      </div>
    </Modal>
  );
};
