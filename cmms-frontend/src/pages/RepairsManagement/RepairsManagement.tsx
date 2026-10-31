import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  FileSearchOutlined,
  ToolOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  BarChartOutlined,
  BellOutlined,
  ClearOutlined,
  CheckSquareOutlined,
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
  BulkRepairInspectionPayload,
  BulkRepairAcceptancePayload,
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
    submitBulkInspectionStep,
    submitBulkAcceptanceStep,
    requestStockOutForRepair,
    exportRepairItem,
    deleteRepairItem,
    reload,
  } = useRepairsContext();

  const { user } = useAuthContext();
  const role = user?.role ?? "";
  const perms = user?.permissions ?? [];
  const { devices } = useDevicesContext();

  // Map device_id -> Tên loại/nhóm thiết bị từ danh mục thiết bị
  const deviceGroupMap = useMemo(() => {
    const map = new Map<number, string>();
    devices.forEach((d: any) => {
      const typeName = d.deviceType?.name || d.device_type?.name || d.device_group?.name;
      if (typeName) {
        map.set(d.device_id, typeName.trim());
      }
    });
    return map;
  }, [devices]);

  // Hàm xác định nhóm xe chuẩn xác cho từng phiếu sửa chữa
  const getRepairGroupName = useCallback((r: IRepair): string => {
    if (!r.device) return "Khác";
    // 1. Kiểm tra deviceType trực tiếp từ r.device
    const directType = (r.device as any)?.deviceType?.name || (r.device as any)?.device_type?.name || (r.device as any)?.device_group?.name;
    if (directType) return directType.trim();

    // 2. Tra cứu từ danh mục devices context
    if (r.device.device_id && deviceGroupMap.has(r.device.device_id)) {
      return deviceGroupMap.get(r.device.device_id)!;
    }

    // 3. Phân loại tự động theo tên dòng xe sân bay
    const name = (r.device.name || "").trim();
    if (name.includes("Xe chở khách") || name.toLowerCase().includes("yutong") || name.toLowerCase().includes("samco")) return "Xe chở khách";
    if (name.includes("Xe đầu kéo") || name.toLowerCase().includes("toyota")) return "Xe đầu kéo";
    if (name.includes("Xe cấp điện") || name.toLowerCase().includes("guinault") || name.toLowerCase().includes("gpu")) return "Xe cấp điện";
    if (name.includes("Cần đẩy máy bay") || name.toLowerCase().includes("j-tow")) return "Cần đẩy máy bay";
    if (name.includes("Băng chuyền") || name.toLowerCase().includes("băng tải")) return "Băng chuyền hành lý";
    if (name.includes("Mooc") || name.toLowerCase().includes("dolly")) return "Mooc chở hàng hóa (Dolly)";
    if (name.includes("Xe nâng") || name.toLowerCase().includes("forklift")) return "Xe nâng hàng";
    if (name.includes("Xe thang") || name.toLowerCase().includes("step")) return "Xe thang hành khách";
    if (name.includes("Xe vệ sinh") || name.toLowerCase().includes("lavatory")) return "Xe dịch vụ vệ sinh";
    if (name.includes("Xe nước") || name.toLowerCase().includes("water")) return "Xe cấp nước sạch";

    const words = name.split(/[\s-]+/);
    if (words.length >= 2) return `${words[0]} ${words[1]}`;
    return words[0] || "Khác";
  }, [deviceGroupMap]);

  // Danh mục các nhóm xe duy nhất và số lượng phiếu tương ứng
  const availableVehicleGroups = useMemo(() => {
    const groupCounts = new Map<string, number>();

    repairs.forEach((r) => {
      const group = getRepairGroupName(r);
      groupCounts.set(group, (groupCounts.get(group) || 0) + 1);
    });

    return Array.from(groupCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [repairs, getRepairGroupName]);

  // Bộ lọc và tìm kiếm
  const [searchText, setSearchText] = useState("");
  const [filterGroup, setFilterGroup] = useState<string | undefined>(undefined);
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
      // 1. Lọc theo nhóm xe
      if (filterGroup) {
        const itemGroup = getRepairGroupName(r);
        if (itemGroup !== filterGroup) {
          return false;
        }
      }

      // 2. Lọc theo từ khóa tìm kiếm (Tên xe, biển số, mã phiếu, người lập, nội dung hỏng)
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const idMatch = `#${r.repair_id}`.toLowerCase().includes(q) || String(r.repair_id).includes(q);
        const nameMatch = (r.device?.name || "").toLowerCase().includes(q);
        const regMatch = (r.device?.reg_number || "").toLowerCase().includes(q);
        const serialMatch = (r.device?.serial_number || "").toLowerCase().includes(q);
        const brandMatch = (r.device?.brand || "").toLowerCase().includes(q);
        const creatorMatch = (r.created_by?.name || "").toLowerCase().includes(q);
        const deptMatch = (r.created_department?.name || r.created_by?.department?.name || "").toLowerCase().includes(q);
        const defectMatch = (r.description_defect || "").toLowerCase().includes(q);

        if (!idMatch && !nameMatch && !regMatch && !serialMatch && !brandMatch && !creatorMatch && !deptMatch && !defectMatch) {
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
  }, [repairs, filterGroup, filterStatus, searchText, getRepairGroupName]);

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

  // Bulk actions state
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [bulkRepairsForAction, setBulkRepairsForAction] = useState<IRepair[]>([]);

  const selectedRepairs = useMemo(() => {
    return repairs.filter((r) => selectedRowKeys.includes(r.repair_id));
  }, [repairs, selectedRowKeys]);

  const canBulkInspection = useMemo(() => {
    if (selectedRepairs.length < 1) return false;
    return selectedRepairs.every(
      (r) =>
        !r.canceled &&
        r.status_request === "COMPLETED" &&
        r.status_inspection !== "inspection_admin_approved"
    );
  }, [selectedRepairs]);

  const canBulkAcceptance = useMemo(() => {
    if (selectedRepairs.length < 1) return false;
    return selectedRepairs.every(
      (r) =>
        !r.canceled &&
        r.status_inspection === "inspection_admin_approved" &&
        r.status_acceptance !== "acceptance_admin_approved"
    );
  }, [selectedRepairs]);

  const handleOpenBulkInspection = () => {
    if (selectedRepairs.length === 0) return;
    setBulkRepairsForAction(selectedRepairs);
    setSelectedRepair(selectedRepairs[0]);
    setOpenInspection(true);
  };

  const handleOpenBulkAcceptance = () => {
    if (selectedRepairs.length === 0) return;
    setBulkRepairsForAction(selectedRepairs);
    setSelectedRepair(selectedRepairs[0]);
    setOpenAcceptance(true);
  };

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
      if (bulkRepairsForAction && bulkRepairsForAction.length > 1) {
        const bulkPayload: BulkRepairInspectionPayload = {
          repair_ids: bulkRepairsForAction.map((r) => r.repair_id),
          ...payload,
        };
        await submitBulkInspectionStep(bulkPayload);
        message.success(`Đã cập nhật kiểm nghiệm cho ${bulkRepairsForAction.length} phiếu thành công!`);
        setSelectedRowKeys([]);
        setBulkRepairsForAction([]);
      } else {
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
      }
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
      if (bulkRepairsForAction && bulkRepairsForAction.length > 1) {
        const bulkPayload: BulkRepairAcceptancePayload = {
          repair_ids: bulkRepairsForAction.map((r) => r.repair_id),
          ...payload,
        };
        await submitBulkAcceptanceStep(bulkPayload);
        message.success(`Đã cập nhật nghiệm thu cho ${bulkRepairsForAction.length} phiếu thành công!`);
        setSelectedRowKeys([]);
        setBulkRepairsForAction([]);
      } else {
        await submitAcceptanceStep(selectedRepair.repair_id, payload);
        message.success("Đã cập nhật nghiệm thu");
      }
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
            <div
              onClick={() => setFilterStatus(undefined)}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                background:
                  filterStatus === undefined
                    ? "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)"
                    : "#ffffff",
                border:
                  filterStatus === undefined
                    ? "2px solid #2563eb"
                    : "1px solid #e2e8f0",
                boxShadow:
                  filterStatus === undefined
                    ? "0 8px 20px rgba(37, 99, 235, 0.15)"
                    : "0 2px 6px rgba(0,0,0,0.02)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 22,
                  boxShadow: "0 4px 10px rgba(30, 41, 59, 0.25)",
                  flexShrink: 0,
                }}
              >
                <FileTextOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#64748b",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Tất cả phiếu
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#0f172a",
                    marginTop: 2,
                  }}
                >
                  {stats.total}
                </div>
              </div>
              {filterStatus === undefined && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "0 28px 28px 0",
                    borderColor: "transparent #2563eb transparent transparent",
                  }}
                />
              )}
            </div>
          </Col>

          <Col xl={5} md={8} xs={12}>
            <div
              onClick={() => setFilterStatus("PHASE_REQUEST")}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                background:
                  filterStatus === "PHASE_REQUEST"
                    ? "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)"
                    : "#ffffff",
                border:
                  filterStatus === "PHASE_REQUEST"
                    ? "2px solid #d97706"
                    : "1px solid #e2e8f0",
                boxShadow:
                  filterStatus === "PHASE_REQUEST"
                    ? "0 8px 20px rgba(217, 119, 6, 0.15)"
                    : "0 2px 6px rgba(0,0,0,0.02)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 22,
                  boxShadow: "0 4px 10px rgba(217, 119, 6, 0.25)",
                  flexShrink: 0,
                }}
              >
                <ToolOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#d97706",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Yêu cầu sửa chữa
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#b45309",
                    marginTop: 2,
                  }}
                >
                  {stats.requests}
                </div>
              </div>
              {filterStatus === "PHASE_REQUEST" && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "0 28px 28px 0",
                    borderColor: "transparent #d97706 transparent transparent",
                  }}
                />
              )}
            </div>
          </Col>

          <Col xl={5} md={8} xs={12}>
            <div
              onClick={() => setFilterStatus("PHASE_INSPECTION")}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                background:
                  filterStatus === "PHASE_INSPECTION"
                    ? "linear-gradient(135deg, #f5f3ff 0%, #ffffff 100%)"
                    : "#ffffff",
                border:
                  filterStatus === "PHASE_INSPECTION"
                    ? "2px solid #7c3aed"
                    : "1px solid #e2e8f0",
                boxShadow:
                  filterStatus === "PHASE_INSPECTION"
                    ? "0 8px 20px rgba(124, 58, 237, 0.15)"
                    : "0 2px 6px rgba(0,0,0,0.02)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 22,
                  boxShadow: "0 4px 10px rgba(124, 58, 237, 0.25)",
                  flexShrink: 0,
                }}
              >
                <FileSearchOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#7c3aed",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Đang kiểm nghiệm
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#6d28d9",
                    marginTop: 2,
                  }}
                >
                  {stats.inspections}
                </div>
              </div>
              {filterStatus === "PHASE_INSPECTION" && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "0 28px 28px 0",
                    borderColor: "transparent #7c3aed transparent transparent",
                  }}
                />
              )}
            </div>
          </Col>

          <Col xl={5} md={8} xs={12}>
            <div
              onClick={() => setFilterStatus("PHASE_ACCEPTANCE")}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                background:
                  filterStatus === "PHASE_ACCEPTANCE"
                    ? "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)"
                    : "#ffffff",
                border:
                  filterStatus === "PHASE_ACCEPTANCE"
                    ? "2px solid #059669"
                    : "1px solid #e2e8f0",
                boxShadow:
                  filterStatus === "PHASE_ACCEPTANCE"
                    ? "0 8px 20px rgba(5, 150, 105, 0.15)"
                    : "0 2px 6px rgba(0,0,0,0.02)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 22,
                  boxShadow: "0 4px 10px rgba(5, 150, 105, 0.25)",
                  flexShrink: 0,
                }}
              >
                <CheckCircleOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#059669",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Đang nghiệm thu
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#047857",
                    marginTop: 2,
                  }}
                >
                  {stats.acceptances}
                </div>
              </div>
              {filterStatus === "PHASE_ACCEPTANCE" && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "0 28px 28px 0",
                    borderColor: "transparent #059669 transparent transparent",
                  }}
                />
              )}
            </div>
          </Col>

          <Col xl={4} md={8} xs={12}>
            <div
              onClick={() => setFilterStatus("CANCELED")}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                background:
                  filterStatus === "CANCELED"
                    ? "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)"
                    : "#ffffff",
                border:
                  filterStatus === "CANCELED"
                    ? "2px solid #dc2626"
                    : "1px solid #e2e8f0",
                boxShadow:
                  filterStatus === "CANCELED"
                    ? "0 8px 20px rgba(220, 38, 38, 0.15)"
                    : "0 2px 6px rgba(0,0,0,0.02)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 22,
                  boxShadow: "0 4px 10px rgba(220, 38, 38, 0.25)",
                  flexShrink: 0,
                }}
              >
                <CloseCircleOutlined />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: "#dc2626",
                    fontSize: 12,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Đã hủy / Từ chối
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: "#b91c1c",
                    marginTop: 2,
                  }}
                >
                  {stats.cancelled}
                </div>
              </div>
              {filterStatus === "CANCELED" && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: 0,
                    height: 0,
                    borderStyle: "solid",
                    borderWidth: "0 28px 28px 0",
                    borderColor: "transparent #dc2626 transparent transparent",
                  }}
                />
              )}
            </div>
          </Col>
        </Row>

        {/* Toolbar: Tìm kiếm, Bộ lọc & Nút hành động */}
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
          styles={{ body: { padding: "16px 24px" } }}
        >
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
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
                    boxShadow: "0 2px 8px rgba(22, 119, 255, 0.25)",
                  }}
                >
                  <ToolOutlined />
                </div>
                <div>
                  <Title
                    level={4}
                    style={{
                      margin: 0,
                      fontSize: 18,
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    Quản lý sửa chữa
                  </Title>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Theo dõi quy trình lập phiếu, kiểm nghiệm B04 và nghiệm thu B05
                  </div>
                </div>

                {(filterGroup || filterStatus || searchText) && (
                  <Space size="small" style={{ marginLeft: 8 }}>
                    <Tag
                      color="processing"
                      style={{ fontSize: 12, borderRadius: 6, fontWeight: 600 }}
                    >
                      Hiển thị <b>{filteredRepairs.length}</b>/{repairs.length} phiếu
                    </Tag>
                    <Button
                      size="small"
                      type="link"
                      icon={<ClearOutlined />}
                      onClick={() => {
                        setFilterGroup(undefined);
                        setFilterStatus(undefined);
                        setSearchText("");
                      }}
                      style={{ padding: "0 4px", fontSize: 12 }}
                    >
                      Xóa lọc
                    </Button>
                  </Space>
                )}
              </div>
            </Col>

            <Col>
              <Space wrap size="middle">
                {/* 1. Thanh tìm kiếm */}
                <Input
                  placeholder="Tìm tên xe, biển số, mã #..."
                  allowClear
                  prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                  style={{ width: 260, borderRadius: 8 }}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />

                {/* 2. Lọc theo nhóm xe */}
                <Select
                  placeholder="Chọn nhóm xe..."
                  allowClear
                  showSearch
                  optionFilterProp="children"
                  style={{ width: 230, borderRadius: 8 }}
                  value={filterGroup}
                  onChange={(val) => setFilterGroup(val)}
                  popupMatchSelectWidth={false}
                >
                  {availableVehicleGroups.map((g) => (
                    <Option key={g.name} value={g.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span style={{ fontWeight: 500 }}>{g.name}</span>
                        <Tag
                          color="blue"
                          style={{
                            borderRadius: 10,
                            margin: 0,
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "0 6px",
                          }}
                        >
                          {g.count}
                        </Tag>
                      </div>
                    </Option>
                  ))}
                </Select>

                {/* 3. Lọc theo trạng thái & giai đoạn */}
                <Select
                  placeholder="Tất cả trạng thái"
                  allowClear
                  style={{ width: 190, borderRadius: 8 }}
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
                    <Option value="WAITING_TEAM_LEAD">
                      Yêu cầu: Chờ Tổ trưởng duyệt
                    </Option>
                    <Option value="WAITING_MANAGER">Yêu cầu: Chờ CB Đội duyệt</Option>
                    <Option value="WAITING_DIRECTOR">
                      Yêu cầu: Chờ Ban GĐ duyệt
                    </Option>
                    <Option value="inspection_pending">
                      Kiểm nghiệm: Chờ lập/Tổ duyệt
                    </Option>
                    <Option value="inspection_lead_approved">
                      Kiểm nghiệm: Chờ Đội duyệt
                    </Option>
                    <Option value="inspection_manager_approved">
                      Kiểm nghiệm: Chờ Ban GĐ duyệt
                    </Option>
                    <Option value="acceptance_pending">
                      Nghiệm thu: Chờ lập/Tổ duyệt
                    </Option>
                    <Option value="acceptance_lead_approved">
                      Nghiệm thu: Chờ Đội duyệt
                    </Option>
                    <Option value="acceptance_manager_approved">
                      Nghiệm thu: Chờ Ban GĐ duyệt
                    </Option>
                  </Select.OptGroup>
                </Select>

                {/* 4. Nút mở Đánh giá hỏng hóc */}
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => setOpenAnalysisModal(true)}
                  style={{
                    color: "#d97706",
                    borderColor: "#fde68a",
                    background: "#fffbeb",
                    fontWeight: 600,
                    borderRadius: 8,
                  }}
                >
                  Đánh giá hỏng hóc
                </Button>

                {/* 5. Nút mở Phiếu cần duyệt của tài khoản */}
                {myPendingCount > 0 && (
                  <Badge count={myPendingCount} overflowCount={99}>
                    <Button
                      type="primary"
                      danger
                      icon={<BellOutlined />}
                      onClick={() => setOpenPendingModal(true)}
                      style={{
                        fontWeight: 600,
                        borderRadius: 8,
                        boxShadow: "0 2px 8px rgba(239, 68, 68, 0.3)",
                      }}
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
                    style={{
                      fontWeight: 600,
                      borderRadius: 8,
                      background:
                        "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                      border: "none",
                      boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
                    }}
                  >
                    Lập phiếu
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* Bảng danh sách phiếu (Dùng filteredRepairs) */}
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          }}
          styles={{ body: { padding: 0 } }}
        >
          {selectedRowKeys.length > 0 && (
            <div
              style={{
                padding: "12px 16px",
                background: "#f0f7ff",
                borderBottom: "1px solid #bae0ff",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <Space wrap align="center">
                <CheckCircleOutlined style={{ color: "#1677ff", fontSize: 16 }} />
                <Typography.Text strong>
                  Đã chọn <span style={{ color: "#0958d9" }}>{selectedRowKeys.length}</span> phiếu:
                </Typography.Text>
                {selectedRepairs.slice(0, 4).map((r) => (
                  <Tag key={r.repair_id} color="blue">
                    #{r.repair_id} {r.device?.name}
                  </Tag>
                ))}
                {selectedRepairs.length > 4 && (
                  <Tag color="default">+{selectedRepairs.length - 4} xe khác</Tag>
                )}
              </Space>

              <Space wrap>
                <Button
                  type="primary"
                  icon={<ToolOutlined />}
                  disabled={!canBulkInspection}
                  onClick={handleOpenBulkInspection}
                >
                  Lập B04 hàng loạt ({selectedRowKeys.length} xe)
                </Button>
                <Button
                  type="primary"
                  style={{
                    background: canBulkAcceptance ? "#52c41a" : undefined,
                    borderColor: canBulkAcceptance ? "#52c41a" : undefined,
                  }}
                  icon={<CheckSquareOutlined />}
                  disabled={!canBulkAcceptance}
                  onClick={handleOpenBulkAcceptance}
                >
                  Lập B05 hàng loạt ({selectedRowKeys.length} xe)
                </Button>
                <Button onClick={() => setSelectedRowKeys([])}>Bỏ chọn</Button>
              </Space>
            </div>
          )}

          <Spin spinning={loading}>
            <RepairsTable
              rows={filteredRepairs}
              rowsPerPage={10}
              page={1}
              selectedRowKeys={selectedRowKeys}
              onSelectChange={setSelectedRowKeys}
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
                setBulkRepairsForAction([]);
                setOpenInspection(true);
              }}
              onOpenAcceptance={(r) => {
                setSelectedRepair(r);
                setBulkRepairsForAction([]);
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
          const found = repairs.find((r) => r.device?.device_id === deviceId);
          const term = found?.device?.reg_number || found?.device?.name || "";
          setSearchText(term);
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
            setBulkRepairsForAction([]);
          }}
          onSubmit={handleInspection}
          loading={saving}
          initialData={selectedRepair}
          bulkRepairs={bulkRepairsForAction}
        />
      )}

      {selectedRepair && openAcceptance && (
        <RepairAcceptanceForm
          open={openAcceptance}
          onClose={() => {
            setOpenAcceptance(false);
            setSelectedRepair(null);
            setBulkRepairsForAction([]);
          }}
          onSubmit={handleAcceptance}
          loading={saving}
          initialData={selectedRepair}
          bulkRepairs={bulkRepairsForAction}
        />
      )}
    </div>
  );
};

export default RepairsManagement;
