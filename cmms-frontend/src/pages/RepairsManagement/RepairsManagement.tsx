import React, { useEffect, useMemo, useState } from "react";
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
  Statistic
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

  useEffect(() => {
    reload({
      device_id: filterDevice,
      status_request: filterStatusRequest,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDevice, filterStatusRequest]);

  // Strict Role Check: Only Admin, Technician, Operator can create (Unit Head/Director only approve)
  const canCreate = role === "ADMIN" || role === "TECHNICIAN" || role === "OPERATOR";
  // Assuming strict RBAC logic for button visibility is handled here or in children.

  const [openForm, setOpenForm] = useState(false);
  const [openInspection, setOpenInspection] = useState(false);
  const [openAcceptance, setOpenAcceptance] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<IRepair | null>(null);
  const [saving, setSaving] = useState(false);

  // Stats Calculation
  const stats = useMemo(() => {
    const total = repairs.length;
    const requests = repairs.filter(r => r.status_request !== 'COMPLETED' && r.status_request !== 'REJECTED' && !r.canceled).length;
    const inspections = repairs.filter(r => r.status_request === 'COMPLETED' && r.status_inspection !== 'inspection_admin_approved' && !r.canceled).length;
    const acceptances = repairs.filter(r => r.status_inspection === 'inspection_admin_approved' && r.status_acceptance !== 'acceptance_admin_approved' && !r.canceled).length;
    const cancelled = repairs.filter(r => r.canceled).length;
    return { total, requests, inspections, acceptances, cancelled };
  }, [repairs]);

  const handleSubmit = async (data: RepairUpsertPayload) => {
    try {
      setSaving(true);
      if (selectedRepair) {
        await updateRepairItem(selectedRepair.repair_id, data);
        message.success("Cập nhật phiếu thành công");
      } else {
        await createRepairItem(data);
        message.success("Tạo phiếu mới thành công");
      }
      setOpenForm(false);
      setSelectedRepair(null);
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Thao tác thất bại");
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
              // Using helper which mimics context logic? 
              // RepairsContext likely wraps api calls.
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
    const currentIndex = repairs.findIndex(r => r.repair_id === selectedRepair.repair_id);
    if (currentIndex > 0) {
        setSelectedRepair(repairs[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (!selectedRepair) return;
    const currentIndex = repairs.findIndex(r => r.repair_id === selectedRepair.repair_id);
    if (currentIndex !== -1 && currentIndex < repairs.length - 1) {
        setSelectedRepair(repairs[currentIndex + 1]);
    }
  };

  const hasPrev = selectedRepair ? repairs.findIndex(r => r.repair_id === selectedRepair.repair_id) > 0 : false;
  const hasNext = selectedRepair ? repairs.findIndex(r => r.repair_id === selectedRepair.repair_id) < repairs.length - 1 : false;

  /* New state for export loading */
  const [exportLoading, setExportLoading] = useState(false);

  const handleExport = async (id: number, type: "request" | "inspection" | "acceptance") => {
    try {
      setExportLoading(true);
      await exportRepairItem(id, type);
      message.success("Tải xuống thành công");
    } catch {
      message.error("Xuất file thất bại");
    } finally {
      setExportLoading(false);
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
            <Col span={5}>
                <Card bordered={false}>
                    <Statistic title="Tổng phiếu" value={stats.total} prefix={<FileTextOutlined />} />
                </Card>
            </Col>
            <Col span={5}>
                <Card bordered={false}>
                    <Statistic title="Yêu cầu sửa chữa" value={stats.requests} valueStyle={{ color: '#faad14' }} prefix={<ToolOutlined />} />
                </Card>
            </Col>
            <Col span={5}>
                <Card bordered={false}>
                    <Statistic title="Đang kiểm nghiệm" value={stats.inspections} valueStyle={{ color: '#1890ff' }} prefix={<CheckCircleOutlined />} />
                </Card>
            </Col>
            <Col span={5}>
                <Card bordered={false}>
                    <Statistic title="Đang nghiệm thu" value={stats.acceptances} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
                </Card>
            </Col>
            <Col span={4}>
                <Card bordered={false}>
                    <Statistic title="Đã hủy / Từ chối" value={stats.cancelled} valueStyle={{ color: '#cf1322' }} prefix={<CloseCircleOutlined />} />
                </Card>
            </Col>
        </Row>

        <Card>
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
                    style={{ width: 250 }}
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
                    style={{ width: 180 }}
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

        <Card bodyStyle={{ padding: 0 }}>
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
                    onExport={(r, t) => handleExport(r.repair_id, t)}
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

