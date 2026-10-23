import React, { useState, useEffect } from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  message,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import MaintenanceHeader from "./components/MaintenanceHeader";
import MaintenanceTable from "./components/MaintenanceTable";
import MaintenanceForm from "./components/MaintenanceForm";
import EditPlanModal from "./components/EditPlanModal";
import MaintenanceImportModal from "./components/MaintenanceImportModal";
import BatchMaintenanceModal from "./components/BatchMaintenanceModal";
import CreatePlanModal from "./components/CreatePlanModal";
import { getDashboardOverview } from "../../apis/maintenance";
import moment from "moment";

const { Option } = Select;
const { RangePicker } = DatePicker;

const MaintenanceManagement: React.FC = () => {
  // --- STATE QUẢN LÝ MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // ... (keep existing state)
  const [allData, setAllData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- STATE BỘ LỌC ---
  const [searchText, setSearchText] = useState("");
  const [filterLevel, setFilterLevel] = useState<string | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(
    undefined
  );
  const [dateRange, setDateRange] = useState<any>(null);

  // 1. Hàm lấy dữ liệu từ Server
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await getDashboardOverview(null);
      const data = Array.isArray(res) ? res : [];
      setAllData(data);
      setFilteredData(data); // Mới vào chưa lọc thì bằng data gốc
    } catch (error) {
      message.error("Không thể tải danh sách kế hoạch");
    } finally {
      setLoading(false);
    }
  };

  // Gọi API khi vào trang
  useEffect(() => {
    fetchData();
  }, []);

  // 2. Logic Lọc Dữ Liệu
  useEffect(() => {
    let result = [...allData];

    // Lọc theo Từ khóa
    if (searchText) {
      const lowerText = searchText.toLowerCase();
      result = result.filter(
        (item) =>
          item.device?.name?.toLowerCase().includes(lowerText) ||
          item.device?.serial_number?.toLowerCase().includes(lowerText)
      );
    }

    // Lọc theo Cấp độ
    if (filterLevel) {
      result = result.filter((item) => item.level === filterLevel);
    }

    // Lọc theo Trạng thái (Frontend logic)
    if (filterStatus) {
      const today = moment().startOf("day");
      result = result.filter((item) => {
        if (item.status !== "active") return filterStatus === item.status;

        if (!item.next_maintenance_date) return false;
        const nextDate = moment(item.next_maintenance_date).startOf("day");
        const diffDays = nextDate.diff(today, "days");

        if (filterStatus === "overdue") return diffDays < 0;
        if (filterStatus === "warning") return diffDays >= 0 && diffDays <= 5;
        if (filterStatus === "active") return diffDays > 5;
        return false;
      });
    }

    // Lọc theo Ngày đến hạn
    if (dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0].startOf("day");
      const end = dateRange[1].endOf("day");
      result = result.filter((item) => {
        if (!item.next_maintenance_date) return false;
        const nextDate = moment(item.next_maintenance_date);
        return nextDate.isSameOrAfter(start) && nextDate.isSameOrBefore(end);
      });
    }

    setFilteredData(result);
  }, [searchText, filterLevel, filterStatus, dateRange, allData]);

  // --- HANDLERS ---
  const handleRefresh = () => {
    fetchData();
    setIsModalOpen(false);
    setIsEditOpen(false);
    setIsCreatePlanOpen(false);
  };

  const handleCreateNew = () => {
    setInitialData(null);
    setIsModalOpen(true);
  };

  const handlePerformMaintenance = (record: any) => {
    setInitialData({
      device_id: record.device?.device_id,
      maintenance_level: record.level,
      scheduled_date: record.next_maintenance_date,
      device: record.device,
      maintenance_id: record.maintenance_id,
    });
    setIsModalOpen(true);
  };

  const handleEditPlan = (record: any) => {
    setEditingRecord(record);
    setIsEditOpen(true);
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        background: "#f0f2f5",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <MaintenanceHeader 
        onCreate={handleCreateNew} 
        onCreatePlan={() => setIsCreatePlanOpen(true)}
        onRefresh={fetchData} 
        onImport={() => setIsImportOpen(true)}
        onBatchMaintenance={() => setIsBatchOpen(true)}
      />

      {/* Filter Bar */}
      <Card
        styles={{ body: { padding: "16px" } }}
        style={{ marginBottom: 16, borderRadius: 8 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={6}>
            <Input
              placeholder="🔍 Tìm thiết bị, biển số..."
              prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Cấp độ"
              style={{ width: "100%" }}
              allowClear
              onChange={setFilterLevel}
            >
              <Option value="Tuần">1 tuần</Option>
              <Option value="1M">01 Tháng</Option>
              <Option value="3M">03 Tháng</Option>
              <Option value="6M">06 Tháng</Option>
              <Option value="9M">09 Tháng</Option>
              <Option value="1Y">01 Năm</Option>
              <Option value="2Y">02 Năm</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Trạng thái"
              style={{ width: "100%" }}
              allowClear
              onChange={setFilterStatus}
            >
              <Option value="overdue">🔴 Quá hạn</Option>
              <Option value="warning">🟠 Sắp đến hạn</Option>
              <Option value="active">🔵 Đang theo dõi</Option>
            </Select>
          </Col>
          <Col xs={12} md={6}>
            <RangePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              onChange={(dates) => setDateRange(dates)}
            />
          </Col>
          <Col xs={24} md={4} style={{ textAlign: "right" }}>
            <div style={{ lineHeight: "32px", color: "#888" }}>
              <FilterOutlined /> <b>{filteredData.length}</b> xe
            </div>
          </Col>
        </Row>
      </Card>

      {/* BẢNG DỮ LIỆU (Đã sửa props cho khớp với con) */}
      <MaintenanceTable
        loading={loading} // Truyền loading
        dataSource={filteredData} // Truyền data đã lọc
        onCreateTicket={handlePerformMaintenance}
        onEdit={handleEditPlan}
        onRefresh={fetchData}
      />

      {/* Modal Lập phiếu */}
      <Modal
        title={
          initialData
            ? "Thực Hiện Bảo Dưỡng Định Kỳ"
            : "Lập Phiếu Bảo Dưỡng Mới"
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        width={750}
        destroyOnClose
        maskClosable={false}
        centered
      >
        <MaintenanceForm
          initialData={initialData}
          onSuccess={handleRefresh}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Modal Tạo Kế Hoạch Mới (Create Plan) */}
      <CreatePlanModal
        open={isCreatePlanOpen}
        onCancel={() => setIsCreatePlanOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Modal Sửa kế hoạch */}
      <EditPlanModal
        open={isEditOpen}
        data={editingRecord}
        onCancel={() => setIsEditOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Modal Import Kế hoạch */}
      <MaintenanceImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleRefresh}
      />

      {/* Modal Làm bảo dưỡng hàng loạt qua Excel */}
      <BatchMaintenanceModal
        open={isBatchOpen}
        onClose={() => setIsBatchOpen(false)}
        onSuccess={handleRefresh}
      />
    </div>
  );
};

export default MaintenanceManagement;
