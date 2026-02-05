import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  Input,
  Select,
  Typography,
  Space,
  Row,
  Col,
  Table,
  Descriptions,
  InputNumber,
  Form
} from "antd";
import {
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  DeleteOutlined
} from "@ant-design/icons";
import {
  IRepair,
  RepairAcceptancePayload,
  IMaterial,
} from "../../../../types/repairs.types";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ExtendedMaterial {
  key: string;
  name: string;
  unit: string;
  specifications?: string;

  // Replacement (from Inspection or Added)
  replace_qty: number;

  // Recovered
  recover_qty: number;
  recover_damage: number; // %

  // Scrap
  scrap_qty: number;
  scrap_damage: number; // %



  item_id?: number | null; // Added to preserve item mapping
  item_code?: string;
  is_new?: boolean;
  notes?: string;
  is_new_row?: boolean;
  phase?: 'inspection' | 'acceptance';
}

export default function RepairAcceptanceForm({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  initialData: IRepair;
  onClose: () => void;
  onSubmit: (data: RepairAcceptancePayload) => Promise<void> | void;
  loading?: boolean;
}) {
  const { users } = useUsersContext();
  const { user: currentUser } = useAuthContext();
  const [form] = Form.useForm();
  
  // Watch committee to smart filter
  const committee = Form.useWatch('committee', form) || [];
  const selectedUserIds = Array.isArray(committee) ? committee.map((c: any) => c?.user_id).filter(Boolean) : [];

  // --- STATE ---
  const [materials, setMaterials] = useState<ExtendedMaterial[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [location, setLocation] = useState("");

  // --- INIT ---
  useEffect(() => {
    if (!open || !initialData) return;

    // 1. Committee
    const initialCommittee = initialData.acceptance_committee?.map(u => ({
        user_id: u.user_id,
        name: u.name,
        role: u.position || u.role
    })) || [];
    if (initialCommittee.length === 0) {
        initialCommittee.push({ user_id: undefined, name: '', role: '' });
    }

    // 2. Materials
    const inspMats = initialData.inspection_materials || [];
    const recMats = initialData.recovered_materials || [];
    const scrMats = initialData.materials_to_scrap || [];

    const matMap = new Map<string, ExtendedMaterial>();

    inspMats.forEach((m, idx) => {
        const key = `insp_${idx}`;
        matMap.set(m.item_name || "Unknown", {
          key,
          name: m.item_name || "",
          unit: m.unit || "", 
          specifications: m.specifications || "",

          item_id: m.item_id,
          item_code: m.item_code,
          is_new: m.is_new,
          notes: m.notes,

          replace_qty: m.quantity || 0,
          recover_qty: 0,
          recover_damage: 0,
          scrap_qty: 0,
          scrap_damage: 0,
        });
    });

    recMats.forEach((m, idx) => {
        const existing = matMap.get(m.name);
        if (existing) {
          existing.recover_qty = m.quantity;
          existing.recover_damage = m.damage_percentage;
          if (m.unit) existing.unit = m.unit;
        } else {
          matMap.set(m.name, {
            key: `rec_${idx}`,
            name: m.name,
            unit: m.unit,
            replace_qty: 0,
            recover_qty: m.quantity,
            recover_damage: m.damage_percentage,
            scrap_qty: 0,
            scrap_damage: 0,
            is_new_row: true,
          });
        }
    });

    scrMats.forEach((m, idx) => {
        const existing = matMap.get(m.name);
        if (existing) {
          existing.scrap_qty = m.quantity;
          existing.scrap_damage = m.damage_percentage;
          if (m.unit) existing.unit = m.unit;
        } else {
          matMap.set(m.name, {
            key: `scr_${idx}`,
            name: m.name,
            unit: m.unit,
            replace_qty: 0,
            recover_qty: 0,
            recover_damage: 0,
            scrap_qty: m.quantity,
            scrap_damage: m.damage_percentage,
            is_new_row: true,
          });
        }
    });

    setMaterials(Array.from(matMap.values()));

    form.setFieldsValue({
        committee: initialCommittee,
        failure_description: initialData.failure_description || "",
        failure_cause: initialData.failure_cause || "",
        acceptance_note: initialData.acceptance_note || "Sau khi tiến hành sửa chữa, xe hoạt động ổn định và an toàn.",
        acceptance_other_opinions: initialData.acceptance_other_opinions || ""
    });
    setRejectReason("");
    setLocation(initialData.device.location_coordinates || "");
  }, [open, initialData, form]);

  // --- ACTIONS ---

  // Smart User Options
  const getUserOptions = (currentUserId?: number) => {
      const excludedRoles = ['TEAM_LEAD', 'UNIT_HEAD', 'ADMIN', 'DIRECTOR'];
      const excludedDepts = ['Ban giám đốc'];

      const options = users.filter(u => {
          if (u.user_id === currentUserId) return true;
          if (selectedUserIds.includes(u.user_id)) return false;

          if (excludedRoles.includes(u.role)) return false;
          if (u.department?.name && excludedDepts.includes(u.department.name)) return false;

          return true;
      }).map(u => ({ label: u.name, value: u.user_id, role: u.role, position: u.position }));
      return options;
  };

  // Materials
  const handleAddNewMaterialRow = () => {
    const newMat: ExtendedMaterial = {
      key: `new_${Date.now()}`,
      name: "",
      unit: "",
      replace_qty: 0,
      recover_qty: 0,
      recover_damage: 0,
      scrap_qty: 0,
      scrap_damage: 0,
      is_new_row: true,
      phase: 'acceptance'
    };
    setMaterials([...materials, newMat]);
  };

  const updateMaterial = (key: string, field: keyof ExtendedMaterial, value: any) => {
    setMaterials(prev => prev.map(m => m.key === key ? { ...m, [field]: value } : m));
  };
  
  const removeMaterial = (key: string) => {
    setMaterials(prev => prev.filter(m => m.key !== key));
  };

  const handleFinalSubmit = async (finalAction: "approve" | "reject") => {
      try {
          const values = await form.validateFields();
          const committeeIds = values.committee.map((c: any) => c.user_id).filter((id: number) => !!id);

          const recoveredMats: IMaterial[] = [];
          const scrapMats: IMaterial[] = [];

          materials.forEach(m => {
              if (m.recover_qty > 0) {
                  recoveredMats.push({
                      name: m.name,
                      quantity: m.recover_qty,
                      unit: m.unit,
                      damage_percentage: m.recover_damage
                  });
              }
              if (m.scrap_qty > 0) {
                   scrapMats.push({
                      name: m.name,
                      quantity: m.scrap_qty,
                      unit: m.unit,
                      damage_percentage: m.scrap_damage
                   });
              }
          });

          const payload: RepairAcceptancePayload = {
             acceptance_committee_ids: committeeIds,
             failure_description: values.failure_description,
             failure_cause: values.failure_cause,
             acceptance_note: values.acceptance_note,
             acceptance_other_opinions: values.acceptance_other_opinions,
             recovered_materials: recoveredMats,
             materials_to_scrap: scrapMats,
             inspection_materials: materials.filter(m => m.replace_qty > 0).map(m => ({
                 item_id: m.item_id,
                 item_name: m.name,
                 quantity: m.replace_qty,
                 unit: m.unit,
                 is_new: !m.item_id, // If no item_id, it is new
                 item_code: m.item_code,
                 specifications: m.specifications,
                 notes: m.notes,
                 phase: m.phase
             })),
             action: finalAction,
             reason: finalAction === 'reject' ? rejectReason : undefined,
             location_coordinates: location || undefined
          };

          await onSubmit(payload);
      } catch (e) {
          console.error("Validation Failed", e);
      }
  };

  const canApprove = currentUser?.role === 'UNIT_HEAD' || currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEAM_LEAD' || currentUser?.role === 'OPERATOR';
  const canModify = currentUser?.role === 'TECHNICIAN' || currentUser?.role === 'ADMIN';

  if (!initialData) return null;

  return (
    <>
      <Modal
         open={open}
         onCancel={onClose}
         width={1000}
         centered
         title={
             <div style={{ textAlign: "center", marginBottom: 20 }}>
                 <Title level={4} style={{ margin: 0 }}>KẾT QUẢ NGHIỆM THU (B06)</Title>
                 <Text type="secondary">Mã phiếu: #{initialData.repair_id}</Text>
             </div>
         }
         footer={
            <div style={{ textAlign: "right" }}>
                <Button onClick={onClose} style={{ marginRight: 8 }}>Thoát</Button>
                
                {canModify && (
                   <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => handleFinalSubmit('approve')}>
                       Lưu phiếu
                   </Button>
                )}

                {canApprove && (
                   <Space style={{ marginLeft: 8 }}>
                       <Button danger icon={<CloseOutlined />} onClick={() => setRejectModalOpen(true)}>
                           Từ chối
                       </Button>
                       <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleFinalSubmit('approve')}>
                           Phê duyệt
                       </Button>
                   </Space>
                )}
           </div>
        }
      >
         <Form form={form} layout="vertical">
             {/* I. DEVICE INFO */}
             <Typography.Title level={5}>I. THÔNG TIN THIẾT BỊ</Typography.Title>
             <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                <Descriptions.Item label="Tên thiết bị">{initialData.device?.name}</Descriptions.Item>
                <Descriptions.Item label="Biển số đăng ký">{initialData.device?.reg_number}</Descriptions.Item>
                <Descriptions.Item label="Nơi đặt">{initialData.device?.location_coordinates || initialData.device?.serial_number}</Descriptions.Item>
                <Descriptions.Item label="Đơn vị quản lý tài sản">{initialData.device?.using_department || initialData.created_department?.name}</Descriptions.Item>
             </Descriptions>

             {/* II. COMMITTEE */}
             <Typography.Title level={5}>II. THÀNH PHẦN NGHIỆM THU</Typography.Title>
             <Form.List name="committee">
                {(fields, { add, remove }) => (
                    <div style={{ marginBottom: 24 }}>
                        {fields.map(({ key, name, ...restField }) => (
                            <Row key={key} gutter={16} align="middle" style={{ marginBottom: 8 }}>
                                <Col span={10}>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'user_id']}
                                        label={name === 0 ? "Họ tên" : undefined}
                                        rules={[{ required: true, message: 'Chọn thành viên' }]}
                                        style={{ margin: 0 }}
                                    >
                                        <Select 
                                            placeholder="Chọn thành viên"
                                            showSearch
                                            optionFilterProp="label"
                                            onChange={(_, option: any) => {
                                                const usersArr = form.getFieldValue('committee') || [];
                                                if(usersArr[name]) {
                                                    usersArr[name].role = option.position || option.role || '';
                                                    form.setFieldsValue({ committee: [...usersArr] });
                                                }
                                            }}
                                            options={getUserOptions(form.getFieldValue(['committee', name, 'user_id']))}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={10}>
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'role']}
                                        label={name === 0 ? "Chức vụ" : undefined}
                                        style={{ margin: 0 }}
                                    >
                                        <Input placeholder="Chức vụ" />
                                    </Form.Item>
                                </Col>
                                <Col span={2}>
                                    <Button 
                                        type="text" 
                                        danger 
                                        icon={<DeleteOutlined />} 
                                        onClick={() => remove(name)} 
                                        style={{ marginTop: name === 0 ? 30 : 0 }}
                                    />
                                </Col>
                            </Row>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} style={{ marginTop: 8 }}>
                            Thêm thành viên
                        </Button>
                    </div>
                )}
             </Form.List>

             {/* III. RESULT */}
             <Typography.Title level={5}>III. KẾT QUẢ NGHIỆM THU</Typography.Title>
             
             {/* Failure Info */}
             <Row gutter={16}>
                 <Col span={24}>
                     <Form.Item name="failure_description" label="Mô tả sự cố hỏng hóc">
                         <TextArea placeholder="Mô tả..." autoSize={{ minRows: 2 }} />
                     </Form.Item>
                 </Col>
                 <Col span={24}>
                     <Form.Item name="failure_cause" label="Xác định nguyên nhân hỏng hóc">
                         <TextArea placeholder="Nguyên nhân..." autoSize={{ minRows: 2 }} />
                     </Form.Item>
                 </Col>
             </Row>

             {/* Materials Table */}
             <Text strong style={{ display: 'block', marginBottom: 8 }}>Vật tư thay thế / Thu hồi / Thanh lý</Text>
             <Table
                dataSource={materials}
                pagination={false}
                bordered
                size="small"
                rowKey="key"
                footer={() => <Button type="dashed" size="small" onClick={handleAddNewMaterialRow} icon={<PlusOutlined />}>Thêm vật tư</Button>}
                scroll={{ x: 1000 }}
                columns={[
                    { title: 'Stt', width: 50, align: 'center', render: (_, __, index) => index + 1 },
                    {
                        title: 'Vật tư thay thế',
                        children: [
                            { title: 'Tên', dataIndex: 'name', width: 200, render: (val, record) => (
                                <Input value={val} onChange={e => updateMaterial(record.key, 'name', e.target.value)} placeholder="Tên" />
                            )},
                            { title: 'ĐVT', dataIndex: 'unit', width: 80, render: (val, record) => (
                                <Input value={val} onChange={e => updateMaterial(record.key, 'unit', e.target.value)} />
                            )},
                            { title: 'SL', dataIndex: 'replace_qty', width: 80, align: 'center', render: (val, record) => (
                                <InputNumber min={0} value={val} onChange={v => updateMaterial(record.key, 'replace_qty', v)} style={{width: '100%'}} />
                            )},
                        ]
                    },
                    {
                        title: <div style={{textAlign: 'center'}}>Vật tư thu hồi<br/><i>Recovered Material</i></div>,
                        children: [
                            { title: 'SL', dataIndex: 'recover_qty', width: 80, align: 'center', render: (val, record) => (
                                <InputNumber min={0} value={val} onChange={v => updateMaterial(record.key, 'recover_qty', v)} style={{width: '100%'}} />
                            )},
                            { title: '% hư hỏng', dataIndex: 'recover_damage', width: 100, align: 'center', render: (val, record) => (
                                <InputNumber min={0} max={100} formatter={value => `${value}%`} parser={value => value!.replace('%', '')} value={val} onChange={v => updateMaterial(record.key, 'recover_damage', v)} style={{width: '100%'}} />
                            )},
                        ]
                    },
                    {
                        title: <div style={{textAlign: 'center'}}>Vật tư xin hủy<br/><i>Material for Disposal</i></div>,
                        children: [
                            { title: 'SL', dataIndex: 'scrap_qty', width: 80, align: 'center', render: (val, record) => (
                                <InputNumber min={0} value={val} onChange={v => updateMaterial(record.key, 'scrap_qty', v)} style={{width: '100%'}} />
                            )},
                            { title: '% hư hỏng', dataIndex: 'scrap_damage', width: 100, align: 'center', render: (val, record) => (
                                <InputNumber min={0} max={100} formatter={value => `${value}%`} parser={value => value!.replace('%', '')} value={val} onChange={v => updateMaterial(record.key, 'scrap_damage', v)} style={{width: '100%'}} />
                            )},
                        ]
                    },
                    { title: '', width: 50, fixed: 'right', render: (_, record) => (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMaterial(record.key)} />
                    )}
                ]}
                style={{ marginBottom: 24 }}
             />

             {/* Conclusion */}
             <Form.Item name="acceptance_note" label="Kết luận">
                 <TextArea placeholder="Kết luận..." autoSize={{ minRows: 2 }} />
             </Form.Item>
             
             <Form.Item name="acceptance_other_opinions" label="Ý kiến khác">
                 <TextArea placeholder="Ý kiến khác..." autoSize={{ minRows: 2 }} />
             </Form.Item>
         </Form>
      </Modal>

      <Modal
         title="Từ chối nghiệm thu"
         open={rejectModalOpen}
         onOk={() => {
             handleFinalSubmit('reject');
             setRejectModalOpen(false);
         }}
         onCancel={() => setRejectModalOpen(false)}
      >
          <Typography.Paragraph>Vui lòng nhập lý do từ chối:</Typography.Paragraph>
          <TextArea rows={4} value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
      </Modal>
    </>
  );
}
