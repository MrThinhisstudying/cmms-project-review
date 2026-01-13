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
  Spin
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
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
  // Separate states for inspection status could be added if needed, or combined
  
  // Trigger server-side fetch when filters change
  useEffect(() => {
    reload({
      device_id: filterDevice,
      status_request: filterStatusRequest,
      // Add status_inspection if we want to filter by that too
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDevice, filterStatusRequest]); // removed reload from dependencies to avoid loop if reload isn't stable

  const canCreate = role === "admin" || perms.includes("CREATE_REPAIR");
  const canUpdate = role === "admin" || perms.includes("UPDATE_REPAIR");
  const canReview = role === "admin" || perms.includes("APPROVE_REPAIR");
  const canDelete = role === "admin" || perms.includes("DELETE_REPAIR");
  const canExport = role === "admin" || perms.includes("EXPORT_REPAIR");

  const checkPermission = (permissionCode: string) => {
    return role === "admin" || perms.includes(permissionCode);
  };


  const [openForm, setOpenForm] = useState(false);
  const [openInspection, setOpenInspection] = useState(false);
  const [openAcceptance, setOpenAcceptance] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<IRepair | null>(null);
  const [saving, setSaving] = useState(false);

  // No more client-side filtering needed!
  
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
      message.success("Cập nhật duyệt thành công");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Duyệt thất bại");
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
      message.success("Đã cập nhật & duyệt kiểm nghiệm");
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
      message.success("Đã cập nhật & duyệt nghiệm thu");
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

  const currentRepairIndex = selectedRepair ? repairs.findIndex(r => r.repair_id === selectedRepair.repair_id) : -1;
  const hasPrev = currentRepairIndex > 0;
  const hasNext = currentRepairIndex !== -1 && currentRepairIndex < repairs.length - 1;

  const handleExport = async (
    id: number,
    type: "request" | "inspection" | "acceptance"
  ) => {
    try {
      await exportRepairItem(id, type);
      message.success("Đã xuất file Word");
    } catch {
      message.error("Xuất file thất bại");
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

  if (loading && !repairs.length) {
    return <Spin size="large" />;
  }

  return (
    <div style={{ padding: 24, minHeight: "100vh", backgroundColor: "#f0f2f5" }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card>
          <Row justify="space-between" align="middle" gutter={[16, 16]}>
            <Col>
              <Title level={4} style={{ margin: 0 }}>
                Quản lý quy trình phiếu sửa chữa
              </Title>
            </Col>
            <Col>
              <Space>
                 <Select
                    placeholder="Lọc theo thiết bị"
                    allowClear
                    showSearch
                    optionFilterProp="children"
                    style={{ width: 250 }}
                    value={filterDevice}
                    onChange={(val) => setFilterDevice(val)}
                 >
                    {availableDevices.map((d: any) => (
                        <Option key={d.device_id} value={d.device_id}>
                            {d.name} ({d.brand})
                        </Option>
                    ))}
                 </Select>
                 
                 <Select
                    placeholder="Lọc theo trạng thái yêu cầu"
                    allowClear
                    style={{ width: 200 }}
                    value={filterStatusRequest}
                    onChange={(val) => setFilterStatusRequest(val)}
                  >
                    <Option value="pending">Chờ phê duyệt</Option>
                    <Option value="manager_approved">Bộ phận đã duyệt</Option>
                    <Option value="admin_approved">Admin đã duyệt</Option>
                    <Option value="rejected">Từ chối</Option>
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
                    rows={repairs} // Now using direct data from context, filtered by backend
                    rowsPerPage={10} // Client-side pagination for remaining set (or implement server pagination later)
                    page={1}
                    onReview={handleReview}
                    onDelete={handleDelete}
                    onEdit={(r) => {
                        setSelectedRepair(r);
                        setOpenForm(true);
                    }}
                    onView={(r) => {
                        setSelectedRepair(r);
                        // Drawer opens when selectedRepair is set
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
                    canReview={canReview}
                    canDelete={canDelete}
                    canUpdate={canUpdate}
                    canExport={canExport}
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
        canExport={checkPermission("EXPORT_REPAIR")}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
        onEdit={() => setOpenForm(true)}
        currentUser={user}
        onReview={(action, reason) => selectedRepair && handleReview(selectedRepair.repair_id, action, reason, 'request')}
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
