import React, { useEffect, useMemo, useState, useRef } from "react";
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
  notification
} from "antd";
import { PlusOutlined, FileTextOutlined, ToolOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import { useRepairsContext } from "../../context/RepairsContext/RepairsContext";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import RepairForm from "./components/RepairForm";
import RepairsTable from "./components/RepairsTable";
import RepairDetailDrawer from "./components/RepairDetailDrawer";
import RepairInspectionForm from "./components/RepairInspectionForm";
import RepairAcceptanceForm from "./components/RepairAcceptanceForm";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import {
  IRepair,
  RepairUpsertPayload,
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

  const availableDevices = useMemo(
    () =>
      devices.filter(
        (d: any) =>
          (d.status || "").toLowerCase() === "moi" ||
          (d.status || "").toLowerCase() === "dang_su_dung"
      ),
    [devices]
  );

  const [filterDevice, setFilterDevice] = useState<number | undefined>(undefined);
  const [filterStatusRequest, setFilterStatusRequest] = useState<string | undefined>(undefined);

  // Use refs to access latest filters in socket callback without triggering re-connection
  const filterRefs = useRef({ filterDevice, filterStatusRequest });
  useEffect(() => {
    filterRefs.current = { filterDevice, filterStatusRequest };
  }, [filterDevice, filterStatusRequest]);

  useEffect(() => {
    reload({
      device_id: filterDevice,
      status_request: filterStatusRequest,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDevice, filterStatusRequest]);

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
      // console.log("WebSocket [repair_updated] triggered reload at", new Date().toLocaleTimeString());
      const { filterDevice: fd, filterStatusRequest: fsr } = filterRefs.current;
      reload({
        device_id: fd,
        status_request: fsr,
      });
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

  const handleSubmit = async (data: RepairUpsertPayload) => {
    try {
      setSaving(true);
      if (selectedRepair) {
        await updateRepairItem(selectedRepair.repair_id, data);
        notification.success({
            message: "Cập nhật thành công",
            title: "Cập nhật thành công",
            description: "Thông tin phiếu sửa chữa đã được cập nhật."
        });
      } else {
        await createRepairItem(data);
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
        
        {/* Stats Bar */}
        <Row gutter={[16, 16]}>
            <Col xl={5} md={8} xs={12}>
                <Card variant="borderless" styles={{ body: { padding: 20, display: 'flex', alignItems: 'center', gap: 16 } }}>
                    <div style={{ padding: 12, borderRadius: '50%', background: '#fafafa' }}>
                         <FileTextOutlined style={{ fontSize: 24, color: '#595959' }} />
                    </div>
                    <div>
                        <div style={{ color: '#8c8c8c', fontSize: 13 }}>Tổng phiếu</div>
                        <div style={{ fontSize: 24, fontWeight: 600 }}>{stats.total}</div>
                    </div>
                </Card>
            </Col>
            <Col xl={5} md={8} xs={12}>
                <Card variant="borderless" styles={{ body: { padding: 20, display: 'flex', alignItems: 'center', gap: 16 } }}>
                    <div style={{ padding: 12, borderRadius: '50%', background: '#fff7e6' }}>
                         <ToolOutlined style={{ fontSize: 24, color: '#faad14' }} />
                    </div>
                    <div>
                        <div style={{ color: '#8c8c8c', fontSize: 13 }}>Yêu cầu sửa chữa</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#faad14' }}>{stats.requests}</div>
                    </div>
                </Card>
            </Col>
            <Col xl={5} md={8} xs={12}>
                <Card variant="borderless" styles={{ body: { padding: 20, display: 'flex', alignItems: 'center', gap: 16 } }}>
                    <div style={{ padding: 12, borderRadius: '50%', background: '#e6f7ff' }}>
                         <CheckCircleOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    </div>
                    <div>
                        <div style={{ color: '#8c8c8c', fontSize: 13 }}>Đang kiểm nghiệm</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#1890ff' }}>{stats.inspections}</div>
                    </div>
                </Card>
            </Col>
            <Col xl={5} md={8} xs={12}>
                 <Card variant="borderless" styles={{ body: { padding: 20, display: 'flex', alignItems: 'center', gap: 16 } }}>
                    <div style={{ padding: 12, borderRadius: '50%', background: '#f6ffed' }}>
                         <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                    </div>
                    <div>
                        <div style={{ color: '#8c8c8c', fontSize: 13 }}>Đang nghiệm thu</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#52c41a' }}>{stats.acceptances}</div>
                    </div>
                </Card>
            </Col>
            <Col xl={4} md={8} xs={12}>
                <Card variant="borderless" styles={{ body: { padding: 20, display: 'flex', alignItems: 'center', gap: 16 } }}>
                    <div style={{ padding: 12, borderRadius: '50%', background: '#fff1f0' }}>
                         <CloseCircleOutlined style={{ fontSize: 24, color: '#cf1322' }} />
                    </div>
                    <div>
                        <div style={{ color: '#8c8c8c', fontSize: 13 }}>Đã hủy / Từ chối</div>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#cf1322' }}>{stats.cancelled}</div>
                    </div>
                </Card>
            </Col>
        </Row>

        <Card variant="borderless" styles={{ body: { padding: '16px 24px' } }}>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Quản lý sửa chữa
              </Title>
            </Col>
            <Col>
              <Space>
                 <Select
                    placeholder="Lọc thiết bị"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    style={{ width: 200 }}
                    value={filterDevice}
                    onChange={(val) => setFilterDevice(val)}
                 >
                    {availableDevices.map((d: any) => (
                        <Option key={d.device_id} value={d.device_id}>
                            {d.name} ({d.reg_number || d.serial_number})
                        </Option>
                    ))}
                 </Select>
                 
                 <Select
                    placeholder="Trạng thái"
                    allowClear
                    style={{ width: 150 }}
                    value={filterStatusRequest}
                    onChange={(val) => setFilterStatusRequest(val)}
                  >
                    <Option value="WAITING_TECH">Chờ tiếp nhận</Option>
                    <Option value="WAITING_MANAGER">Chờ QL duyệt</Option>
                    <Option value="WAITING_DIRECTOR">Chờ GĐ duyệt</Option>
                    <Option value="COMPLETED">Đã duyệt YC</Option>
                    <Option value="CANCELED">Đã hủy</Option>
                    <Option value="REJECTED">Đã từ chối</Option>
                  </Select>

                 {canCreate && (
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            setSelectedRepair(null);
                            setOpenForm(true);
                        }}
                    >
                        Lập phiếu
                    </Button>
                 )}
              </Space>
            </Col>
          </Row>
        </Card>

        <Card variant="borderless" styles={{ body: { padding: 0 } }}>
             <Spin spinning={loading}>
                <RepairsTable
                    rows={repairs}
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
        onReview={(action, reason, phase) => { if (selectedRepair) handleReview(selectedRepair.repair_id, action, reason, phase || 'request'); }}
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
