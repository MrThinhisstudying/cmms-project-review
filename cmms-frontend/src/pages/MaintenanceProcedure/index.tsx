import React, { useEffect, useState } from "react";
import {
  Table,
  Button,
  Card,
  message,
  Popconfirm,
  Tooltip,
  Modal,
  Select,
  Input,
  DatePicker,
  Space,
  Row,
  Col,
  Tag,
  Descriptions,
} from "antd"; // Import Tag ở đây
import {
  PlusOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import {
  deleteTemplate,
  getAllTemplates,
  getTemplateById,
} from "../../apis/maintenance";
import { getToken } from "../../utils/auth";
import ImportTemplateModal from "./components/ImportTemplateModal";
import DeviceTypeManagerModal from "./components/DeviceTypeManagerModal";
import { getAllDeviceTypes } from "../../apis/device-types";
import ChecklistExecutor from "../MaintenanceManagement/components/ChecklistExecutor"; // Đảm bảo đường dẫn này đúng
import { DEVICE_TYPES } from "../../constants/device-types";
import { EditOutlined, UnorderedListOutlined } from "@ant-design/icons"; // Sửa icon logic

const { Option } = Select;
const { RangePicker } = DatePicker;

const MaintenanceProcedurePage: React.FC = () => {
  const [allTemplates, setAllTemplates] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // State Bộ lọc
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<any>(null);

  // State Modals
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewLevel, setPreviewLevel] = useState("1M");

  //State update
  const [editData, setEditData] = useState<any>(null);
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await getAllTemplates(token);
      // Sắp xếp mới nhất lên đầu
      const sorted = Array.isArray(res)
        ? res.sort(
            (a: any, b: any) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
        : [];
      setAllTemplates(sorted);
      setFilteredData(sorted);
    } catch (error) {
      message.error("Lỗi tải danh sách");
    } finally {
      setLoading(false);
    }
  };

  // State Device Types
  const [deviceTypes, setDeviceTypes] = useState<any[]>([]);
  const [isTypeManagerOpen, setIsTypeManagerOpen] = useState(false);

  const fetchDeviceTypesList = async () => {
    try {
        const token = getToken();
        const res = await getAllDeviceTypes(token);
        setDeviceTypes(res);
    } catch (error) {
        console.error("Lỗi tải loại thiết bị", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchDeviceTypesList();
  }, []);

  // Logic lọc dữ liệu
  useEffect(() => {
    let result = [...allTemplates];

    if (searchText) {
      result = result.filter((item) =>
        item.name.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (filterType) {
      result = result.filter((item) => item.device_type === filterType);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf("day").valueOf();
      const end = dateRange[1].endOf("day").valueOf();
      result = result.filter((item) => {
        const created = new Date(item.created_at).getTime();
        return created >= start && created <= end;
      });
    }

    setFilteredData(result);
  }, [searchText, filterType, dateRange, allTemplates]);

  const handleViewDetail = async (id: number) => {
    try {
      const token = getToken();
      const res = await getTemplateById(id, token);
      // Kiểm tra cấu trúc trả về
      const data = res; // Save full response to get metadata
      
      if (data) {
        setPreviewData(data);
        setIsPreviewOpen(true);
      }
    } catch (err) {
      message.error("Không tải được chi tiết");
    }
  };

  // Hàm xóa
  const handleDelete = async (id: number) => {
    try {
      const token = getToken();
      await deleteTemplate(id, token);
      message.success("Xóa thành công!");
      fetchTemplates(); // Reload bảng
    } catch (error) {
      message.error("Xóa thất bại");
    }
  };

  // Hàm mở modal sửa
  const handleEdit = (record: any) => {
    setEditData(record);
    setIsImportOpen(true); // Tái sử dụng modal import
  };

  const columns = [
    {
      title: "STT",
      key: "index",
      width: 60,
      align: "center" as const,
      render: (text: any, record: any, index: number) => index + 1,
    },
    // --- THÊM CỘT NÀY VÀO ĐẦU ---
    {
      title: "Mã quy trình",
      dataIndex: "code",
      key: "code",
      width: 150,
      render: (text: string) => (
        <span style={{ fontWeight: "bold", color: "#1890ff" }}>
          {text || "---"}
        </span>
      ),
    },
    // -----------------------------
    {
      title: "Tên Quy Trình",
      dataIndex: "name",
      fontWeight: "bold",
      render: (text: string) => (
        <span style={{ fontWeight: 600, color: "#1890ff" }}>{text}</span>
      ),
    },
    {
      title: "Loại thiết bị",
      dataIndex: "device_type",
      render: (t: string) => {
        const map: any = {
          xe_dau_keo: "Xe Đầu Kéo",
          xe_cho_khach: "Xe Chở Khách",
          xe_cap_dien: "Xe Cấp Điện",
          xe_cuu_hoa: "Xe Cứu Hỏa",
        };
        return <Tag color="blue">{map[t] || t || "Khác"}</Tag>;
      },
    },
    {
      title: "Ngày tạo",
      dataIndex: "created_at",
      width: 150,
      render: (d: string) =>
        d ? new Date(d).toLocaleDateString("vi-VN") : "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center" as const,
      render: (_, record: any) => (
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }}>
          <Tooltip title="Xem nội dung">
            <Button
              icon={<EyeOutlined />}
              size="small"
              onClick={() => handleViewDetail(record.id)}
            />
          </Tooltip>
          {/* Nút Sửa */}
          <Tooltip title="Sửa tên/loại">
            <Button
              icon={<EditOutlined />}
              size="small"
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          {/* Nút Xóa */}
          <Popconfirm
            title="Xóa quy trình này?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* HEADER & FILTER BAR */}
      <Card style={{ marginBottom: 16, borderRadius: 8 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0 }}>📂 Thư Viện Quy Trình</h3>
          <Space>
            <Button
                icon={<UnorderedListOutlined />}
                onClick={() => setIsTypeManagerOpen(true)}
            >
                Quản lý Loại xe
            </Button>
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsImportOpen(true)}
            >
                Thêm Mới
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Input
              placeholder="Tìm kiếm theo tên quy trình..."
              prefix={<SearchOutlined />}
              allowClear
              onChange={(e) => setSearchText(e.target.value)}
            />
          </Col>
          <Col span={6}>
            <Select
              placeholder="Lọc theo loại..."
              allowClear
              onChange={(val) => setFilterType(val)}
            >
              {deviceTypes.map((t) => (
                <Option key={t.code} value={t.code}>
                  {t.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              onChange={(dates) => setDateRange(dates)}
            />
          </Col>
          <Col span={4} style={{ textAlign: "right" }}>
            <Button icon={<ReloadOutlined />} onClick={() => { fetchTemplates(); fetchDeviceTypesList(); }}>
              Làm mới
            </Button>
          </Col>
        </Row>
      </Card>

      {/* BẢNG DỮ LIỆU */}
      <Card style={{ borderRadius: 8 }}>
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `Tổng ${total} quy trình`,
          }}
        />
      </Card>

      <DeviceTypeManagerModal 
        open={isTypeManagerOpen} 
        onChange={fetchDeviceTypesList}
        onClose={() => {
            setIsTypeManagerOpen(false);
            fetchDeviceTypesList();
        }} 
      />

      <ImportTemplateModal
        open={isImportOpen}
        editData={editData} // Truyền dữ liệu sửa vào
        onCancel={() => {
          setIsImportOpen(false);
          setEditData(null);
        }}
        onSuccess={() => {
          setIsImportOpen(false);
          setEditData(null);
          fetchTemplates();
        }}
      />

      <Modal
        title="Xem Chi Tiết Quy Trình"
        open={isPreviewOpen}
        onCancel={() => setIsPreviewOpen(false)}
        footer={null}
        width={900}
      >
          <Descriptions size="small" bordered column={2} style={{ marginBottom: 16 }}>
             <Descriptions.Item label="Mã Quy Trình">{previewData?.code}</Descriptions.Item>
             <Descriptions.Item label="Tên Quy Trình">{previewData?.name}</Descriptions.Item>
             <Descriptions.Item label="Loại thiết bị">{previewData?.device_type}</Descriptions.Item>
             <Descriptions.Item label="Phiên bản">{previewData?.release_no || "01"} / {previewData?.revision_no || "00"}</Descriptions.Item>
          </Descriptions>

        <div
          style={{
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span>Xem nội dung cấp:</span>
          <Select
            value={previewLevel}
            onChange={setPreviewLevel}
            style={{ width: 120 }}
          >
            <Option value="Tuần">Tuần</Option>
            <Option value="1M">1 Tháng</Option>
            <Option value="3M">3 Tháng</Option>
            <Option value="6M">6 Tháng</Option>
            <Option value="1Y">1 Năm</Option>
            <Option value="2Y">2 Năm</Option>
          </Select>
        </div>
        {previewData ? (
          <div
            style={{
              border: "1px solid #f0f0f0",
              borderRadius: 8,
              padding: 10,
              background: "#fafafa",
            }}
          >
            <ChecklistExecutor
              templateData={previewData?.checklist_structure || previewData}
              currentLevel={previewLevel}
              onChange={() => {}}
            />
          </div>
        ) : (
          <p>Đang tải...</p>
        )}
      </Modal>
    </div>
  );
};

export default MaintenanceProcedurePage;
