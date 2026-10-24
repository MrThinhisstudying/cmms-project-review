import React, { useEffect, useState } from "react";
import {
  Layout,
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Space,
  notification,
  Typography,
  Tooltip,
  Tag,
  Divider,
} from "antd";
import { IDevice, DeviceGroup } from "../../types/devicesManagement.types";
import DevicesTable from "./components/DevicesTable";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  CarOutlined,
  ToolOutlined,
  WarningOutlined,
  SearchOutlined,
  CameraOutlined,
  PrinterOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  FilterOutlined,
  ReloadOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import {
  uploadDevices,
  deleteDevice,
  updateDevice,
  createDevice,
  getDeviceById,
} from "../../apis/devices";
import { exportDevicesToExcel } from "../../utils";
import DeviceForm from "./components/DeviceForm";
import { getToken } from "../../utils/auth";
import DeviceDetailDrawer from "./components/DeviceDetailDrawer";
import DeviceQRModal from "./components/DeviceQRModal";
import BatchQRPrintModal from "./components/BatchQRPrintModal";
import BatchLicenseModal from "./components/BatchLicenseModal";
import QRScannerModal from "./components/QRScannerModal";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { getAllDeviceGroups } from "../../apis/deviceGroups";
import { getAllDeviceTypes, IDeviceType } from "../../apis/device-types";

const { Option } = Select;
const { Title, Text } = Typography;

