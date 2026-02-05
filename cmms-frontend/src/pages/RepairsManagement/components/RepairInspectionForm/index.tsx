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
  Descriptions
} from "antd";
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckCircleOutlined
} from "@ant-design/icons";
import {
  IRepair,
  RepairInspectionPayload,
  IInspectionMaterial,
} from "../../../../types/repairs.types";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";

const { Title, Text } = Typography;
const { TextArea } = Input;

// Simplified Material Type for Section III (Expected Materials)
interface ExtendedInspectionMaterial {
  key: string;
  item_id?: number | null;
  name: string;
  unit: string;
  specifications?: string;
  quantity: number;
  item_code?: string;
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
  
  // Watch committee to smart filter
  const committee = Form.useWatch('committee', form) || [];
  const selectedUserIds = Array.isArray(committee) ? committee.map((c: any) => c?.user_id).filter(Boolean) : [];

  // --- STATE ---
  const [materials, setMaterials] = useState<ExtendedInspectionMaterial[]>([]);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [reason, setReason] = useState("");

  // --- INIT ---
  useEffect(() => {
    if (!open || !initialData) return;

    // 1. Committee
    const roleMap: Record<string, string> = {
        'TECHNICIAN': 'Nhân viên kỹ thuật',
        'TEAM_LEAD': 'Tổ trưởng',
        'UNIT_HEAD': 'Đội trưởng',
        'DIRECTOR': 'Ban Giám đốc',
        'OPERATOR': 'Nhân viên vận hành',
        'ADMIN': 'Quản lý'
    };

    const initialCommittee = initialData.inspection_committee?.map(u => ({
        user_id: u.user_id,
        name: u.name,
        role: roleMap[u.role] || u.role // Map raw role to friendly name
    })) || [];
    // Ensure at least 1 empty row if empty
    if (initialCommittee.length === 0) {
        initialCommittee.push({ user_id: undefined, name: '', role: '' });
    }

    // 2. Inspection Items
    const initInspectionItems = initialData.inspection_items && initialData.inspection_items.length > 0
        ? initialData.inspection_items.map(item => ({
            description: item.description || "",
            cause: item.cause || "",
            solution: item.solution || "",
            notes: item.notes || ""
          }))
        : [{ description: "", cause: "", solution: "", notes: "" }];

    // 3. Materials
    const existingMats = initialData.inspection_materials || [];
    const mappedMats: ExtendedInspectionMaterial[] = existingMats.map((m, idx) => ({
      key: `exist_${idx}`,
      item_id: m.item_id || null,
      name: m.item_name || (m.item_id ? items.find(i => i.item_id === m.item_id)?.name || "Unknown Item" : ""),
      unit: m.unit || (m.item_id ? items.find(i => i.item_id === m.item_id)?.quantity_unit || "" : ""),
      item_code: m.item_code || (m.item_id ? items.find(i => i.code === m.item_code)?.code || "" : ""),
      specifications: m.specifications || "",
      quantity: m.quantity || 0,
      is_new: !!m.is_new,
      notes: m.notes || "",
    }));
    
    setMaterials(mappedMats);

    form.setFieldsValue({
        committee: initialCommittee,
        inspection_items: initInspectionItems,
        inspection_other_opinions: initialData.inspection_other_opinions || ""
    });
    setReason("");
  }, [open, initialData, items, form]);

  // --- ACTIONS ---
  
  // Smart Options for Users
  const getUserOptions = (currentUserId?: number) => {
      const excludedRoles = ['TEAM_LEAD', 'UNIT_HEAD', 'ADMIN', 'DIRECTOR'];
      const excludedDepts = ['Ban giám đốc'];
      
      const options = users.filter(u => {
          if (u.user_id === currentUserId) return true; // always allow current selection
          if (selectedUserIds.includes(u.user_id)) return false; // exclude already selected
          
          if (excludedRoles.includes(u.role)) return false;
          if (u.department?.name && excludedDepts.includes(u.department.name)) return false;
          
          return true;
      }).map(u => ({ label: u.name, value: u.user_id, position: u.position }));
      return options;
  };

