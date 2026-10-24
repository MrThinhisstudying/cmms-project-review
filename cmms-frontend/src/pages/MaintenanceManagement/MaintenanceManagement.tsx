import React, { useState, useEffect } from "react";
import {
  Modal,
  Card,
  Row,
  Col,
  Input,
  Select,
  DatePicker,
  Button,
  message,
} from "antd";
import {
  SearchOutlined,
  FilterOutlined,
  ToolFilled,
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

  // --- THỐNG KÊ NHANH CHO KPI CARDS ---
  const kpiStats = React.useMemo(() => {
    const today = moment().startOf("day");
    let overdue = 0;
    let warning = 0;
    let normal = 0;

    allData.forEach((item) => {
      if (!item.next_maintenance_date) return;
      const nextDate = moment(item.next_maintenance_date).startOf("day");
      const diffDays = nextDate.diff(today, "days");
      if (diffDays < 0) overdue++;
      else if (diffDays <= 5) warning++;
      else normal++;
    });

    return {
      total: allData.length,
      overdue,
      warning,
      normal,
    };
  }, [allData]);

  const handleResetFilters = () => {
    setSearchText("");
    setFilterLevel(undefined);
    setFilterStatus(undefined);
    setDateRange(null);
  };

  return (
    <div
      style={{
        width: "100%",
        padding: "24px",
        background: "#f4f6f9",
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

      {/* KPI Statistic Cards (Click để lọc nhanh) */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Card 1: Tổng số thiết bị */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => setFilterStatus(undefined)}
            style={{
              borderRadius: 12,
              border: !filterStatus ? "2px solid #1677ff" : "1px solid #e8e8e8",
              boxShadow: !filterStatus
                ? "0 4px 16px rgba(22, 119, 255, 0.18)"
                : "0 2px 8px rgba(0,0,0,0.04)",
              background: "linear-gradient(135deg, #ffffff 0%, #f6faff 100%)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>
                  Tổng Thiết Bị Theo Dõi
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#0f172a" }}>
                  {kpiStats.total}
                </div>
                <div style={{ fontSize: 12, color: "#1677ff", marginTop: 4 }}>
                  {filterStatus === undefined ? "● Đang xem tất cả" : "Bấm để xem tất cả"}
                </div>
              </div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#e6f4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  color: "#1677ff",
                }}
              >
                🚚
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 2: Quá hạn cần bảo dưỡng */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => setFilterStatus(filterStatus === "overdue" ? undefined : "overdue")}
            style={{
              borderRadius: 12,
              border: filterStatus === "overdue" ? "2px solid #ff4d4f" : "1px solid #e8e8e8",
              boxShadow: filterStatus === "overdue"
                ? "0 4px 16px rgba(255, 77, 79, 0.2)"
                : "0 2px 8px rgba(0,0,0,0.04)",
              background: "linear-gradient(135deg, #ffffff 0%, #fff8f8 100%)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#ff4d4f", fontWeight: 600, marginBottom: 4 }}>
                  Quá Hạn Cần Làm Gấp
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#cf1322" }}>
                  {kpiStats.overdue}
                </div>
                <div style={{ fontSize: 12, color: "#ff4d4f", marginTop: 4 }}>
                  {filterStatus === "overdue" ? "● Đang lọc quá hạn" : "Bấm để lọc danh sách"}
                </div>
              </div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#fff1f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  color: "#ff4d4f",
                }}
              >
                ⚠️
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 3: Sắp đến hạn */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => setFilterStatus(filterStatus === "warning" ? undefined : "warning")}
            style={{
              borderRadius: 12,
              border: filterStatus === "warning" ? "2px solid #faad14" : "1px solid #e8e8e8",
              boxShadow: filterStatus === "warning"
                ? "0 4px 16px rgba(250, 173, 20, 0.2)"
                : "0 2px 8px rgba(0,0,0,0.04)",
              background: "linear-gradient(135deg, #ffffff 0%, #fffdf5 100%)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#d48806", fontWeight: 600, marginBottom: 4 }}>
                  Sắp Đến Hạn (≤ 5 ngày)
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#d46b08" }}>
                  {kpiStats.warning}
                </div>
                <div style={{ fontSize: 12, color: "#faad14", marginTop: 4 }}>
                  {filterStatus === "warning" ? "● Đang lọc sắp đến hạn" : "Bấm để lọc danh sách"}
                </div>
              </div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#fffbe6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  color: "#faad14",
                }}
              >
                ⏱️
              </div>
            </div>
          </Card>
        </Col>

        {/* Card 4: Đang theo dõi ổn định */}
        <Col xs={24} sm={12} lg={6}>
          <Card
            hoverable
            onClick={() => setFilterStatus(filterStatus === "active" ? undefined : "active")}
            style={{
              borderRadius: 12,
              border: filterStatus === "active" ? "2px solid #52c41a" : "1px solid #e8e8e8",
              boxShadow: filterStatus === "active"
                ? "0 4px 16px rgba(82, 196, 26, 0.2)"
                : "0 2px 8px rgba(0,0,0,0.04)",
              background: "linear-gradient(135deg, #ffffff 0%, #f7fff4 100%)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            styles={{ body: { padding: "16px 20px" } }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13, color: "#389e0d", fontWeight: 600, marginBottom: 4 }}>
                  Đang Theo Dõi Ổn Định
                </div>
                <div style={{ fontSize: 28, fontWeight: 700, color: "#237804" }}>
                  {kpiStats.normal}
                </div>
                <div style={{ fontSize: 12, color: "#52c41a", marginTop: 4 }}>
                  {filterStatus === "active" ? "● Đang lọc ổn định" : "Bấm để lọc danh sách"}
                </div>
              </div>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "#f6ffed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  color: "#52c41a",
                }}
              >
                🛡️
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Filter Bar (Bộ lọc thông minh) */}
      <Card
        styles={{ body: { padding: "18px 20px" } }}
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
          background: "#ffffff",
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={7}>
            <Input
              placeholder="🔍 Tìm theo tên xe, biển số, số khung..."
              prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="middle"
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Cấp bảo dưỡng"
              style={{ width: "100%" }}
              value={filterLevel}
              allowClear
              size="middle"
              onChange={setFilterLevel}
            >
              <Option value="Tuần">Tuần</Option>
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
              value={filterStatus}
              allowClear
              size="middle"
              onChange={setFilterStatus}
            >
              <Option value="overdue">🔴 Quá hạn</Option>
              <Option value="warning">🟠 Sắp đến hạn</Option>
              <Option value="active">🔵 Đang theo dõi</Option>
            </Select>
          </Col>
          <Col xs={16} md={5}>
            <RangePicker
              style={{ width: "100%", borderRadius: 8 }}
              size="middle"
              format="DD/MM/YYYY"
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
            />
          </Col>
          <Col xs={8} md={4} style={{ textAlign: "right" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8 }}>
              {(searchText || filterLevel || filterStatus || dateRange) && (
                <Button size="small" onClick={handleResetFilters} style={{ borderRadius: 6, fontSize: 12 }}>
                  Xóa lọc
                </Button>
              )}
              <div
                style={{
                  background: "#f1f5f9",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#475569",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <FilterOutlined style={{ color: "#1677ff" }} />
                <span>{filteredData.length} xe</span>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* BẢNG DỮ LIỆU */}
      <MaintenanceTable
        loading={loading}
        dataSource={filteredData}
        onCreateTicket={handlePerformMaintenance}
        onEdit={handleEditPlan}
        onRefresh={fetchData}
      />

      {/* Modal Lập phiếu / Thực hiện bảo dưỡng */}
      <Modal
        title={
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                boxShadow: "0 2px 8px rgba(22, 119, 255, 0.3)",
              }}
            >
              <ToolFilled />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
                {initialData ? "Thực Hiện Bảo Dưỡng Định Kỳ" : "Lập Phiếu Bảo Dưỡng Mới"}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
                {initialData
                  ? "Ghi nhận kết quả bảo dưỡng và tự động chuyển sang chu kỳ kế tiếp"
                  : "Khởi tạo phiếu bảo dưỡng mới cho phương tiện thiết bị"}
              </div>
            </div>
          </div>
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
