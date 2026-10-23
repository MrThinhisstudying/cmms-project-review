import React from "react";
import {
  Card,
  Space,
  Radio,
  Select,
  DatePicker,
  Button,
  Typography,
  Tag,
  Divider,
  Tooltip,
} from "antd";
import {
  SearchOutlined,
  PrinterOutlined,
  FilePdfOutlined,
  EyeOutlined,
  CarOutlined,
  CalendarOutlined,
  AppstoreOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import { Dayjs } from "dayjs";
import { TimeRangePreset, DeviceFilterMode } from "./types";
import { IDeviceGroup } from "../../../../apis/device-groups";
import { IDevice } from "../../../../types/devicesManagement.types";

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface RepairTrackingFilterProps {
  timePreset: TimeRangePreset;
  onTimePresetChange: (preset: TimeRangePreset) => void;
  dateRange: [Dayjs, Dayjs];
  onDateRangeChange: (dates: [Dayjs, Dayjs]) => void;
  deviceFilterMode: DeviceFilterMode;
  onDeviceFilterModeChange: (mode: DeviceFilterMode) => void;
  selectedGroupId: number | "ALL";
  onSelectedGroupIdChange: (groupId: number | "ALL") => void;
  deviceGroups: IDeviceGroup[];
  selectedDeviceIds: number[];
  onRemoveDeviceId: (id: number) => void;
  onClearAllDeviceIds: () => void;
  onOpenVehiclePicker: () => void;
  allDevices: IDevice[];
  onFetch: () => void;
  onOpenPreviewModal: () => void;
  onPrint: () => void;
  onExportPdf: () => void;
  loading: boolean;
  exportingPdf: boolean;
  totalRecords: number;
}

export const RepairTrackingFilter: React.FC<RepairTrackingFilterProps> = ({
  timePreset,
  onTimePresetChange,
  dateRange,
  onDateRangeChange,
  deviceFilterMode,
  onDeviceFilterModeChange,
  selectedGroupId,
  onSelectedGroupIdChange,
  deviceGroups,
  selectedDeviceIds,
  onRemoveDeviceId,
  onClearAllDeviceIds,
  onOpenVehiclePicker,
  allDevices,
  onFetch,
  onOpenPreviewModal,
  onPrint,
  onExportPdf,
  loading,
  exportingPdf,
  totalRecords,
}) => {
  // Map selected IDs to devices
  const selectedDevicesList = React.useMemo(() => {
    const idSet = new Set(selectedDeviceIds);
    return allDevices.filter((d) => d.device_id && idSet.has(d.device_id));
  }, [selectedDeviceIds, allDevices]);

  return (
    <Card
      styles={{ body: { padding: "16px 20px" } }}
      style={{
        borderRadius: 12,
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
        border: "1px solid #e2e8f0",
      }}
    >
      {/* Row 1: Time Range Selection */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Space size="middle" wrap>
          <Space size={6}>
            <CalendarOutlined style={{ color: "#1677ff", fontSize: 16 }} />
            <Text strong>Mốc thời gian:</Text>
          </Space>
          <Radio.Group
            value={timePreset}
            onChange={(e) => onTimePresetChange(e.target.value)}
            buttonStyle="solid"
          >
            <Radio.Button value="1_MONTH">1 tháng</Radio.Button>
            <Radio.Button value="3_MONTHS">3 tháng</Radio.Button>
            <Radio.Button value="6_MONTHS">6 tháng</Radio.Button>
            <Radio.Button value="12_MONTHS">12 tháng</Radio.Button>
            <Radio.Button value="CUSTOM">Tùy chọn ngày</Radio.Button>
          </Radio.Group>

          {timePreset === "CUSTOM" && (
            <RangePicker
              value={dateRange}
              onChange={(dates) => {
                if (dates && dates[0] && dates[1]) {
                  onDateRangeChange([dates[0], dates[1]]);
                }
              }}
              format="DD/MM/YYYY"
              allowClear={false}
              style={{ width: 250 }}
            />
          )}

          <Tag color="blue" style={{ fontSize: 12, padding: "2px 8px" }}>
            Từ {dateRange[0].format("DD/MM/YYYY")} đến {dateRange[1].format("DD/MM/YYYY")}
          </Tag>
        </Space>

        <Space size="small">
          <Text type="secondary">Tổng số dữ liệu:</Text>
          <Tag color="green" style={{ fontSize: 13, fontWeight: 700 }}>
            {totalRecords} lượt sửa chữa
          </Tag>
        </Space>
      </div>

      <Divider style={{ margin: "10px 0 14px 0" }} />

      {/* Row 2: Device Selection & Actions */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Device Mode & Selectors */}
        <Space size="middle" wrap style={{ flex: 1 }}>
          <Space size={6}>
            <CarOutlined style={{ color: "#1677ff", fontSize: 16 }} />
            <Text strong>Phạm vi thiết bị:</Text>
          </Space>

          <Radio.Group
            value={deviceFilterMode}
            onChange={(e) => onDeviceFilterModeChange(e.target.value)}
          >
            <Radio value="GROUP">
              <Space size={4}>
                <AppstoreOutlined />
                <span>Theo nhóm xe</span>
              </Space>
            </Radio>
            <Radio value="CUSTOM_DEVICES">
              <Space size={4}>
                <CarOutlined />
                <span>Chọn xe theo nhu cầu</span>
              </Space>
            </Radio>
          </Radio.Group>

          {deviceFilterMode === "GROUP" ? (
            <Select
              value={selectedGroupId}
              onChange={onSelectedGroupIdChange}
              style={{ minWidth: 260 }}
              placeholder="Chọn nhóm xe"
            >
              <Select.Option value="ALL">
                🌟 Tất cả các nhóm xe ({deviceGroups.length} nhóm)
              </Select.Option>
              {deviceGroups.map((g) => (
                <Select.Option key={g.id} value={g.id}>
                  {g.name} ({g.devices?.length || 0} xe)
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Space size="small" wrap align="center">
              {/* Button to open VehiclePickerModal */}
              <Button
                type={selectedDeviceIds.length > 0 ? "primary" : "default"}
                ghost={selectedDeviceIds.length > 0}
                icon={<CarOutlined />}
                onClick={onOpenVehiclePicker}
                style={{ fontWeight: 600 }}
              >
                {selectedDeviceIds.length > 0
                  ? `Đã chọn: ${selectedDeviceIds.length} xe (Bấm để đổi)`
                  : "Bấm để chọn xe theo nhu cầu..."}
              </Button>

              {/* Render selected vehicle tags */}
              {selectedDevicesList.slice(0, 3).map((d) => (
                <Tag
                  key={d.device_id}
                  closable
                  onClose={() => d.device_id && onRemoveDeviceId(d.device_id)}
                  color="blue"
                  style={{ fontSize: 12, padding: "2px 8px" }}
                >
                  {d.reg_number ? `[${d.reg_number}] ` : ""}
                  {d.name || "Xe"}
                </Tag>
              ))}

              {selectedDevicesList.length > 3 && (
                <Tooltip
                  title={selectedDevicesList
                    .slice(3)
                    .map((d) => `${d.reg_number || ""}: ${d.name || ""}`)
                    .join(", ")}
                >
                  <Tag color="cyan">+{selectedDevicesList.length - 3} xe khác</Tag>
                </Tooltip>
              )}

              {selectedDeviceIds.length > 0 && (
                <Tooltip title="Xóa tất cả các xe đã chọn (xem toàn bộ xe)">
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<CloseCircleOutlined />}
                    onClick={onClearAllDeviceIds}
                  >
                    Bỏ lọc xe
                  </Button>
                </Tooltip>
              )}
            </Space>
          )}

          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={onFetch}
            loading={loading}
          >
            Làm mới
          </Button>
        </Space>

        {/* Right Actions: Print Preview, Print, Export PDF */}
        <Space size="small" wrap>
          <Button icon={<EyeOutlined />} onClick={onOpenPreviewModal}>
            Xem trước bản in (A4)
          </Button>

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
    </Card>
  );
};