const DevicesManagement: React.FC = () => {
  const { devices, loading, fetchDevices, report, fetchReport } = useDevicesContext();
  const { user } = useAuthContext();

  // Local Filter State
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterGroup, setFilterGroup] = useState<number | undefined>(undefined);
  const [filterDeviceType, setFilterDeviceType] = useState<number | undefined>(undefined);

  // UI State
  const [openForm, setOpenForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IDevice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<IDevice | null>(null);
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);
  const [deviceTypesList, setDeviceTypesList] = useState<IDeviceType[]>([]);

  // QR Code & Scanner State
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrDevice, setQrDevice] = useState<IDevice | null>(null);
  const [batchPrintOpen, setBatchPrintOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Batch License & Inspection State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [batchLicenseOpen, setBatchLicenseOpen] = useState(false);

  const userRole = user?.role;
  const userPermissions = user?.permissions || [];

  const canEdit =
    userRole === "ADMIN" ||
    userRole === "admin" ||
    userPermissions.includes("ADD_DEVICE") ||
    userPermissions.includes("UPDATE_DEVICE");

  const canDelete =
    userRole === "ADMIN" ||
    userRole === "admin" ||
    userPermissions.includes("DELETE_DEVICE");

  // Fetch initial data
  useEffect(() => {
    fetchDevices({
      name: searchText,
      status: filterStatus,
      groupId: filterGroup,
      deviceTypeId: filterDeviceType,
    });
    fetchReport();

    const fetchData = async () => {
      try {
        const token = getToken();
        const [groups, types] = await Promise.all([
          getAllDeviceGroups(token),
          getAllDeviceTypes(token),
        ]);
        setDeviceGroups(Array.isArray(groups) ? groups : []);
        setDeviceTypesList(Array.isArray(types) ? types : []);
      } catch (e) {
        console.error("Failed to fetch filter data", e);
      }
    };
    fetchData();
  }, [filterStatus, filterGroup, filterDeviceType, fetchDevices, fetchReport, searchText]);

  const handleSearch = () => {
    fetchDevices({
      name: searchText,
      status: filterStatus,
      groupId: filterGroup,
      deviceTypeId: filterDeviceType,
    });
  };

  const handleResetFilters = () => {
    setSearchText("");
    setFilterStatus(undefined);
    setFilterGroup(undefined);
    setFilterDeviceType(undefined);
    fetchDevices({ name: "", status: undefined, groupId: undefined, deviceTypeId: undefined });
  };

  const handleAdd = () => {
    setSelectedDevice(null);
    setOpenForm(true);
  };

  const handleEdit = (device: IDevice) => {
    setSelectedDevice(device);
    setOpenForm(true);
  };

  const handleView = (device: IDevice) => {
    setDetailDevice(device);
    setDetailOpen(true);
  };

  const handleShowQR = (device: IDevice) => {
    setQrDevice(device);
    setQrModalOpen(true);
  };

  const handleScanned = async (decodedText: string, deviceId?: number) => {
    try {
      let targetDevice: IDevice | undefined;
      if (deviceId) {
        targetDevice = devices.find((d) => d.device_id === deviceId);
        if (!targetDevice) {
          const token = getToken();
          targetDevice = await getDeviceById(deviceId, token);
        }
      } else {
        const clean = decodedText.trim().toLowerCase();
        targetDevice = devices.find(
          (d) =>
            d.reg_number?.toLowerCase() === clean ||
            d.device_code?.toLowerCase() === clean ||
            d.name?.toLowerCase().includes(clean)
        );
      }

      if (targetDevice) {
        notification.success({
          message: "Đã nhận diện phương tiện",
          title: "Thành công",
          description: `${targetDevice.name} (${
            targetDevice.reg_number || targetDevice.device_code || targetDevice.device_id
          })`,
        });
        setDetailDevice(targetDevice);
        setDetailOpen(true);
      } else {
        notification.warning({
          message: "Không tìm thấy thiết bị tương ứng",
          title: "Kết quả quét",
          description: `Mã đã quét: "${decodedText}". Không có trong hệ thống.`,
        });
      }
    } catch (e: any) {
      notification.error({
        message: "Lỗi tra cứu phương tiện",
        title: "Lỗi",
        description: e?.message,
      });
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      const token = getToken();
      await deleteDevice(id, token);
      notification.success({ message: "Xoá thành công", title: "Thành công" });
      fetchDevices({
        name: searchText,
        status: filterStatus,
        groupId: filterGroup,
        deviceTypeId: filterDeviceType,
      });
    } catch (error: any) {
      console.error(error);
      notification.error({
        message: "Xoá thất bại",
        title: "Lỗi",
        description: error?.message,
      });
    }
  };

  const handleFormSubmit = async (data: Partial<IDevice>) => {
    const token = getToken();
    try {
      if (selectedDevice?.device_id) {
        await updateDevice(selectedDevice.device_id, token, data);
        notification.success({ message: "Cập nhật thành công", title: "Thành công" });
      } else {
        await createDevice(token, data);
        notification.success({ message: "Thêm mới thành công", title: "Thành công" });
      }
      setOpenForm(false);
      fetchDevices({
        name: searchText,
        status: filterStatus,
        groupId: filterGroup,
        deviceTypeId: filterDeviceType,
      });
    } catch (error: any) {
      throw error;
    }
  };

  const handleExportExcel = () => {
    exportDevicesToExcel(devices);
  };

  const handleUpload = async (file: File) => {
    const token = getToken();
    try {
      const res = await uploadDevices(token, file);
      const { imported, skipped } = res.data || {};

      if (skipped && skipped > 0) {
        notification.warning({
          message: "Hoàn tất có cảnh báo",
          title: "Cảnh báo",
          description: `Đã nhập ${imported} thiết bị. Bỏ qua ${skipped} thiết bị do trùng lặp (Tên + Biển số/Số hiệu).`,
          duration: 5,
        });
      } else {
        notification.success({
          message: "Nhập dữ liệu thành công",
          title: "Thành công",
          description: `Đã nhập thành công ${imported} thiết bị.`,
        });
      }
      fetchDevices({
        name: searchText,
        status: filterStatus,
        groupId: filterGroup,
        deviceTypeId: filterDeviceType,
      });
    } catch (error: any) {
      notification.error({
        message: "Lỗi nhập dữ liệu",
        title: "Thất bại",
        description: error.message || "Đã có lỗi xảy ra khi xử lý file.",
      });
    }
  };

  // KPI card click handler
  const handleKpiClick = (statusKey?: string) => {
    if (filterStatus === statusKey) {
      setFilterStatus(undefined); // Toggle off
    } else {
      setFilterStatus(statusKey);
    }
  };

  const isFilterActive = Boolean(searchText || filterStatus || filterGroup || filterDeviceType);

  return (
    <Layout style={{ padding: "20px 24px", background: "#f4f6f9", minHeight: "100vh" }}>
      {/* 1. Header Banner */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
          padding: "20px 24px",
          background: "linear-gradient(135deg, #ffffff 0%, #fbfcfe 100%)",
          borderRadius: 14,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 280 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
              color: "#fff",
              fontSize: 24,
            }}
          >
            <CarOutlined />
          </div>
          <div>
            <Title level={4} style={{ margin: 0, fontWeight: 700, color: "#0f172a", fontSize: 18 }}>
              Quản Lý Trang Thiết Bị & Phương Tiện (TTB_PT)
            </Title>
            <div style={{ color: "#64748b", fontSize: "13px", marginTop: 2 }}>
              Hồ sơ số lý lịch, biển số xe, tình trạng kỹ thuật, thời hạn đăng kiểm và chu kỳ bảo dưỡng
            </div>
          </div>
        </div>

        <Space wrap size={10} style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Tooltip title="Tải lại danh sách">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                fetchDevices({
                  name: searchText,
                  status: filterStatus,
                  groupId: filterGroup,
                  deviceTypeId: filterDeviceType,
                });
                fetchReport();
              }}
              loading={loading}
              style={{ borderRadius: 8 }}
            />
          </Tooltip>

          <Button
            icon={<CameraOutlined />}
            style={{ borderRadius: 8, borderColor: "#1677ff", color: "#1677ff", fontWeight: 500 }}
            onClick={() => setScannerOpen(true)}
          >
            Quét QR Camera
          </Button>

          <Button
            icon={<PrinterOutlined />}
            onClick={() => setBatchPrintOpen(true)}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            In tem QR
          </Button>

          {canEdit && (
            <Button
              icon={<SafetyCertificateOutlined />}
              style={{
                borderRadius: 8,
                background: "#f6ffed",
                borderColor: "#52c41a",
                color: "#237804",
                fontWeight: 600,
              }}
              onClick={() => setBatchLicenseOpen(true)}
            >
              {selectedRowKeys.length > 0
                ? `Cập nhật Đăng kiểm (${selectedRowKeys.length})`
                : "Cập nhật Đăng kiểm / Giấy phép"}
            </Button>
          )}

          {canEdit && (
            <>
              <Button
                icon={<UploadOutlined />}
                onClick={() => document.getElementById("upload-excel")?.click()}
                style={{ borderRadius: 8, fontWeight: 500 }}
              >
                Nhập Excel
              </Button>
              <input
                id="upload-excel"
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={(e) => e.target.files && handleUpload(e.target.files[0])}
              />
            </>
          )}

          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            style={{ borderRadius: 8, fontWeight: 500 }}
          >
            Xuất Excel
          </Button>

          {canEdit && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
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
              Thêm Thiết Bị Mới
            </Button>
          )}
        </Space>
      </div>

      {/* 2. Interactive KPI Stats Bar */}
      <Row gutter={[14, 14]} style={{ marginBottom: 20 }}>
        {/* KPI 1: Tổng thiết bị */}
        <Col xs={12} sm={8} lg={4}>
          <div
            onClick={() => handleKpiClick(undefined)}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "14px 16px",
              border: filterStatus === undefined && !searchText ? "2px solid #1677ff" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === undefined && !searchText
                  ? "0 4px 16px rgba(22, 119, 255, 0.18)"
                  : "0 2px 8px rgba(0,0,0,0.03)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>TỔNG PHƯƠNG TIỆN</span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "#e6f4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#1677ff",
                }}
              >
                <CarOutlined style={{ fontSize: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0f172a", marginTop: 4 }}>
              {report?.total || 0}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Tất cả phương tiện</div>
          </div>
        </Col>

        {/* KPI 2: Mới (Chờ bàn giao) */}
        <Col xs={12} sm={8} lg={4}>
          <div
            onClick={() => handleKpiClick("MOI")}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "14px 16px",
              border: filterStatus === "MOI" ? "2px solid #1677ff" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "MOI"
                  ? "0 4px 16px rgba(22, 119, 255, 0.18)"
                  : "0 2px 8px rgba(0,0,0,0.03)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>SẴN SÀNG (MỚI)</span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "#e6f4ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0958d9",
                }}
              >
                <CarOutlined style={{ fontSize: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#0958d9", marginTop: 4 }}>
              {report?.MOI || 0}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Mới / Sẵn sàng bàn giao</div>
          </div>
        </Col>

        {/* KPI 3: Đang sử dụng (Tốt) */}
        <Col xs={12} sm={8} lg={4}>
          <div
            onClick={() => handleKpiClick("DANG_SU_DUNG")}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "14px 16px",
              border: filterStatus === "DANG_SU_DUNG" ? "2px solid #52c41a" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "DANG_SU_DUNG"
                  ? "0 4px 16px rgba(82, 196, 26, 0.2)"
                  : "0 2px 8px rgba(0,0,0,0.03)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>ĐANG HOẠT ĐỘNG</span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "#f6ffed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#52c41a",
                }}
              >
                <CheckCircleOutlined style={{ fontSize: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#237804", marginTop: 4 }}>
              {report?.DANG_SU_DUNG || 0}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Vận hành bình thường</div>
          </div>
        </Col>

        {/* KPI 4: Đang sửa chữa */}
        <Col xs={12} sm={8} lg={4}>
          <div
            onClick={() => handleKpiClick("DANG_SUA_CHUA")}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "14px 16px",
              border: filterStatus === "DANG_SUA_CHUA" ? "2px solid #ff4d4f" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "DANG_SUA_CHUA"
                  ? "0 4px 16px rgba(255, 77, 79, 0.2)"
                  : "0 2px 8px rgba(0,0,0,0.03)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>ĐANG SỬA CHỮA</span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "#fff1f0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#cf1322",
                }}
              >
                <ToolOutlined style={{ fontSize: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#cf1322", marginTop: 4 }}>
              {report?.DANG_SUA_CHUA || 0}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Cần sửa chữa / bảo dưỡng</div>
          </div>
        </Col>

        {/* KPI 5: Sử dụng hạn chế */}
        <Col xs={12} sm={8} lg={4}>
          <div
            onClick={() => handleKpiClick("SU_DUNG_HAN_CHE")}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "14px 16px",
              border: filterStatus === "SU_DUNG_HAN_CHE" ? "2px solid #faad14" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "SU_DUNG_HAN_CHE"
                  ? "0 4px 16px rgba(250, 173, 20, 0.2)"
                  : "0 2px 8px rgba(0,0,0,0.03)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>SỬ DỤNG HẠN CHẾ</span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "#fffbe6",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d46b08",
                }}
              >
                <WarningOutlined style={{ fontSize: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#d46b08", marginTop: 4 }}>
              {report?.SU_DUNG_HAN_CHE || 0}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Theo dõi đặc biệt</div>
          </div>
        </Col>

        {/* KPI 6: Thanh lý / Hủy */}
        <Col xs={12} sm={8} lg={4}>
          <div
            onClick={() => handleKpiClick("THANH_LY")}
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: "14px 16px",
              border: filterStatus === "THANH_LY" ? "2px solid #94a3b8" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "THANH_LY"
                  ? "0 4px 16px rgba(148, 163, 184, 0.2)"
                  : "0 2px 8px rgba(0,0,0,0.03)",
              cursor: "pointer",
              transition: "all 0.25s ease",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>THANH LÝ / HỦY</span>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: "#f1f5f9",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748b",
                }}
              >
                <DeleteOutlined style={{ fontSize: 16 }} />
              </div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#475569", marginTop: 4 }}>
              {(report?.THANH_LY || 0) + (report?.HUY_BO || 0)}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Đã dừng khai thác</div>
          </div>
        </Col>
      </Row>

      {/* 3. Search & Filter Bar */}
      <Card
        style={{
          marginBottom: 16,
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
        }}
        styles={{ body: { padding: "16px 20px" } }}
      >
        <Row justify="space-between" align="middle" gutter={[14, 14]}>
          <Col xs={24} lg={18}>
            <Space wrap style={{ width: "100%" }} size={10}>
              <Input
                placeholder="Tìm tên xe, biển số, mã TTB..."
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                style={{ width: 250, borderRadius: 8 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onPressEnter={handleSearch}
                allowClear
              />

              <Select
                placeholder="Tất cả trạng thái"
                allowClear
                style={{ width: 180 }}
                value={filterStatus}
                onChange={(val) => setFilterStatus(val)}
              >
                <Option value="MOI">Mới</Option>
                <Option value="DANG_SU_DUNG">Đang sử dụng</Option>
                <Option value="SU_DUNG_HAN_CHE">Sử dụng hạn chế</Option>
                <Option value="DANG_SUA_CHUA">Đang sửa chữa</Option>
                <Option value="THANH_LY">Thanh lý</Option>
              </Select>

              <Select
                placeholder="Tất cả Đội / Nhóm"
                allowClear
                style={{ width: 190 }}
                value={filterGroup}
                onChange={(val) => setFilterGroup(val)}
                showSearch
                optionFilterProp="children"
              >
                {deviceGroups.map((g) => (
                  <Option key={g.id} value={g.id}>
                    {g.name}
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Tất cả loại xe"
                allowClear
                style={{ width: 190 }}
                value={filterDeviceType}
                onChange={(val) => setFilterDeviceType(val)}
                showSearch
                optionFilterProp="children"
              >
                {deviceTypesList.map((t) => (
                  <Option key={t.id} value={t.id}>
                    {t.name}
                  </Option>
                ))}
              </Select>

              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                  border: "none",
                }}
              >
                Lọc
              </Button>

              {isFilterActive && (
                <Button onClick={handleResetFilters} style={{ borderRadius: 8 }}>
                  Xóa lọc
                </Button>
              )}
            </Space>
          </Col>

          <Col xs={24} lg={6} style={{ textAlign: "right" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "#f1f5f9",
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                color: "#475569",
              }}
            >
              <FilterOutlined style={{ color: "#1677ff" }} />
              <span>Hiển thị: <b>{devices.length}</b> phương tiện</span>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Floating / Docked Selected Banner */}
      {selectedRowKeys.length > 0 && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 18px",
            background: "#f0f7ff",
            border: "1px solid #91caff",
            borderRadius: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(22, 119, 255, 0.1)",
          }}
        >
          <Space>
            <Tag color="blue" style={{ fontSize: 13, padding: "2px 8px", fontWeight: 700 }}>
              Đã chọn: {selectedRowKeys.length} thiết bị
            </Tag>
            <span style={{ fontSize: 13, color: "#002766" }}>
              Áp dụng thao tác đồng loạt cho các thiết bị đã chọn:
            </span>
          </Space>

          <Space>
            {canEdit && (
              <Button
                type="primary"
                size="small"
                icon={<SafetyCertificateOutlined />}
                style={{
                  borderRadius: 6,
                  background: "#52c41a",
                  borderColor: "#52c41a",
                  fontWeight: 600,
                }}
                onClick={() => setBatchLicenseOpen(true)}
              >
                Cập nhật Đăng kiểm ({selectedRowKeys.length})
              </Button>
            )}
            <Button
              size="small"
              icon={<PrinterOutlined />}
              onClick={() => setBatchPrintOpen(true)}
              style={{ borderRadius: 6 }}
            >
              In tem QR ({selectedRowKeys.length})
            </Button>
            <Button
              size="small"
              onClick={() => setSelectedRowKeys([])}
              style={{ borderRadius: 6 }}
            >
              Bỏ chọn tất cả
            </Button>
          </Space>
        </div>
      )}

      {/* 4. Table */}
      <Card
        styles={{ body: { padding: 0 } }}
        style={{
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 4px 16px rgba(0,0,0,0.03)",
          overflow: "hidden",
        }}
      >
        <DevicesTable
          dataSource={devices}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
          onShowQR={handleShowQR}
          canEdit={canEdit}
          canDelete={canDelete}
          selectedRowKeys={selectedRowKeys}
          onSelectChange={(keys) => setSelectedRowKeys(keys)}
        />
      </Card>

      {/* 5. Modals & Drawers */}
      <DeviceForm
        open={openForm}
        initialData={selectedDevice}
        onClose={() => setOpenForm(false)}
        onSubmit={handleFormSubmit}
        loading={loading}
      />

      <DeviceDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        device={detailDevice}
      />

      <DeviceQRModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        device={qrDevice}
      />

      <BatchQRPrintModal
        open={batchPrintOpen}
        onClose={() => setBatchPrintOpen(false)}
        devices={
          selectedRowKeys.length > 0
            ? devices.filter((d) => selectedRowKeys.includes(d.device_id))
            : devices
        }
      />

      <BatchLicenseModal
        open={batchLicenseOpen}
        onClose={() => setBatchLicenseOpen(false)}
        devices={devices}
        selectedDeviceIds={selectedRowKeys.map((k) => Number(k))}
        onSuccess={() => {
          fetchDevices({
            name: searchText,
            status: filterStatus,
            groupId: filterGroup,
            deviceTypeId: filterDeviceType,
          });
          fetchReport();
          setSelectedRowKeys([]);
        }}
      />

      <QRScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />
    </Layout>
  );
};

export default DevicesManagement;