  // Materials Logic (Kept Local State for Table complexity handling)
  const handleAddNewMaterialRow = () => {
    const newMat: ExtendedInspectionMaterial = {
      key: `new_${Date.now()}`,
      item_id: null,
      name: "",
      unit: "",
      quantity: 1,
      is_new: false, 
      notes: "",
      specifications: ""
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
             specifications: selectedItem?.code || "",
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

  const handleFinalSubmit = async (finalAction: "approve" | "reject") => {
     try {
         const values = await form.validateFields();
         
         const committeeIds = values.committee.map((c: any) => c.user_id).filter((id: number) => !!id);

         const payloadMaterials: IInspectionMaterial[] = materials.map(m => ({
             item_id: m.item_id || undefined,
             item_name: m.name,
             quantity: m.quantity,
             unit: m.unit,
             specifications: m.specifications,
             item_code: m.item_code,
             is_new: !m.item_id,
             notes: m.notes
         }));

         const payload: RepairInspectionPayload = {
            inspection_materials: finalAction === 'approve' ? payloadMaterials : [],
            inspection_committee_ids: committeeIds,
            action: finalAction,
            reason: finalAction === 'reject' ? reason : undefined,
            inspection_items: values.inspection_items || [],
            inspection_other_opinions: values.inspection_other_opinions?.trim() || undefined,
         };

         await onSubmit(payload);
     } catch (e) {
         console.error("Validation failed", e);
     }
  };

  // Permissions
  // Role 'OPERATOR' (Group Lead) included in Approvers
  const canApprove = currentUser?.role === 'UNIT_HEAD' || currentUser?.role === 'ADMIN' || currentUser?.role === 'DIRECTOR' || currentUser?.role === 'TEAM_LEAD' || currentUser?.role === 'OPERATOR';
  const canModify = currentUser?.role === 'TECHNICIAN' || currentUser?.role === 'ADMIN';

  if (!initialData) return null;

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width={900}
        centered
        title={
            <div style={{ textAlign: "center", marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>KẾT QUẢ KIỂM TRA KỸ THUẬT (B04)</Title>
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
             {/* I. PHẦN TỔNG QUÁT */}
             <Typography.Title level={5}>I. PHẦN TỔNG QUÁT</Typography.Title>
             
             {/* 1. Device Info */}
             <div style={{ marginLeft: 16, marginBottom: 24 }}>
                 <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>1. Lý lịch thiết bị</Typography.Text>
                 <Descriptions bordered size="small" column={2}>
                        <Descriptions.Item label="Tên thiết bị" span={3}>{initialData.device?.name}</Descriptions.Item>
                        <Descriptions.Item label="Số đăng ký">{initialData.device?.reg_number || initialData.device?.serial_number}</Descriptions.Item>
                        <Descriptions.Item label="Đơn vị quản lý tài sản" span={2}>{initialData.device?.using_department || initialData.created_department?.name || "N/A"}</Descriptions.Item>
                    <Descriptions.Item label="Số giờ/km hoạt động" span={2}>
                        <Space>
                            <Input style={{ width: 120 }} placeholder="Km 000000" bordered={false} className="border-bottom-input" />
                            <Input style={{ width: 120 }} placeholder="Giờ 000000" bordered={false} className="border-bottom-input" />
                        </Space>
                    </Descriptions.Item>
                 </Descriptions>
             </div>

             {/* 2. Committee */}
             <div style={{ marginLeft: 16, marginBottom: 24 }}>
                 <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>2. Thành phần kiểm nghiệm</Typography.Text>
                 <Form.List name="committee">
                    {(fields, { add, remove }) => (
                        <div>
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
                                                onChange={(val, option: any) => {
                                                const usersArr = form.getFieldValue('committee') || [];
                                                if(usersArr[name]) {
                                                    // Use friendly name first, fallback to position provided by backend, else raw
                                                    const rawRole = option.position || ''; 
                                                    // Simple map if position is system-like (e.g. capitalized english)
                                                    const roleMap: Record<string, string> = {
                                                        'TECHNICIAN': 'Nhân viên kỹ thuật',
                                                        'TEAM_LEAD': 'Tổ trưởng',
                                                        'UNIT_HEAD': 'Đội trưởng',
                                                        'DIRECTOR': 'Ban Giám đốc',
                                                        'OPERATOR': 'Nhân viên vận hành',
                                                        'ADMIN': 'Quản lý'
                                                    };
                                                    // Try to map if it looks like a system role key, otherwise use as is
                                                    const displayRole = roleMap[rawRole] || (roleMap[val] ? roleMap[val] : rawRole);
                                                    
                                                    usersArr[name].role = displayRole;
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
             </div>

             {/* II. INSPECTION CONTENT */}
             <Typography.Title level={5}>II. NỘI DUNG KIỂM NGHIỆM</Typography.Title>
             <Form.List name="inspection_items">
                {(fields, { add, remove }) => (
                    <div style={{ marginBottom: 24 }}>
                        {fields.map(({ key, name, ...restField }) => (
                           <div key={key} style={{ background: '#fafafa', padding: 12, marginBottom: 12, borderRadius: 8, border: '1px solid #f0f0f0' }}>
                               <Row gutter={16}>
                                   <Col span={24}>
                                       <Form.Item {...restField} name={[name, 'description']} label="Mô tả hư hỏng" rules={[{ required: true, message: 'Nhập mô tả' }]}>
                                           <Input.TextArea autoSize={{ minRows: 1 }} placeholder="Mô tả..." />
                                       </Form.Item>
                                   </Col>
                                   <Col span={8}>
                                       <Form.Item {...restField} name={[name, 'cause']} label={
                                            <Space>
                                                <span>Nguyên nhân hư hỏng</span>
                                                {name === 0 && (
                                                    <Button 
                                                        type="link" 
                                                        size="small" 
                                                        style={{ padding: 0, fontSize: 11 }}
                                                        onClick={() => {
                                                            const items = form.getFieldValue('inspection_items') || [];
                                                            if (items.length > 0) {
                                                                const firstVal = items[0].cause;
                                                                const newItems = items.map((it: any) => ({ ...it, cause: firstVal }));
                                                                form.setFieldsValue({ inspection_items: newItems });
                                                            }
                                                        }}
                                                    >
                                                        (Áp dụng tất cả)
                                                    </Button>
                                                )}
                                            </Space>
                                       }>
                                           <Input.TextArea autoSize={{ minRows: 1 }} />
                                       </Form.Item>
                                   </Col>
                                   <Col span={8}>
                                       <Form.Item {...restField} name={[name, 'solution']} label={
                                            <Space>
                                                <span>Biện pháp sửa chữa</span>
                                                {name === 0 && (
                                                    <Button 
                                                        type="link" 
                                                        size="small" 
                                                        style={{ padding: 0, fontSize: 11 }}
                                                        onClick={() => {
                                                            const items = form.getFieldValue('inspection_items') || [];
                                                            if (items.length > 0) {
                                                                const firstVal = items[0].solution;
                                                                const newItems = items.map((it: any) => ({ ...it, solution: firstVal }));
                                                                form.setFieldsValue({ inspection_items: newItems });
                                                            }
                                                        }}
                                                    >
                                                        (Áp dụng tất cả)
                                                    </Button>
                                                )}
                                            </Space>
                                       }>
                                           <Input.TextArea autoSize={{ minRows: 1 }} />
                                       </Form.Item>
                                   </Col>
                                   <Col span={8}>
                                       <Form.Item {...restField} name={[name, 'notes']} label="Ghi chú">
                                           <Input.TextArea autoSize={{ minRows: 1 }} />
                                       </Form.Item>
                                   </Col>
                                   <Col span={24} style={{ textAlign: 'right' }}>
                                       <Button danger size="small" type="text" onClick={() => remove(name)} icon={<DeleteOutlined />}>Xóa dòng</Button>
                                   </Col>
                               </Row>
                           </div>
                        ))}
                        <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                            Thêm nội dung kiểm nghiệm
                        </Button>
                    </div>
                )}
             </Form.List>

             {/* III. MATERIALS */}
             <Typography.Title level={5}>III. PHẦN ĐỀ NGHỊ CUNG CẤP VẬT TƯ</Typography.Title>
             <Table
                dataSource={materials}
                pagination={false}
                size="small"
                rowKey="key"
                bordered
                footer={() => <Button type="dashed" size="small" onClick={handleAddNewMaterialRow} icon={<PlusOutlined />}>Thêm vật tư</Button>}
                columns={[
                    { title: 'Tên vật tư, phụ tùng cần thay thế', dataIndex: 'name', width: '35%', render: (_: string, record: ExtendedInspectionMaterial) => (
                         <Space direction="vertical" style={{ width: '100%' }} size={0}>
                            <Select
                                style={{ width: '100%' }}
                                placeholder="Chọn từ kho..."
                                value={record.item_id}
                                onChange={(val) => updateMaterial(record.key, 'item_id', val)}
                                allowClear
                                showSearch
                                optionFilterProp="children"
                            >
                                {items.map(it => <Select.Option key={it.item_id} value={it.item_id} disabled={it.quantity < 1}>{it.name} (Tồn: {it.quantity})</Select.Option>)}
                            </Select>
                            {!record.item_id && (
                                <Input 
                                    placeholder="Nhập vật tư ngoài..." 
                                    value={record.name} 
                                    onChange={e => updateMaterial(record.key, 'name', e.target.value)} 
                                    style={{ marginTop: 4 }} 
                                />
                            )}
                         </Space>
                    )},
                    { title: 'Quy cách, mã số', dataIndex: 'specifications', width: 100, render: (val: string, record: ExtendedInspectionMaterial) => (
                         <Input value={val} onChange={e => updateMaterial(record.key, 'specifications', e.target.value)} placeholder="Quy cách..." />
                    )},
                    { title: 'ĐVT', dataIndex: 'unit', width: 80, render: (val: string, record: ExtendedInspectionMaterial) => (
                         <Input value={val} onChange={e => updateMaterial(record.key, 'unit', e.target.value)} placeholder="ĐVT" />
                    )},
                    { title: 'Số lượng', dataIndex: 'quantity', width: 100, render: (val: number, record: ExtendedInspectionMaterial) => (
                         <InputNumber min={1} value={val} onChange={v => updateMaterial(record.key, 'quantity', v)} style={{ width: '100%' }} />
                    )},
                    { title: 'Ghi chú', dataIndex: 'notes', render: (val: string, record: ExtendedInspectionMaterial) => (
                         <Input.TextArea autoSize value={val} onChange={e => updateMaterial(record.key, 'notes', e.target.value)} />
                    )},
                    { title: '', width: 50, render: (_: any, record: ExtendedInspectionMaterial) => (
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeMaterial(record.key)} />
                    )}
                ]}
                style={{ marginBottom: 24 }}
             />

             {/* IV. OTHER OPINIONS */}
             <Typography.Title level={5}>IV. CÁC Ý KIẾN KHÁC (nếu có)</Typography.Title>
             <Form.Item name="inspection_other_opinions">
                 <TextArea rows={3} placeholder="...." />
             </Form.Item>

              {/* MERGE OPTION */}
              <div style={{ marginTop: 10, marginBottom: 20, background: '#f6ffed', padding: 10, borderRadius: 6, border: '1px solid #b7eb8f' }}>
                    <Form.Item name="merge_cells" valuePropName="checked" initialValue={true} style={{ marginBottom: 0 }}>
                        <Typography.Text strong>
                             <CheckCircleOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                             <input type="checkbox" style={{ marginRight: 8 }} />
                             Gộp ô "Nguyên nhân" và "Biện pháp" nếu giống nhau (In PDF B04)
                        </Typography.Text>
                    </Form.Item>
                    <div style={{ marginLeft: 28, fontSize: 12, color: '#666' }}>
                        (Nếu bỏ chọn, mỗi dòng hư hỏng sẽ in kèm nguyên nhân và biện pháp riêng biệt, không gộp ô)
                    </div>
              </div>

        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Từ chối kiểm nghiệm"
        open={rejectModalOpen}
        onOk={() => {
            handleFinalSubmit('reject');
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
