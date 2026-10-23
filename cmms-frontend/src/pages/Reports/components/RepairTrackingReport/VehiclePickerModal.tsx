import React, { useState, useMemo } from "react";
import {
  Modal,
  Table,
  Input,
  Radio,
  Space,
  Tag,
  Button,
  Typography,
  Badge,
} from "antd";
import {
  SearchOutlined,
  CheckSquareOutlined,
  CloseSquareOutlined,
  CarOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { IDevice } from "../../../../types/devicesManagement.types";
import { IDeviceGroup } from "../../../../apis/device-groups";

const { Text } = Typography;

interface VehiclePickerModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (selectedIds: number[]) => void;
  allDevices: IDevice[];
  deviceGroups: IDeviceGroup[];
  initialSelectedIds: number[];
}

export const VehiclePickerModal: React.FC<VehiclePickerModalProps> = ({
  open,
  onClose,
  onConfirm,
  allDevices,
  deviceGroups,
  initialSelectedIds,
}) => {
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>(initialSelectedIds);
  const [searchText, setSearchText] = useState<string>("");
  const [filterGroupId, setFilterGroupId] = useState<number | "ALL">("ALL");

  // Keep selectedRowKeys synced when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedRowKeys(initialSelectedIds);
      setSearchText("");
    }
  }, [open, initialSelectedIds]);

  // Map device to group name
  const deviceGroupMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string }>();
    deviceGroups.forEach((g) => {
      if (g.devices && Array.isArray(g.devices)) {
        g.devices.forEach((d: any) => {
          if (d.device_id) {
            map.set(d.device_id, { id: g.id, name: g.name });
          }
        });
      }
    });
    return map;
  }, [deviceGroups]);

  // Filtered devices
  const filteredDevices = useMemo(() => {
    return allDevices.filter((device) => {
      // 1. Group filter
      if (filterGroupId !== "ALL") {
        const groupInfo = device.device_id ? deviceGroupMap.get(device.device_id) : undefined;
        const matchesGroup =
          groupInfo?.id === filterGroupId ||
          (device as any)?.group_id === filterGroupId;
        if (!matchesGroup) return false;
      }

      // 2. Search text
      if (searchText.trim()) {
        const query = searchText.toLowerCase().trim();
        const nameMatch = (device.name || "").toLowerCase().includes(query);
        const regMatch = (device.reg_number || "").toLowerCase().includes(query);
        const codeMatch = (device.device_code || "").toLowerCase().includes(query);
        return nameMatch || regMatch || codeMatch;
      }

      return true;
    });
  }, [allDevices, filterGroupId, searchText, deviceGroupMap]);

  const handleSelectAllVisible = () => {
    const visibleIds = filteredDevices
      .map((d) => d.device_id)
      .filter((id): id is number => typeof id === "number");
    const merged = Array.from(new Set([...selectedRowKeys, ...visibleIds]));
    setSelectedRowKeys(merged);
  };

  const handleDeselectAllVisible = () => {
    const visibleIds = new Set(
      filteredDevices
        .map((d) => d.device_id)
        .filter((id): id is number => typeof id === "number")
    );
    setSelectedRowKeys(selectedRowKeys.filter((key) => !visibleIds.has(Number(key))));
  };

  const handleClearAll = () => {
    setSelectedRowKeys([]);
  };

  const handleOk = () => {
    onConfirm(selectedRowKeys.map((k) => Number(k)));
    onClose();
  };

  const columns: ColumnsType<IDevice> = [
    {
      title: "Biển số / Mã xe",
      dataIndex: "reg_number",
      key: "reg_number",
      width: 140,
      render: (val, record) => {
        const display = val || record.device_code || "-";
        return (
          <Tag color="blue" style={{ fontWeight: 600, fontSize: 13, padding: "2px 8px" }}>
            {display}
          </Tag>
        );
      },
    },
    {
      title: "Tên thiết bị / Xe",
      dataIndex: "name",
      key: "name",
      render: (text) => <Text strong>{text || "Chưa đặt tên"}</Text>,
    },
    {
      title: "Nhóm xe",
      key: "group",
      width: 180,
      render: (_, record) => {
        const groupInfo = record.device_id ? deviceGroupMap.get(record.device_id) : undefined;
        if (groupInfo) {
          return <Tag color="geekblue">{groupInfo.name}</Tag>;
        }
        return <Text type="secondary">Chưa phân nhóm</Text>;
      },
    },
    {
      title: "Tình trạng",
      dataIndex: "status",
      key: "status",
      width: 130,
      align: "center",
      render: (status) => {
        if (status === "DANG_SU_DUNG") return <Tag color="green">Đang sử dụng</Tag>;
        if (status === "DANG_SUA_CHUA") return <Tag color="orange">Đang sửa chữa</Tag>;
        if (status === "HONG") return <Tag color="red">Hỏng</Tag>;
        return <Tag color="default">{status || "Bình thường"}</Tag>;
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys);
    },
  };

  return (
    <Modal
      title={
        <Space size="middle" align="center">
          <CarOutlined style={{ fontSize: 20, color: "#1677ff" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Chọn xe theo nhu cầu báo cáo</div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Chọn các xe cụ thể cần đưa vào Sổ theo dõi sửa chữa
            </Text>
          </div>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={840}
      destroyOnClose
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Badge
              count={selectedRowKeys.length}
              overflowCount={999}
              style={{ backgroundColor: "#1677ff", marginRight: 8 }}
            />
            <Text strong>Đã chọn {selectedRowKeys.length} xe</Text>
            {selectedRowKeys.length > 0 && (
              <Button type="link" size="small" onClick={handleClearAll} style={{ marginLeft: 8 }}>
                Xóa tất cả đã chọn
              </Button>
            )}
          </div>
          <Space>
            <Button onClick={onClose}>Đóng</Button>
            <Button type="primary" onClick={handleOk}>
              Áp dụng danh sách ({selectedRowKeys.length} xe)
            </Button>
          </Space>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingTop: 10 }}>
        {/* Search & Actions Bar */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Input
            prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
            placeholder="Tìm theo biển số, mã xe, tên xe (ví dụ: VCS11205, Toyota...)"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            style={{ flex: 1, minWidth: 260 }}
          />

          <Space size="small">
            <Button
              size="small"
              icon={<CheckSquareOutlined />}
              onClick={handleSelectAllVisible}
            >
              Chọn tất cả đang xem ({filteredDevices.length})
            </Button>
            <Button
              size="small"
              icon={<CloseSquareOutlined />}
              onClick={handleDeselectAllVisible}
            >
              Bỏ chọn đang xem
            </Button>
          </Space>
        </div>

        {/* Group Filter Selector */}
        {deviceGroups.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Lọc theo nhóm:
            </Text>
            <Radio.Group
              value={filterGroupId}
              onChange={(e) => setFilterGroupId(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="ALL">Tất cả ({allDevices.length})</Radio.Button>
              {deviceGroups.map((g) => (
                <Radio.Button key={g.id} value={g.id}>
                  {g.name} ({g.devices?.length || 0})
                </Radio.Button>
              ))}
            </Radio.Group>
          </div>
        )}

        {/* Table of devices */}
        <Table<IDevice>
          rowKey={(record) => record.device_id || record.reg_number || ""}
          rowSelection={rowSelection}
          columns={columns}
          dataSource={filteredDevices}
          pagination={{
            pageSize: 8,
            showSizeChanger: false,
            showTotal: (total) => `Tổng ${total} thiết bị`,
          }}
          size="middle"
          scroll={{ y: 360 }}
          style={{ border: "1px solid #f1f5f9", borderRadius: 8 }}
        />
      </div>
    </Modal>
  );
};
