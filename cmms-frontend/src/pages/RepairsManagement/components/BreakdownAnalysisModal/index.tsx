import React, { useMemo, useState } from "react";
import {
  Modal,
  Tabs,
  Card,
  Row,
  Col,
  Table,
  Tag,
  Button,
  Select,
  Typography,
  Space,
  Empty,
  Alert,
} from "antd";
import {
  BarChartOutlined,
  WarningOutlined,
  ToolOutlined,
  CarOutlined,
  FilterOutlined,
  HistoryOutlined,
  AppstoreOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { IRepair } from "../../../../types/repairs.types";

const { Text } = Typography;
const { Option } = Select;

interface Props {
  open: boolean;
  onClose: () => void;
  repairs: IRepair[];
  onFilterByDevice: (deviceId: number) => void;
}

interface DeviceStat {
  deviceId: number;
  name: string;
  regNumber: string;
  serialNumber: string;
  brand: string;
  repairCount: number;
  recentDefects: string[];
  repairs: IRepair[];
  partsUsed: Array<{ name: string; quantity: number; unit?: string }>;
}

const BreakdownAnalysisModal: React.FC<Props> = ({
  open,
  onClose,
  repairs,
  onFilterByDevice,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);

  // 1. Tổng hợp dữ liệu theo từng thiết bị
  const deviceStats = useMemo<DeviceStat[]>(() => {
    const map = new Map<number, DeviceStat>();

    repairs.forEach((r) => {
      const dev = r.device;
      if (!dev?.device_id) return;

      if (!map.has(dev.device_id)) {
        map.set(dev.device_id, {
          deviceId: dev.device_id,
          name: dev.name || "Không rõ tên",
          regNumber: dev.reg_number || "",
          serialNumber: dev.serial_number || "",
          brand: dev.brand || "",
          repairCount: 0,
          recentDefects: [],
          repairs: [],
          partsUsed: [],
        });
      }

      const item = map.get(dev.device_id)!;
      item.repairCount += 1;
      item.repairs.push(r);

      if (r.description_defect && !item.recentDefects.includes(r.description_defect)) {
        item.recentDefects.push(r.description_defect);
      }

      // Thu thập phụ tùng sử dụng
      if (Array.isArray(r.inspection_materials)) {
        r.inspection_materials.forEach((m: any) => {
          const partName = m.item_name || m.name || (m.item && m.item.name) || "";
          const qty = Number(m.quantity || m.actual_quantity || 1);
          if (partName) {
            const existingPart = item.partsUsed.find((p) => p.name === partName);
            if (existingPart) {
              existingPart.quantity += qty;
            } else {
              item.partsUsed.push({ name: partName, quantity: qty, unit: m.unit });
            }
          }
        });
      }

      if (Array.isArray(r.stock_outs)) {
        r.stock_outs.forEach((s: any) => {
          const partName = s.item?.name || "";
          const qty = Number(s.quantity || 1);
          if (partName) {
            const existingPart = item.partsUsed.find((p) => p.name === partName);
            if (existingPart) {
              existingPart.quantity += qty;
            } else {
              item.partsUsed.push({ name: partName, quantity: qty, unit: s.item?.unit });
            }
          }
        });
      }
    });

    // Sắp xếp theo số lần hỏng giảm dần (Top hỏng nhiều nhất lên trước)
    return Array.from(map.values()).sort((a, b) => b.repairCount - a.repairCount);
  }, [repairs]);

  // Thiết bị đang được chọn xem chi tiết
  const currentDevice = useMemo(() => {
    if (!selectedDeviceId) return deviceStats[0] || null;
    return deviceStats.find((d) => d.deviceId === selectedDeviceId) || deviceStats[0] || null;
  }, [deviceStats, selectedDeviceId]);

  // Tổng hợp top phụ tùng thay thế toàn hệ thống
  const topParts = useMemo(() => {
    const partsMap = new Map<string, { name: string; quantity: number; unit?: string }>();
    deviceStats.forEach((d) => {
      d.partsUsed.forEach((p) => {
        if (!partsMap.has(p.name)) {
          partsMap.set(p.name, { name: p.name, quantity: 0, unit: p.unit });
        }
        partsMap.get(p.name)!.quantity += p.quantity;
      });
    });
    return Array.from(partsMap.values()).sort((a, b) => b.quantity - a.quantity);
  }, [deviceStats]);

  const totalRepairs = repairs.length;
  const uniqueDevices = deviceStats.length;
  const topFailure = deviceStats[0];

  const getWarningLevel = (count: number) => {
    if (count >= 4) {
      return {
        tag: <Tag color="error">🔴 Rất cao (Cần đại tu / theo dõi đặc biệt)</Tag>,
        status: "danger",
      };
    }
    if (count >= 2) {
      return {
        tag: <Tag color="warning">🟡 Trung bình (Cần kiểm tra định kỳ kỹ hơn)</Tag>,
        status: "warning",
      };
    }
    return {
      tag: <Tag color="success">🟢 Bình thường</Tag>,
      status: "normal",
    };
  };

  const rankingColumns = [
    {
      title: "Hạng",
      key: "rank",
      width: 60,
      align: "center" as const,
      render: (_: any, __: any, index: number) => (
        <span
          style={{
            fontWeight: "bold",
            color: index === 0 ? "#cf1322" : index < 3 ? "#fa8c16" : "#595959",
            fontSize: index < 3 ? 15 : 13,
          }}
        >
          #{index + 1}
        </span>
      ),
    },
    {
      title: "Thiết bị",
      key: "device",
      render: (_: any, r: DeviceStat) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1890ff" }}>
            <CarOutlined style={{ marginRight: 6 }} />
            {r.name}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {r.regNumber ? <Tag color="cyan" style={{ fontSize: 11 }}>BS: {r.regNumber}</Tag> : null}
            {r.serialNumber ? <span style={{ color: "#8c8c8c" }}>SN: {r.serialNumber}</span> : null}
          </div>
        </div>
      ),
    },
    {
      title: "Số lần hỏng",
      dataIndex: "repairCount",
      key: "repairCount",
      width: 110,
      align: "center" as const,
      sorter: (a: DeviceStat, b: DeviceStat) => a.repairCount - b.repairCount,
      defaultSortOrder: "descend" as const,
      render: (count: number) => (
        <div style={{ fontSize: 16, fontWeight: 700, color: count >= 3 ? "#cf1322" : "#1890ff" }}>
          {count} <span style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c" }}>lần</span>
        </div>
      ),
    },
    {
      title: "Đánh giá mức độ",
      key: "warning",
      width: 250,
      render: (_: any, r: DeviceStat) => getWarningLevel(r.repairCount).tag,
    },
    {
      title: "Lỗi thường gặp gần đây",
      key: "defects",
      render: (_: any, r: DeviceStat) => (
        <div>
          {r.recentDefects.slice(0, 2).map((d, i) => (
            <div key={i} style={{ fontSize: 12, color: "#555" }}>
              • {d}
            </div>
          ))}
          {r.recentDefects.length === 0 && <span style={{ color: "#aaa", fontStyle: "italic" }}>Không có mô tả chi tiết</span>}
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 170,
      align: "center" as const,
      render: (_: any, r: DeviceStat) => (
        <Space size="small">
          <Button
            size="small"
            type="link"
            icon={<HistoryOutlined />}
            onClick={() => {
              setSelectedDeviceId(r.deviceId);
            }}
          >
            Chi tiết
          </Button>
          <Button
            size="small"
            type="primary"
            ghost
            icon={<FilterOutlined />}
            onClick={() => {
              onClose();
              onFilterByDevice(r.deviceId);
            }}
          >
            Lọc phiếu
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={1050}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#fff7e6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BarChartOutlined style={{ fontSize: 20, color: "#fa8c16" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              Tổng Hợp & Đánh Giá Hỏng Hóc Thiết Bị
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c" }}>
              Phân tích tần suất sự cố, thiết bị thường xuyên hỏng hóc và phụ tùng thay thế
            </div>
          </div>
        </div>
      }
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Đóng
        </Button>,
      ]}
    >
      {/* 4 Thẻ KPI Tổng Hợp */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col span={6}>
          <Card size="small" style={{ background: "#f0f5ff", borderColor: "#adc6ff" }}>
            <div style={{ fontSize: 12, color: "#595959" }}>Tổng lượt sửa chữa</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#1d39c4" }}>
              {totalRepairs} <span style={{ fontSize: 12, fontWeight: 400 }}>vụ</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: "#f6ffed", borderColor: "#b7eb8f" }}>
            <div style={{ fontSize: 12, color: "#595959" }}>Thiết bị từng gặp sự cố</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#389e0d" }}>
              {uniqueDevices} <span style={{ fontSize: 12, fontWeight: 400 }}>xe / TB</span>
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: "#fff2e8", borderColor: "#ffbb96" }}>
            <div style={{ fontSize: 12, color: "#595959" }}>TB hỏng nhiều nhất</div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "#d4380d",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={topFailure?.name}
            >
              {topFailure ? `${topFailure.regNumber || topFailure.name} (${topFailure.repairCount} lần)` : "---"}
            </div>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ background: "#fff0f6", borderColor: "#ffadd2" }}>
            <div style={{ fontSize: 12, color: "#595959" }}>Tần suất TB/lần hỏng</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#c41d7f" }}>
              {uniqueDevices > 0 ? (totalRepairs / uniqueDevices).toFixed(1) : 0}{" "}
              <span style={{ fontSize: 12, fontWeight: 400 }}>lần / TB</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="ranking"
        items={[
          {
            key: "ranking",
            label: (
              <span>
                <WarningOutlined style={{ marginRight: 6 }} />
                Xếp Hạng Thiết Bị Hỏng Nhiều Nhất
              </span>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  showIcon
                  message={
                    <span>
                      Các thiết bị có số lần hỏng từ <b>3 lần trở lên</b> cần được lập kế hoạch kiểm tra chuyên sâu hoặc bảo dưỡng lớn để phòng ngừa sự cố nghiêm trọng.
                    </span>
                  }
                  style={{ marginBottom: 12 }}
                />
                <Table
                  dataSource={deviceStats}
                  columns={rankingColumns}
                  rowKey="deviceId"
                  size="small"
                  pagination={{ pageSize: 6, size: "small" }}
                  bordered
                />
              </div>
            ),
          },
          {
            key: "detail",
            label: (
              <span>
                <ToolOutlined style={{ marginRight: 6 }} />
                Chi Tiết Từng Thiết Bị
              </span>
            ),
            children: (
              <div>
                <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                  <Text strong>Chọn thiết bị cần đánh giá:</Text>
                  <Select
                    showSearch
                    optionFilterProp="children"
                    style={{ width: 350 }}
                    value={currentDevice?.deviceId}
                    onChange={(val) => setSelectedDeviceId(val)}
                  >
                    {deviceStats.map((d) => (
                      <Option key={d.deviceId} value={d.deviceId}>
                        {d.name} {d.regNumber ? `(BS: ${d.regNumber})` : ""} - {d.repairCount} lần hỏng
                      </Option>
                    ))}
                  </Select>

                  {currentDevice && (
                    <Button
                      type="primary"
                      ghost
                      size="small"
                      icon={<FilterOutlined />}
                      onClick={() => {
                        onClose();
                        onFilterByDevice(currentDevice.deviceId);
                      }}
                    >
                      Lọc phiếu xe này ở bảng chính
                    </Button>
                  )}
                </div>

                {currentDevice ? (
                  <div>
                    <Card
                      size="small"
                      style={{
                        marginBottom: 16,
                        background: "#fafafa",
                        borderRadius: 8,
                        borderColor: "#d9d9d9",
                      }}
                    >
                      <Row gutter={[16, 12]}>
                        <Col span={8}>
                          <Text type="secondary">Tên thiết bị:</Text>{" "}
                          <Text strong style={{ color: "#1890ff" }}>
                            {currentDevice.name}
                          </Text>
                        </Col>
                        <Col span={8}>
                          <Text type="secondary">Biển số / Serial:</Text>{" "}
                          <Tag color="cyan">{currentDevice.regNumber || currentDevice.serialNumber || "Chưa có"}</Tag>
                        </Col>
                        <Col span={8}>
                          <Text type="secondary">Tổng số lượt sửa chữa:</Text>{" "}
                          <Tag color="red" style={{ fontWeight: "bold" }}>
                            {currentDevice.repairCount} lần
                          </Tag>
                        </Col>
                        <Col span={24}>
                          <Text type="secondary">Đánh giá hệ thống:</Text>{" "}
                          {currentDevice.repairCount >= 3 ? (
                            <Text type="danger" strong>
                              ⚠️ Thiết bị phát sinh sự cố liên tục ({currentDevice.repairCount} lần). Khuyến nghị đội kỹ thuật kiểm tra toàn diện và đưa vào danh sách theo dõi đặc biệt.
                            </Text>
                          ) : (
                            <Text type="success">
                              ✅ Tần suất hư hỏng nằm trong giới hạn kiểm soát bình thường.
                            </Text>
                          )}
                        </Col>
                      </Row>
                    </Card>

                    <Row gutter={16}>
                      <Col span={14}>
                        <Card size="small" title="📋 Lịch Sử Các Lần Báo Hỏng">
                          <Table
                            dataSource={currentDevice.repairs}
                            rowKey="repair_id"
                            size="small"
                            pagination={{ pageSize: 4, size: "small" }}
                            columns={[
                              {
                                title: "Mã #",
                                dataIndex: "repair_id",
                                width: 70,
                                render: (id) => <span style={{ fontWeight: 600 }}>#{id}</span>,
                              },
                              {
                                title: "Ngày",
                                dataIndex: "created_at",
                                width: 100,
                                render: (d) => (d ? dayjs(d).format("DD/MM/YYYY") : "-"),
                              },
                              {
                                title: "Triệu chứng hỏng hóc",
                                dataIndex: "description_defect",
                                ellipsis: true,
                                render: (t) => t || "-",
                              },
                              {
                                title: "Người báo",
                                dataIndex: ["created_by", "name"],
                                width: 110,
                                render: (t) => t || "-",
                              },
                            ]}
                          />
                        </Card>
                      </Col>
                      <Col span={10}>
                        <Card size="small" title="🔩 Phụ Tùng / Vật Tư Đã Thay Thế">
                          {currentDevice.partsUsed.length === 0 ? (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="Chưa có dữ liệu vật tư xuất kho cho xe này"
                            />
                          ) : (
                            <Table
                              dataSource={currentDevice.partsUsed}
                              rowKey="name"
                              size="small"
                              pagination={{ pageSize: 4, size: "small" }}
                              columns={[
                                { title: "Tên phụ tùng / vật tư", dataIndex: "name" },
                                {
                                  title: "SL",
                                  dataIndex: "quantity",
                                  width: 70,
                                  align: "center",
                                  render: (q, r) => `${q} ${r.unit || ""}`,
                                },
                              ]}
                            />
                          )}
                        </Card>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <Empty description="Không có thiết bị nào" />
                )}
              </div>
            ),
          },
          {
            key: "parts",
            label: (
              <span>
                <AppstoreOutlined style={{ marginRight: 6 }} />
                Phụ Tùng Hao Tổn Toàn Đội Xe
              </span>
            ),
            children: (
              <div>
                <Alert
                  type="info"
                  message="Thống kê các loại phụ tùng, linh kiện đã được xuất kho thay thế nhiều nhất cho toàn bộ đội xe trong quá trình sửa chữa."
                  style={{ marginBottom: 12 }}
                  showIcon
                />
                <Table
                  dataSource={topParts}
                  rowKey="name"
                  size="small"
                  pagination={{ pageSize: 6, size: "small" }}
                  bordered
                  columns={[
                    {
                      title: "STT",
                      key: "stt",
                      width: 60,
                      align: "center",
                      render: (_, __, idx) => idx + 1,
                    },
                    {
                      title: "Tên linh kiện / phụ tùng",
                      dataIndex: "name",
                      render: (t) => <b>{t}</b>,
                    },
                    {
                      title: "Tổng số lượng đã xuất thay",
                      dataIndex: "quantity",
                      width: 180,
                      align: "center",
                      render: (q, r) => (
                        <Tag color="orange" style={{ fontSize: 13, fontWeight: "bold" }}>
                          {q} {r.unit || "cái"}
                        </Tag>
                      ),
                    },
                  ]}
                />
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default BreakdownAnalysisModal;
