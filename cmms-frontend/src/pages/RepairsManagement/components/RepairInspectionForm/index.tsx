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
  InputNumber,
  Form,
  Card
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  IRepair,
  RepairInspectionPayload,
  IInspectionMaterial,
} from "../../../../types/repairs.types";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Simplified Material Type for Section III (Proposed Materials only)
interface ExtendedInspectionMaterial {
  key: string;
  item_id?: number | null; // If from stock
  name: string;
  unit: string; // "Quy cách, mã số" mapped largely to unit/code, but here mostly just descriptive or unit
  quantity: number;
  item_code?: string; // For "Quy cách, mã số"
  is_new: boolean;
  notes?: string;
}

export default function RepairInspectionForm({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  initialData: IRepair;
  onClose: () => void;
  onSubmit: (data: RepairInspectionPayload) => Promise<void> | void;
  loading?: boolean;
}) {
  const { items } = useInventoryContext();
  const { users } = useUsersContext();
  const { user: currentUser } = useAuthContext();
  const [form] = Form.useForm();

  // --- STATE ---
  const [inspectionItems, setInspectionItems] = useState<Array<{description: string; cause: string; solution: string; notes: string}>>([
    { description: "", cause: "", solution: "", notes: "" }
  ]);
  const [inspectionOtherOpinions, setInspectionOtherOpinions] = useState("");
  const [materials, setMaterials] = useState<ExtendedInspectionMaterial[]>([]);

  // Action
  // Removed unused 'action' state, as it's passed directly to submit handler now or local var
  const [reason, setReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // --- INIT ---
  useEffect(() => {
    console.log("RepairInspectionForm mounted/updated (B04 Template)", { open, initialData });
    
    if (!open || !initialData) return;

    // 1. Committee (Section I.2)
    const initialCommittee = initialData.inspection_committee?.map(u => ({
        user_id: u.user_id,
        name: u.name,
        role: u.role
    })) || [];
    // If empty, pre-fill with at least 2 empty slots for visual matching standard
    if (initialCommittee.length === 0) {
        initialCommittee.push({ user_id: undefined, name: '', role: '' });
        initialCommittee.push({ user_id: undefined, name: '', role: '' });
    }
    form.setFieldsValue({ committee: initialCommittee });

    // 2. Inspection Items (Section II)
    setInspectionItems(
      initialData.inspection_items && initialData.inspection_items.length > 0
        ? initialData.inspection_items.map(item => ({
            description: item.description || "",
            cause: item.cause || "",
            solution: item.solution || "",
            notes: item.notes || ""
          }))
        : [{ description: "", cause: "", solution: "", notes: "" }, { description: "", cause: "", solution: "", notes: "" }] // Default 2 rows
    );
    setInspectionOtherOpinions(initialData.inspection_other_opinions || "");

    // 3. Materials (Section III)
    const existingMats = initialData.inspection_materials || [];
    const mappedMats: ExtendedInspectionMaterial[] = existingMats.map((m, idx) => ({
      key: `exist_${idx}`,
      item_id: m.item_id || null,
      name: m.item_name || (m.item_id ? items.find(i => i.item_id === m.item_id)?.name || "Unknown Item" : ""),
      unit: m.unit || (m.item_id ? items.find(i => i.item_id === m.item_id)?.quantity_unit || "" : ""),
      item_code: m.item_code || (m.item_id ? items.find(i => i.code === m.item_code)?.code || "" : ""),
      quantity: m.quantity || 0,
      is_new: !!m.is_new,
      notes: m.notes || "",
    }));
    
    setMaterials(mappedMats.length > 0 ? mappedMats : []);
    setReason("");
  }, [open, initialData, items, form]); 

  // --- ACTIONS ---

  // Inspection Items
  const updateInspectionItem = (i: number, field: 'description' | 'cause' | 'solution' | 'notes', value: string) => {
    const updated = [...inspectionItems];
    updated[i] = { ...updated[i], [field]: value };
    setInspectionItems(updated);
  };
  const addInspectionItem = () => setInspectionItems(p => [...p, { description: "", cause: "", solution: "", notes: "" }]);
  const removeInspectionItem = (i: number) => setInspectionItems(p => p.filter((_, idx) => idx !== i));

  // Materials
  const handleAddNewMaterialRow = () => {
    const newMat: ExtendedInspectionMaterial = {
      key: `new_${Date.now()}`,
      item_id: null,
      name: "",
      unit: "",
      quantity: 1,
      is_new: false, 
      notes: ""
    };
    setMaterials([...materials, newMat]);
  };

  const updateMaterial = (key: string, field: keyof ExtendedInspectionMaterial, value: any) => {
    setMaterials(prev => prev.map(m => {
      if (m.key !== key) return m;

      if (field === 'item_id') {
         const selectedItem = items.find(i => i.item_id === value);
         return {
             ...m,
             item_id: value,
             name: selectedItem?.name || "",
             unit: selectedItem?.quantity_unit || "",
             item_code: selectedItem?.code || "",
             is_new: false
         };
      }
      if (field === 'name' && m.item_id === null) {
          return { ...m, name: value, is_new: true };
      }
      return { ...m, [field]: value };
    }));
  };

  const removeMaterial = (key: string) => {
    setMaterials(prev => prev.filter(m => m.key !== key));
  };

  const handleSubmit = async (finalAction: "approve" | "reject", rejectionReason?: string) => {
     const formValues = form.getFieldsValue();
     const committeeMembers = formValues.committee || [];
     const committeeIds = committeeMembers.map((c: any) => c.user_id).filter((id: number) => !!id);

     const payloadMaterials: IInspectionMaterial[] = materials.map(m => ({
         item_id: m.item_id || undefined,
         item_name: m.name,
         quantity: m.quantity,
         unit: m.unit,
         item_code: m.item_code,
         is_new: !m.item_id,
         notes: m.notes
     }));

     const payload: RepairInspectionPayload = {
        inspection_materials: finalAction === 'approve' ? payloadMaterials : [],
        inspection_committee_ids: committeeIds,
        action: finalAction,
        reason: rejectionReason,
        inspection_items: inspectionItems.filter(item => 
          item.description.trim() || item.cause.trim() || item.solution.trim()
        ),
        inspection_other_opinions: inspectionOtherOpinions.trim() || undefined,
     };

     await onSubmit(payload);
  };

  // --- PERMISSIONS / ROLES ---
  const isManagerOrDirector = currentUser?.role === 'manager' || currentUser?.role === 'admin';
  
  // --- SAFETY CHECK ---
  if (!initialData) return null;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width={1000}
        style={{ top: 20 }}
        title={null}
        footer={null}
        className="repair-inspection-modal"
      >
        <Card bordered={false} styles={{ body: { padding: "40px" } }} style={{ minHeight: "800px", fontFamily: '"Times New Roman", Times, serif', fontSize: '16px' }}>
             
             {/* TOP RIGHT: FORM CODE */}
             <div style={{ textAlign: "right", marginBottom: 20 }}>
                 <Text strong>Biểu mẫu: B04.QT08/VCS-KT</Text>
             </div>

             {/* HEADER */}
             <div style={{ textAlign: "center", marginBottom: 32 }}>
                <Title level={3} style={{ margin: 0, textTransform: "uppercase" }}>
                    BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT VÀ ĐỀ NGHỊ VẬT TƯ SỬA CHỮA
                </Title>
            </div>

            {/* I. PHẦN TỔNG QUÁT */}
            <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline' }}>I. PHẦN TỔNG QUÁT:</Title>
                
                {/* 1. Lý lịch thiết bị */}
                <div style={{ paddingLeft: 20 }}>
                    <Text strong>1. Lý lịch thiết bị:</Text>
                    <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 0', width: '200px' }}>- Tên thiết bị:</td>
                                <td><Text strong>{initialData.device?.name || "..."}</Text></td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0' }}>- Số đăng ký:</td>
                                <td><Text strong>{initialData.device?.serial_number || "..."}</Text></td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0' }}>- Đơn vị quản lý:</td>
                                <td>{initialData.device?.using_department || initialData.created_department?.name || "..."}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0' }}>- Số giờ/ km hoạt động:</td>
                                <td>
                                    <Space size={16}>
                                        <Space size={4}>
                                            <Input 
                                                style={{ width: 100, textAlign: 'center' }} 
                                                variant="borderless" 
                                                placeholder="..." 
                                            />
                                            <Text>Km</Text>
                                        </Space>
                                        <Space size={4}>
                                            <Input 
                                                style={{ width: 100, textAlign: 'center' }} 
                                                variant="borderless" 
                                                placeholder="..." 
                                            />
                                            <Text>Giờ</Text>
                                        </Space>
                                    </Space>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 2. Thành phần kiểm nghiệm */}
                <div style={{ paddingLeft: 20, marginTop: 16 }}>
                    <Text strong>2. Thành phần kiểm nghiệm:</Text>
                    <Form form={form} component={false}>
                        <Form.List name="committee">
                            {(fields, { add, remove }) => (
                            <table style={{ width: '100%', marginTop: 8 }}>
                                <tbody>
                                    {fields.map(({ key, name, ...restField }, index) => (
                                    <tr key={key}>
                                        <td style={{ padding: '4px 0', width: '60px' }}>{index + 1}. Ông:</td>
                                        <td style={{ width: '40%' }}>
                                            <Form.Item {...restField} name={[name, 'user_id']} style={{ margin: 0 }}>
                                                <Select 
                                                    placeholder="..." 
                                                    variant="borderless" 
                                                    style={{ width: '90%', borderBottom: '1px dotted #ccc' }}
                                                    onChange={(val) => {
                                                        const u = users.find(x => x.user_id === val);
                                                        if(u) {
                                                            const arr = form.getFieldValue('committee');
                                                            arr[name] = { ...arr[name], name: u.name, role: u.role };
                                                            form.setFieldsValue({ committee: arr });
                                                        }
                                                    }}
                                                >
                                                     {users.map(u => <Option key={u.user_id} value={u.user_id}>{u.name}</Option>)}
                                                </Select>
                                            </Form.Item>
                                        </td>
                                        <td style={{ width: '80px', textAlign: 'right', paddingRight: 8 }}>Chức vụ:</td>
                                        <td>
                                             <Form.Item {...restField} name={[name, 'role']} style={{ margin: 0 }}>
                                                 <Input variant="borderless" style={{ borderBottom: '1px dotted #ccc', width: '100%' }} placeholder="..." />
                                             </Form.Item>
                                        </td>
                                        <td style={{ width: 30 }}>
                                            <MinusButton onClick={() => remove(name)} />
                                        </td>
                                    </tr>
                                    ))}
                                    <tr>
                                        <td colSpan={5}>
                                            <Button type="dashed" size="small" onClick={() => add()} icon={<PlusOutlined />} style={{ marginTop: 8 }}>Thêm thành viên</Button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            )}
                        </Form.List>
                    </Form>
                </div>

                {/* 3. Thời gian nghiệm thu */}
                <div style={{ paddingLeft: 20, marginTop: 16 }}>
                    <Text strong>3. Thời gian nghiệm thu:</Text> 
                    <Input 
                        defaultValue={dayjs().format('HH:mm DD/MM/YYYY')}
                        style={{ width: 200, marginLeft: 8, fontWeight: 'bold' }} 
                        variant="borderless" 
                    />
                </div>
            </div>

            {/* II. NỘI DUNG TÌNH TRẠNG */}
            <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline' }}>II. NỘI DUNG KIỂM NGHIỆM:</Title>
                <Table
                    dataSource={inspectionItems}
                    pagination={false}
                    bordered
                    size="small"
                    rowKey={(r, i) => i || 0}
                    footer={() => <Button type="dashed" size="small" onClick={addInspectionItem} icon={<PlusOutlined />}>Thêm dòng</Button>}
                    columns={[
                        { title: 'Stt', width: 50, align: 'center', render: (_: any, __: any, i: number) => i + 1 },
                        { title: 'Mô tả hư hỏng', dataIndex: 'description', render: (val: string, _: any, i: number) => (
                             <TextArea value={val} onChange={e => updateInspectionItem(i, 'description', e.target.value)} autoSize variant="borderless" />
                        )},
                        { title: 'Nguyên nhân hư hỏng', dataIndex: 'cause', render: (val: string, _: any, i: number) => (
                             <TextArea value={val} onChange={e => updateInspectionItem(i, 'cause', e.target.value)} autoSize variant="borderless" />
                        )},
                        { title: 'Biện pháp sửa chữa', dataIndex: 'solution', render: (val: string, _: any, i: number) => (
                             <TextArea value={val} onChange={e => updateInspectionItem(i, 'solution', e.target.value)} autoSize variant="borderless" />
                        )},
                        { title: 'Ghi chú', dataIndex: 'notes', width: 150, render: (val: string, _: any, i: number) => (
                             <TextArea value={val} onChange={e => updateInspectionItem(i, 'notes', e.target.value)} autoSize variant="borderless" />
                        )},
                         { title: '', width: 40, render: (_: any, __: any, i: number) => <MinusButton onClick={() => removeInspectionItem(i)} /> }
                    ]}
                />
            </div>

            {/* III. PHẦN ĐỀ NGHỊ CUNG CẤP VẬT TƯ */}
            <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold', textDecoration: 'underline' }}>III. PHẦN ĐỀ NGHỊ CUNG CẤP VẬT TƯ</Title>
                <Table
                    dataSource={materials}
                    pagination={false}
                    bordered
                    size="small"
                    rowKey="key"
                    footer={() => <Button type="dashed" size="small" onClick={handleAddNewMaterialRow} icon={<PlusOutlined />}>Thêm vật tư</Button>}
                    columns={[
                        { title: 'Stt', width: 50, align: 'center', render: (_: any, __: any, i: number) => i + 1 },
                        { title: 'Tên vật tư, phụ tùng cần thay thế', dataIndex: 'name', width: 300, render: (_: string, record: ExtendedInspectionMaterial) => (
                           <Space direction="vertical" style={{ width: '100%' }} size={0}>
                              <Select
                                style={{ width: '100%' }}
                                placeholder="Chọn..."
                                value={record.item_id}
                                onChange={(val) => updateMaterial(record.key, 'item_id', val)}
                                allowClear
                                showSearch
                                optionFilterProp="children"
                                variant="borderless"
                              >
                                 {items.map(it => <Option key={it.item_id} value={it.item_id} disabled={it.quantity < 1}>{it.name} (Tồn: {it.quantity})</Option>)}
                              </Select>
                              {!record.item_id && (
                                  <Input placeholder="Nhập tên..." value={record.name} onChange={e => updateMaterial(record.key, 'name', e.target.value)} variant="borderless" style={{ fontStyle: 'italic' }} />
                              )}
                           </Space>
                        )},
                        { title: 'Quy cách, mã số', dataIndex: 'item_code', render: (val: string, record: ExtendedInspectionMaterial) => (
                             <Input value={val} onChange={e => updateMaterial(record.key, 'item_code', e.target.value)} variant="borderless" />
                        )},
                        { title: 'Số lượng', dataIndex: 'quantity', width: 100, align: 'center', render: (val: number, record: ExtendedInspectionMaterial) => (
                             <InputNumber min={1} value={val} onChange={v => updateMaterial(record.key, 'quantity', v)} variant="borderless" />
                        )},
                        { title: 'Ghi chú', dataIndex: 'notes', width: 150, render: (val: string, record: ExtendedInspectionMaterial) => (
                            <Input value={val} onChange={e => updateMaterial(record.key, 'notes', e.target.value)} variant="borderless" />
                        )},
                         { title: '', width: 40, render: (_: any, record: ExtendedInspectionMaterial) => <MinusButton onClick={() => removeMaterial(record.key)} /> }
                    ]}
                />
            </div>
            
            {/* IV. CÁC Ý KIẾN KHÁC */}
            <div style={{ marginBottom: 32 }}>
                 <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold' }}>IV. CÁC Ý KIẾN KHÁC (nếu có):</Title>
                 <TextArea 
                    value={inspectionOtherOpinions} 
                    onChange={e => setInspectionOtherOpinions(e.target.value)} 
                    placeholder="..." 
                    autoSize={{ minRows: 2 }} 
                    variant="borderless" 
                    style={{ borderBottom: '1px dotted #ccc', marginTop: 4 }} 
                />
            </div>

             {/* FOOTER: SIGNATURES */}
             <div style={{ marginTop: 20 }}>
                 <div style={{ textAlign: 'right', marginBottom: 20, fontStyle: 'italic' }}>
                     Côn Đảo, ngày {dayjs().date()} tháng {dayjs().month() + 1} năm {dayjs().year()}
                 </div>
                 <Row gutter={24} style={{ textAlign: 'center', fontWeight: 'bold' }}>
                      <Col span={6}>
                         <Text strong>TỔ KỸ THUẬT</Text>
                         <div style={{ height: 100 }}></div>
                     </Col>
                     <Col span={6}>
                         <Text strong>TỔ VHTTBMĐ</Text>
                         <div style={{ height: 100 }}></div>
                     </Col>
                     <Col span={6}>
                         <Text strong>CÁN BỘ ĐỘI</Text>
                         <div style={{ height: 100 }}></div>
                     </Col>
                      <Col span={6}>
                         <Text strong>BAN GIÁM ĐỐC</Text>
                         <div style={{ height: 100 }}></div>
                     </Col>
                 </Row>
             </div>
        </Card>

         {/* CONTROLS (Hidden from print loop usually, but here for UI) */}
         <div style={{ background: '#f5f5f5', padding: '16px', marginTop: '24px', borderTop: '1px solid #d9d9d9', textAlign: 'right' }}>
               <Space>
                     <Button onClick={onClose}>Thoát</Button>
                     
                     <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => handleSubmit('approve')}>
                          Lưu phiếu
                     </Button>

                     {isManagerOrDirector && (
                         <>
                               <Button danger icon={<CloseOutlined />} onClick={() => {
                                   // ACTION is local only now for this button, logic handled via state or just direct call if simpler,
                                   // but keeping setRejectModalOpen is fine.
                                   setRejectModalOpen(true);
                                }}>
                                 Từ chối
                             </Button>
                             <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleSubmit('approve')}>
                                 Phê duyệt
                             </Button>
                         </>
                     )}
                 </Space>
         </div>
      </Modal>

      <Modal
        title="Từ chối kiểm nghiệm"
        open={rejectModalOpen}
        onOk={() => {
            handleSubmit('reject', reason);
            setRejectModalOpen(false);
        }}
        onCancel={() => setRejectModalOpen(false)}
    >
        <Typography.Paragraph>Vui lòng nhập lý do từ chối:</Typography.Paragraph>
         <TextArea rows={4} value={reason} onChange={e => setReason(e.target.value)} />
    </Modal>
    </>
  );
}

const MinusButton = ({ onClick }: { onClick: () => void }) => (
    <Button 
        type="text" 
        danger 
        size="small" 
        icon={<DeleteOutlined />} 
        onClick={onClick} 
    />
);
