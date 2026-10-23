import React, { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import {
  Button,
  Select,
  Typography,
  Space,
  Row,
  Col,
  message,
  Card,
  Spin,
  notification,
  Input,
  Badge,
  Tag,
} from "antd";
import {
  PlusOutlined,
  FileTextOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  BarChartOutlined,
  BellOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import { useRepairsContext } from "../../context/RepairsContext/RepairsContext";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import RepairForm from "./components/RepairForm";
import RepairsTable from "./components/RepairsTable";
import RepairDetailDrawer from "./components/RepairDetailDrawer";
import RepairInspectionForm from "./components/RepairInspectionForm";
import RepairAcceptanceForm from "./components/RepairAcceptanceForm";
import PendingApprovalsModal from "./components/PendingApprovalsModal";
import BreakdownAnalysisModal from "./components/BreakdownAnalysisModal";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import {
  IRepair,
  RepairUpsertPayload,
  BulkRepairUpsertPayload,
  RepairInspectionPayload,
  RepairAcceptancePayload,
} from "../../types/repairs.types";

const { Title } = Typography;
const { Option } = Select;

const RepairsManagement: React.FC = () => {
  const {
    repairs,
    loading,
    createRepairItem,
    createBulkRepairItem,
    updateRepairItem,
    reviewRepairItem,
    submitInspectionStep,
    submitAcceptanceStep,
    requestStockOutForRepair,
    exportRepairItem,
    deleteRepairItem,
    reload,
  } = useRepairsContext();

  const { user } = useAuthContext();
  const role = user?.role ?? "";
  const perms = user?.permissions ?? [];
  const { devices } = useDevicesContext();

  // Danh mục thiết bị: lấy toàn bộ thiết bị đang có trong hệ thống lẫn các thiết bị đã phát sinh phiếu
  const availableDevices = useMemo(() => {
    const map = new Map<number, any>();
    devices.forEach((d: any) => map.set(d.device_id, d));
    repairs.forEach((r: any) => {
      if (r.device && !map.has(r.device.device_id)) {
        map.set(r.device.device_id, r.device);
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [devices, repairs]);

  // Bộ lọc và tìm kiếm
  const [searchText, setSearchText] = useState("");
  const [filterDevice, setFilterDevice] = useState<number | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);

  // State các Modal
  const [openPendingModal, setOpenPendingModal] = useState(false);
  const [openAnalysisModal, setOpenAnalysisModal] = useState(false);

  // Tính số lượng phiếu chờ chính tài khoản này duyệt theo cấp
  const myPendingCount = useMemo(() => {
    if (!user) return 0;
    const userRole = user.role;
    return repairs.filter((r) => {
      if (r.canceled) return false;
      if (userRole === "ADMIN") {
        const isReq =
          r.status_request !== "COMPLETED" &&
          r.status_request !== "REJECTED" &&
          r.status_request !== "REJECTED_B03";
        const isInsp =
          r.status_request === "COMPLETED" &&
          r.status_inspection !== "inspection_admin_approved" &&
          r.status_inspection !== "inspection_rejected" &&
          r.status_inspection !== "REJECTED_B04";
        const isAcc =
          r.status_inspection === "inspection_admin_approved" &&
          r.status_acceptance !== "acceptance_admin_approved" &&
          r.status_acceptance !== "acceptance_rejected" &&
          r.status_acceptance !== "REJECTED_B05";
        return isReq || isInsp || isAcc;
      }
      if (userRole === "TEAM_LEAD") {
        return (
          r.status_request === "WAITING_TEAM_LEAD" ||
          (r.status_inspection === "inspection_pending" && Boolean(r.inspection_created_at)) ||
          (r.status_acceptance === "acceptance_pending" && Boolean(r.acceptance_created_at))
        );
      }
      if (userRole === "UNIT_HEAD") {
        return (
          r.status_request === "WAITING_MANAGER" ||
          r.status_inspection === "inspection_lead_approved" ||
          r.status_acceptance === "acceptance_lead_approved"
        );
      }
      if (userRole === "DIRECTOR") {
        return (
          r.status_request === "WAITING_DIRECTOR" ||
          r.status_inspection === "inspection_manager_approved" ||
          r.status_acceptance === "acceptance_manager_approved"
        );
      }
      if (userRole === "TECHNICIAN") {
        return (
          r.status_request === "WAITING_TECH" ||
          (r.status_request === "REJECTED_B03" && r.created_by?.user_id === user.user_id) ||
          r.status_inspection === "REJECTED_B04" ||
          r.status_acceptance === "REJECTED_B05"
        );
      }
      return false;
    }).length;
  }, [repairs, user]);

  // Tự động mở Popup duyệt theo cấp khi đăng nhập (chỉ hiện 1 lần / phiên)
  useEffect(() => {
    if (!user?.user_id) return;
    const sessionKey = `cmms_pending_modal_shown_${user.user_id}`;
    const hasShown = sessionStorage.getItem(sessionKey);
    if (!hasShown && myPendingCount > 0) {
      setOpenPendingModal(true);
      sessionStorage.setItem(sessionKey, "true");
    }
  }, [user, myPendingCount]);

  // Danh sách phiếu sau khi lọc theo thiết bị, tìm kiếm và trạng thái
  const filteredRepairs = useMemo(() => {
    return repairs.filter((r: IRepair) => {
      // 1. Lọc theo thiết bị
      if (filterDevice && r.device?.device_id !== filterDevice) {
        return false;
      }

      // 2. Lọc theo từ khóa tìm kiếm (Tên xe, biển số, mã phiếu, người lập, nội dung hỏng)
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const idMatch = `#${r.repair_id}`.toLowerCase().includes(q) || String(r.repair_id).includes(q);
        const nameMatch = (r.device?.name || "").toLowerCase().includes(q);
        const regMatch = (r.device?.reg_number || "").toLowerCase().includes(q);
        const serialMatch = (r.device?.serial_number || "").toLowerCase().includes(q);
        const creatorMatch = (r.created_by?.name || "").toLowerCase().includes(q);
        const deptMatch = (r.created_department?.name || r.created_by?.department?.name || "").toLowerCase().includes(q);
        const defectMatch = (r.description_defect || "").toLowerCase().includes(q);

        if (!idMatch && !nameMatch && !regMatch && !serialMatch && !creatorMatch && !deptMatch && !defectMatch) {
          return false;
        }
      }

      // 3. Lọc theo trạng thái / giai đoạn
      if (filterStatus) {
        // Canceled & Rejected
        if (filterStatus === "CANCELED") return Boolean(r.canceled);
        if (filterStatus === "REJECTED") {
          return (
            r.status_request === "REJECTED" ||
            r.status_request === "REJECTED_B03" ||
            r.status_inspection === "REJECTED_B04" ||
            r.status_inspection === "inspection_rejected" ||
            r.status_acceptance === "REJECTED_B05" ||
            r.status_acceptance === "acceptance_rejected"
          );
        }
        if (filterStatus === "COMPLETED") {
          return r.status_acceptance === "acceptance_admin_approved";
        }

        // Nhóm theo Giai đoạn lớn
        if (filterStatus === "PHASE_REQUEST") {
          return (
            r.status_request !== "COMPLETED" &&
            !r.canceled &&
            r.status_request !== "REJECTED" &&
            r.status_request !== "REJECTED_B03"
          );
        }
        if (filterStatus === "PHASE_INSPECTION") {
          return (
            r.status_request === "COMPLETED" &&
            r.status_inspection !== "inspection_admin_approved" &&
            !r.canceled &&
            r.status_inspection !== "inspection_rejected" &&
            r.status_inspection !== "REJECTED_B04"
          );
        }
        if (filterStatus === "PHASE_ACCEPTANCE") {
          return (
            r.status_inspection === "inspection_admin_approved" &&
            r.status_acceptance !== "acceptance_admin_approved" &&
            !r.canceled &&
            r.status_acceptance !== "acceptance_rejected" &&
            r.status_acceptance !== "REJECTED_B05"
          );
        }

        // Từng trạng thái cụ thể
        if (filterStatus === "WAITING_TECH") return r.status_request === "WAITING_TECH" && !r.canceled;
        if (filterStatus === "WAITING_TEAM_LEAD") return r.status_request === "WAITING_TEAM_LEAD" && !r.canceled;
        if (filterStatus === "WAITING_MANAGER") return r.status_request === "WAITING_MANAGER" && !r.canceled;
        if (filterStatus === "WAITING_DIRECTOR") return r.status_request === "WAITING_DIRECTOR" && !r.canceled;

        if (filterStatus === "inspection_pending") {
          return (
            r.status_request === "COMPLETED" &&
            (r.status_inspection === "inspection_pending" || !r.status_inspection) &&
            !r.canceled
          );
        }
        if (filterStatus === "inspection_lead_approved") return r.status_inspection === "inspection_lead_approved" && !r.canceled;
        if (filterStatus === "inspection_manager_approved") return r.status_inspection === "inspection_manager_approved" && !r.canceled;

        if (filterStatus === "acceptance_pending") {
          return (
            r.status_inspection === "inspection_admin_approved" &&
            (r.status_acceptance === "acceptance_pending" || !r.status_acceptance) &&
            !r.canceled
          );
        }
        if (filterStatus === "acceptance_lead_approved") return r.status_acceptance === "acceptance_lead_approved" && !r.canceled;
        if (filterStatus === "acceptance_manager_approved") return r.status_acceptance === "acceptance_manager_approved" && !r.canceled;
      }

      return true;
    });
  }, [repairs, filterDevice, filterStatus, searchText]);

  // Real-time updates via WebSocket
  useEffect(() => {
    if (!user) return; // Wait for user to be loaded

    const baseUrl = process.env.REACT_APP_BASE_URL || "http://localhost:3000/api";
    const socketUrl = baseUrl.replace('/api', ''); // Remove /api suffix for socket connection

    const socket = io(socketUrl, {
        transports: ['websocket'],
        autoConnect: false,
        query: { userId: user.user_id }, // Pass userId for tracking
    });
    
    const timer = setTimeout(() => {
      socket.connect();
    }, 500);

    socket.on("connect", () => {
      // console.log("Connected to WebSocket");
    });

    socket.on("repair_updated", () => {
      reload();
    });

    // Listen for specific notifications
    socket.on("notification", (data: any) => {
        notification.info({
            message: "Thông báo mới",
            title: "Thông báo mới", // Fix TS error (Required in custom types?)
            description: data.message,
            duration: 10, // Hide after 10 seconds
            placement: 'topRight',
        });
    });

    return () => {
      clearTimeout(timer);
      socket.off("connect");
      socket.off("repair_updated");
      socket.off("notification");
      socket.disconnect();
    };
  }, [reload, user]);

  // Strict Role Check: Only Admin, Technician, Operator can create (Unit Head/Director only approve)
  const canCreate = role === "ADMIN" || role === "TECHNICIAN" || role === "OPERATOR";
  // Assuming strict RBAC logic for button visibility is handled here or in children.

  const [openForm, setOpenForm] = useState(false);
  const [openInspection, setOpenInspection] = useState(false);
  const [openAcceptance, setOpenAcceptance] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<IRepair | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync selectedRepair with latest data from repairs list
  useEffect(() => {
    // BLOCK UPDATE if any form is open (User is editing)
    if (openForm || openInspection || openAcceptance) return;

    if (selectedRepair) {
      const updated = repairs.find(r => r.repair_id === selectedRepair.repair_id);
      if (updated && updated !== selectedRepair) {
        setSelectedRepair(updated);
      }
    }
  }, [repairs, selectedRepair, openForm, openInspection, openAcceptance]);

  // Stats Calculation
  const stats = useMemo(() => {
    const total = repairs.length;
    const requests = repairs.filter((r: IRepair) => r.status_request !== 'COMPLETED' && r.status_request !== 'REJECTED' && !r.canceled).length;
    const inspections = repairs.filter((r: IRepair) => r.status_request === 'COMPLETED' && r.status_inspection !== 'inspection_admin_approved' && !r.canceled).length;
    const acceptances = repairs.filter((r: IRepair) => r.status_inspection === 'inspection_admin_approved' && r.status_acceptance !== 'acceptance_admin_approved' && !r.canceled).length;
    const cancelled = repairs.filter((r: IRepair) => r.canceled).length;
    return { total, requests, inspections, acceptances, cancelled };
  }, [repairs]);

  const handleSubmit = async (data: any) => {
    try {
      setSaving(true);
      if (selectedRepair) {
        // Updating always uses single RepairUpsertPayload
        await updateRepairItem(selectedRepair.repair_id, data as RepairUpsertPayload);
        notification.success({
            message: "Cập nhật thành công",
            title: "Cập nhật thành công",
            description: "Thông tin phiếu sửa chữa đã được cập nhật."
        });
      } else {
        // Creating can be bulk or single
        // AntD Select mode="multiple" assigns an array to the name="device_id" field.
        if (Array.isArray(data.device_id)) {
            // Bulk
            const bulkData: BulkRepairUpsertPayload = {
               device_ids: data.device_id,
               location_issue: data.location_issue,
               recommendation: data.recommendation,
               note: data.note,
            };
            await createBulkRepairItem(bulkData);
        } else {
            // Single fallback just in case
            await createRepairItem(data as RepairUpsertPayload);
        }
        
        const nextApprover = (role === 'TECHNICIAN' || role === 'OPERATOR') ? 'Đội trưởng / Quản lý' : 'Ban Giám đốc';
        notification.success({
            message: "Tạo phiếu thành công",
            title: "Tạo phiếu thành công",
            description: `Đã gửi thông báo cho ${nextApprover} duyệt.`
        });
      }
      setOpenForm(false);
      setSelectedRepair(null);
    } catch (e) {
      notification.error({
        message: "Thao tác thất bại",
        title: "Thao tác thất bại",
        description: e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (
    id: number,
    action: "approve" | "reject",
    reason?: string,
    phase: "request" | "inspection" | "acceptance" = "request"
  ) => {
    try {
      setSaving(true);
      await reviewRepairItem(id, { action, reason, phase });
      message.success(action === 'approve' ? "Đã duyệt phiếu thành công" : "Đã từ chối phiếu");
      setSelectedRepair(null); // Close Drawer/Modal
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Thao tác thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleInspection = async (payload: RepairInspectionPayload) => {
    if (!selectedRepair) return;
    try {
      setSaving(true);
      if (payload.inspection_materials?.length) {
        for (const m of payload.inspection_materials) {
          if (m.item_id) {
            await requestStockOutForRepair({
              item_id: m.item_id,
              quantity: m.quantity,
              purpose: "Sửa chữa",
              repair_id: selectedRepair.repair_id,
            });
          }
        }
      }
      await submitInspectionStep(selectedRepair.repair_id, payload);
      message.success("Đã cập nhật kiểm nghiệm");
      setOpenInspection(false);
      setSelectedRepair(null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Kiểm nghiệm thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptance = async (payload: RepairAcceptancePayload) => {
    if (!selectedRepair) return;
    try {
      setSaving(true);
      await submitAcceptanceStep(selectedRepair.repair_id, payload);
      message.success("Đã cập nhật nghiệm thu");
      setOpenAcceptance(false);
      setSelectedRepair(null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Nghiệm thu thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handlePrev = () => {
    if (!selectedRepair) return;
    const currentIndex = repairs.findIndex((r: IRepair) => r.repair_id === selectedRepair.repair_id);
    if (currentIndex > 0) {
        setSelectedRepair(repairs[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (!selectedRepair) return;
    const currentIndex = repairs.findIndex((r: IRepair) => r.repair_id === selectedRepair.repair_id);
    if (currentIndex !== -1 && currentIndex < repairs.length - 1) {
        setSelectedRepair(repairs[currentIndex + 1]);
    }
  };

  const hasPrev = selectedRepair ? repairs.findIndex((r: IRepair) => r.repair_id === selectedRepair.repair_id) > 0 : false;
  const hasNext = selectedRepair ? repairs.findIndex((r: IRepair) => r.repair_id === selectedRepair.repair_id) < repairs.length - 1 : false;

  const handleExport = async (id: number, type: "request" | "inspection" | "acceptance" | "B03" | "B04" | "B05" | "COMBINED", options?: { hideNames?: boolean }) => {
    const key = "export_loading"; 
    try {
      message.loading({ content: "Đang tạo file...", key });
      await exportRepairItem(id, type, options);
      message.success({ content: "Đã mở xem trước", key, duration: 2 });
    } catch {
      message.error({ content: "Xuất file thất bại", key, duration: 2 });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRepairItem(id);
      message.success("Đã xóa phiếu");
    } catch {
      message.error("Xóa phiếu thất bại");
    }
  };

  return (
    <div style={{ padding: 24, minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        
        {/* Stats Bar (Có thể bấm vào thẻ để lọc nhanh theo giai đoạn) */}
        <Row gutter={[16, 16]}>
          <Col xl={5} md={8} xs={12}>
            <Card
              variant="borderless"
              hoverable
              onClick={() => setFilterStatus(undefined)}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                border: filterStatus === undefined ? "2px solid #1890ff" : "1px solid #f0f0f0",
                transition: "all 0.2s",
              }}
              styles={{ body: { padding: 20, display: "flex", alignItems: "center", gap: 16 } }}
            >
              <div style={{ padding: 12, borderRadius: "50%", background: "#fafafa" }}>
                <FileTextOutlined style={{ fontSize: 24, color: "#595959" }} />
              </div>
              <div>
                <div style={{ color: "#8c8c8c", fontSize: 13 }}>Tổng phiếu</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.total}</div>
              </div>
            </Card>
          </Col>
          <Col xl={5} md={8} xs={12}>
            <Card
              variant="borderless"
              hoverable
              onClick={() => setFilterStatus("PHASE_REQUEST")}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                border: filterStatus === "PHASE_REQUEST" ? "2px solid #faad14" : "1px solid #f0f0f0",
                transition: "all 0.2s",
              }}
              styles={{ body: { padding: 20, display: "flex", alignItems: "center", gap: 16 } }}
            >
              <div style={{ padding: 12, borderRadius: "50%", background: "#fff7e6" }}>
                <ToolOutlined style={{ fontSize: 24, color: "#faad14" }} />
              </div>
              <div>
                <div style={{ color: "#8c8c8c", fontSize: 13 }}>Yêu cầu sửa chữa</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#faad14" }}>{stats.requests}</div>
              </div>
            </Card>
          </Col>
          <Col xl={5} md={8} xs={12}>
            <Card
              variant="borderless"
              hoverable
              onClick={() => setFilterStatus("PHASE_INSPECTION")}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                border: filterStatus === "PHASE_INSPECTION" ? "2px solid #1890ff" : "1px solid #f0f0f0",
                transition: "all 0.2s",
              }}
              styles={{ body: { padding: 20, display: "flex", alignItems: "center", gap: 16 } }}
            >
              <div style={{ padding: 12, borderRadius: "50%", background: "#e6f7ff" }}>
                <CheckCircleOutlined style={{ fontSize: 24, color: "#1890ff" }} />
              </div>
              <div>
                <div style={{ color: "#8c8c8c", fontSize: 13 }}>Đang kiểm nghiệm</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#1890ff" }}>{stats.inspections}</div>
              </div>
            </Card>
          </Col>
          <Col xl={5} md={8} xs={12}>
            <Card
              variant="borderless"
              hoverable
              onClick={() => setFilterStatus("PHASE_ACCEPTANCE")}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                border: filterStatus === "PHASE_ACCEPTANCE" ? "2px solid #52c41a" : "1px solid #f0f0f0",
                transition: "all 0.2s",
              }}
              styles={{ body: { padding: 20, display: "flex", alignItems: "center", gap: 16 } }}
            >
              <div style={{ padding: 12, borderRadius: "50%", background: "#f6ffed" }}>
                <CheckCircleOutlined style={{ fontSize: 24, color: "#52c41a" }} />
              </div>
              <div>
                <div style={{ color: "#8c8c8c", fontSize: 13 }}>Đang nghiệm thu</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#52c41a" }}>{stats.acceptances}</div>
              </div>
            </Card>
          </Col>
          <Col xl={4} md={8} xs={12}>
            <Card
              variant="borderless"
              hoverable
              onClick={() => setFilterStatus("CANCELED")}
              style={{
                cursor: "pointer",
                borderRadius: 8,
                border: filterStatus === "CANCELED" ? "2px solid #cf1322" : "1px solid #f0f0f0",
                transition: "all 0.2s",
              }}
              styles={{ body: { padding: 20, display: "flex", alignItems: "center", gap: 16 } }}
            >
              <div style={{ padding: 12, borderRadius: "50%", background: "#fff1f0" }}>
                <CloseCircleOutlined style={{ fontSize: 24, color: "#cf1322" }} />
              </div>
              <div>
                <div style={{ color: "#8c8c8c", fontSize: 13 }}>Đã hủy / Từ chối</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: "#cf1322" }}>{stats.cancelled}</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Toolbar: Tìm kiếm, Bộ lọc & Nút hành động */}
        <Card variant="borderless" styles={{ body: { padding: "16px 24px" } }}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Title level={4} style={{ margin: 0 }}>
                  Quản lý sửa chữa
                </Title>
                {(filterDevice || filterStatus || searchText) && (
                  <Space size="small">
                    <Tag color="processing" style={{ fontSize: 12 }}>
                      Hiển thị <b>{filteredRepairs.length}</b>/{repairs.length} phiếu
                    </Tag>
                    <Button
                      size="small"
                      type="link"
                      icon={<ClearOutlined />}
                      onClick={() => {
                        setFilterDevice(undefined);
                        setFilterStatus(undefined);
                        setSearchText("");
                      }}
                    >
                      Xóa lọc
                    </Button>
                  </Space>
                )}
              </div>
            </Col>

            <Col>
              <Space wrap size="middle">
                {/* 1. Thanh tìm kiếm thiết bị / mã phiếu / người lập */}
                <Input
                  placeholder="Tìm theo tên xe, biển số, mã #, người lập..."
                  allowClear
                  prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
                  style={{ width: 250 }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />

                {/* 2. Lọc theo thiết bị */}
                <Select
                  placeholder="Lọc thiết bị"
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  style={{ width: 210 }}
                  value={filterDevice}
                  onChange={(val) => setFilterDevice(val)}
                >
                  {availableDevices.map((d: any) => (
                    <Option key={d.device_id} value={d.device_id}>
                      {d.name} {d.reg_number ? `(${d.reg_number})` : d.serial_number ? `(${d.serial_number})` : ""}
                    </Option>
                  ))}
                </Select>

                {/* 3. Lọc theo trạng thái & giai đoạn */}
                <Select
                  placeholder="Trạng thái"
                  allowClear
                  style={{ width: 180 }}
                  value={filterStatus}
                  onChange={(val) => setFilterStatus(val)}
                >
                  <Select.OptGroup label="Giai đoạn quy trình">
                    <Option value="PHASE_REQUEST">1. Yêu cầu sửa chữa</Option>
                    <Option value="PHASE_INSPECTION">2. Đang kiểm nghiệm</Option>
                    <Option value="PHASE_ACCEPTANCE">3. Đang nghiệm thu</Option>
                    <Option value="COMPLETED">4. Hoàn tất toàn bộ</Option>
                    <Option value="CANCELED">Đã hủy</Option>
                    <Option value="REJECTED">Đã từ chối</Option>
                  </Select.OptGroup>
                  <Select.OptGroup label="Chi tiết cấp duyệt">
                    <Option value="WAITING_TECH">Yêu cầu: Chờ KT tiếp nhận</Option>
                    <Option value="WAITING_TEAM_LEAD">Yêu cầu: Chờ Tổ trưởng duyệt</Option>
                    <Option value="WAITING_MANAGER">Yêu cầu: Chờ CB Đội duyệt</Option>
                    <Option value="WAITING_DIRECTOR">Yêu cầu: Chờ Ban GĐ duyệt</Option>
                    <Option value="inspection_pending">Kiểm nghiệm: Chờ lập/Tổ duyệt</Option>
                    <Option value="inspection_lead_approved">Kiểm nghiệm: Chờ Đội duyệt</Option>
                    <Option value="inspection_manager_approved">Kiểm nghiệm: Chờ Ban GĐ duyệt</Option>
                    <Option value="acceptance_pending">Nghiệm thu: Chờ lập/Tổ duyệt</Option>
                    <Option value="acceptance_lead_approved">Nghiệm thu: Chờ Đội duyệt</Option>
                    <Option value="acceptance_manager_approved">Nghiệm thu: Chờ Ban GĐ duyệt</Option>
                  </Select.OptGroup>
                </Select>

                {/* 4. Nút mở Đánh giá hỏng hóc */}
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => setOpenAnalysisModal(true)}
                  style={{ color: "#fa8c16", borderColor: "#fa8c16", fontWeight: 500 }}
                >
                  Đánh giá hỏng hóc
                </Button>

                {/* 5. Nút mở Phiếu cần duyệt của tài khoản (có Badge số lượng) */}
                {myPendingCount > 0 && (
                  <Badge count={myPendingCount} overflowCount={99}>
                    <Button
                      type="primary"
                      danger
                      icon={<BellOutlined />}
                      onClick={() => setOpenPendingModal(true)}
                      style={{ fontWeight: 500 }}
                    >
                      Cần duyệt ({myPendingCount})
                    </Button>
                  </Badge>
                )}

                {/* 6. Nút Lập phiếu */}
                {canCreate && (
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setSelectedRepair(null);
                      setOpenForm(true);
                    }}
                    style={{ fontWeight: 600 }}
                  >
                    Lập phiếu
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Bảng danh sách phiếu (Dùng filteredRepairs) */}
        <Card variant="borderless" styles={{ body: { padding: 0 } }}>
          <Spin spinning={loading}>
            <RepairsTable
              rows={filteredRepairs}
              rowsPerPage={10}
              page={1}
              onReview={handleReview}
              onDelete={handleDelete}
              onEdit={(r) => {
                setSelectedRepair(r);
                setOpenForm(true);
              }}
              onView={(r) => {
                setSelectedRepair(r);
              }}
              onOpenInspection={(r) => {
                setSelectedRepair(r);
                setOpenInspection(true);
              }}
              onOpenAcceptance={(r) => {
                setSelectedRepair(r);
                setOpenAcceptance(true);
              }}
              onExport={(r, t, opts) => handleExport(r.repair_id, t, opts)}
              canReview={perms.includes("APPROVE_REPAIR") || role === "ADMIN"}
              canDelete={perms.includes("DELETE_REPAIR") || role === "ADMIN"}
              canUpdate={perms.includes("UPDATE_REPAIR") || role === "ADMIN"}
              canExport={perms.includes("EXPORT_REPAIR") || role === "ADMIN"}
              userRole={role}
              currentUser={user}
              hasPermission={(code) => perms.includes(code)}
            />
          </Spin>
        </Card>
      </Space>

      {/* Modal Popup Phiếu cần duyệt theo Role */}
      <PendingApprovalsModal
        open={openPendingModal}
        onClose={() => setOpenPendingModal(false)}
        user={user}
        repairs={repairs}
        onReviewRepair={(r) => {
          setSelectedRepair(r);
        }}
      />

      {/* Modal Đánh giá & Tổng hợp hỏng hóc thiết bị */}
      <BreakdownAnalysisModal
        open={openAnalysisModal}
        onClose={() => setOpenAnalysisModal(false)}
        repairs={repairs}
        onFilterByDevice={(deviceId) => {
          setFilterDevice(deviceId);
        }}
      />

      <RepairForm
        open={openForm}
        onClose={() => {
          setOpenForm(false);
          setSelectedRepair(null);
        }}
        onSubmit={handleSubmit}
        loading={saving}
        initialData={selectedRepair}
      />

      {selectedRepair && (
        <RepairDetailDrawer
          open={Boolean(selectedRepair) && !openForm && !openInspection && !openAcceptance}
          data={selectedRepair}
          onClose={() => setSelectedRepair(null)}
          onExport={(type) => selectedRepair && handleExport(selectedRepair.repair_id, type)}
          canExport={role === "ADMIN" || perms.includes("EXPORT_REPAIR")}
          onPrev={handlePrev}
          onNext={handleNext}
          hasPrev={hasPrev}
          hasNext={hasNext}
          onEdit={() => setOpenForm(true)}
          onEditInspection={() => setOpenInspection(true)}
          onEditAcceptance={() => setOpenAcceptance(true)}
          currentUser={user}
          onReview={(action, reason, phase) => {
            if (selectedRepair) handleReview(selectedRepair.repair_id, action, reason, phase || "request");
          }}
        />
      )}

      {selectedRepair && openInspection && (
        <RepairInspectionForm
          open={openInspection}
          onClose={() => {
            setOpenInspection(false);
            setSelectedRepair(null);
          }}
          onSubmit={handleInspection}
          loading={saving}
          initialData={selectedRepair}
        />
      )}

      {selectedRepair && openAcceptance && (
        <RepairAcceptanceForm
          open={openAcceptance}
          onClose={() => {
            setOpenAcceptance(false);
            setSelectedRepair(null);
          }}
          onSubmit={handleAcceptance}
          loading={saving}
          initialData={selectedRepair}
        />
      )}
    </div>
  );
};

export default RepairsManagement;
