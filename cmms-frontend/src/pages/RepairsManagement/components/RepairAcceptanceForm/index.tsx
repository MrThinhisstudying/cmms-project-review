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
  Divider,
  InputNumber,
  Form,
  Card
} from "antd";
import {
  SaveOutlined,
  CloseOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  PrinterOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import {
  IRepair,
  RepairAcceptancePayload,
  IMaterial,
} from "../../../../types/repairs.types";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";
import { useAuthContext } from "../../../../context/AuthContext/AuthContext";

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ExtendedMaterial {
  key: string;
  name: string;
  unit: string;

  // Replacement (from Inspection or Added)
  replace_qty: number;

  // Recovered
  recover_qty: number;
  recover_damage: number;

  // Scrap
  scrap_qty: number;
  scrap_damage: number;

  is_new_row?: boolean;
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

  // --- STATE ---
  const [failureDescription, setFailureDescription] = useState("");
  const [failureCause, setFailureCause] = useState("");
  const [materials, setMaterials] = useState<ExtendedMaterial[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [otherOpinions, setOtherOpinions] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [location, setLocation] = useState("");

  // --- INIT ---
  useEffect(() => {
    console.log("RepairAcceptanceForm mounted/updated (B06 Template)", { open, initialData });
    if (open && initialData) {
      // Committee
      const initialCommittee = initialData.acceptance_committee?.map(u => ({
          user_id: u.user_id,
          name: u.name,
          role: u.role
      })) || [];
       if (initialCommittee.length === 0) {
        initialCommittee.push({ user_id: undefined, name: '', role: '' });
        initialCommittee.push({ user_id: undefined, name: '', role: '' });
      }
      form.setFieldsValue({ committee: initialCommittee });

      setFailureDescription(initialData.failure_description || "");
      setFailureCause(initialData.failure_cause || "");
      // Default conclusion text from image
      setConclusion(initialData.acceptance_note || "Sau khi tiến hành sửa chữa, xe hoạt động ổn định và an toàn.");
      setOtherOpinions(initialData.acceptance_other_opinions || "");
      // Initial location attempt: mapping to location_coordinates as requested
      setLocation(initialData.device.location_coordinates || "");

      // Merge Materials
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
    }
  }, [open, initialData, form]);

  // --- ACTIONS ---
  const handleAddNewMaterial = () => {
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
    };
    setMaterials([...materials, newMat]);
  };

  const updateMaterial = (
    key: string,
    field: keyof ExtendedMaterial,
    value: any
  ) => {
    setMaterials((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m))
    );
  };

  const removeMaterial = (key: string) => {
    setMaterials((prev) => prev.filter((m) => m.key !== key));
  };

  const handleFinalSubmit = async (
    action: "approve" | "reject",
    rejectionReason?: string
  ) => {
    const recovered_materials: IMaterial[] = materials
      .filter((m) => m.recover_qty > 0)
      .map((m) => ({
        name: m.name,
        unit: m.unit,
        quantity: m.recover_qty,
        damage_percentage: m.recover_damage,
      }));

    const materials_to_scrap: IMaterial[] = materials
      .filter((m) => m.scrap_qty > 0)
      .map((m) => ({
        name: m.name,
        unit: m.unit,
        quantity: m.scrap_qty,
        damage_percentage: m.scrap_damage,
      }));

    // Committee
    const formValues = form.getFieldsValue();
    const committeeMembers = formValues.committee || [];
    const committeeIds = committeeMembers.map((c: any) => c.user_id).filter((id: number) => !!id);

    const payload: RepairAcceptancePayload = {
      acceptance_note: conclusion,
      acceptance_committee_ids: committeeIds,
      action: action,
      reason: rejectionReason,
      failure_cause: failureCause,
      failure_description: failureDescription,
      recovered_materials,
      materials_to_scrap,
      acceptance_other_opinions: otherOpinions,
    };

    await onSubmit(payload);
  };

  // --- PERMISSIONS / ROLES ---
  const isManagerOrDirector =
    currentUser?.role === "manager" || currentUser?.role === "admin";
  const isCreator = currentUser?.user_id === initialData.created_by?.user_id;
  
  // Safety
  if (!initialData) return null;

  // --- COLUMNS ---
  const columns: any = [
    {
      title: "Stt",
      key: "index",
      render: (_: any, __: any, index: number) => index + 1,
      width: 50,
      align: "center",
    },
    {
      title: "Vật tư thay thế",
      children: [
        {
          title: "Tên",
          dataIndex: "name",
          key: "name",
          render: (text: string, record: ExtendedMaterial) => (
            <Input
              value={text}
              onChange={(e) =>
                updateMaterial(record.key, "name", e.target.value)
              }
              variant="borderless"
              placeholder="Nhập tên..."
              disabled={!record.is_new_row}
            />
          ),
        },
        {
          title: "ĐV",
          dataIndex: "unit",
          key: "unit",
          width: 60,
           align: "center",
          render: (text: string, record: ExtendedMaterial) => (
            <Input
              value={text}
              onChange={(e) =>
                updateMaterial(record.key, "unit", e.target.value)
              }
              variant="borderless"
              disabled={!record.is_new_row}
              style={{ textAlign: 'center' }}
            />
          ),
        },
        {
          title: "SL",
          dataIndex: "replace_qty",
          key: "replace_qty",
          width: 60,
          align: "center",
          render: (val: number, record: ExtendedMaterial) => (
            <InputNumber
              min={0}
              value={val}
              onChange={(v) => updateMaterial(record.key, "replace_qty", v)}
              variant="borderless"
              disabled={!record.is_new_row}
              controls={false}
              style={{ textAlign: 'center' }}
            />
          ),
        },
      ],
    },
    {
      title: "Vật tư thu hồi",
      children: [
        {
          title: "SL",
          dataIndex: "recover_qty",
          key: "recover_qty",
          width: 60,
          align: "center",
          render: (val: number, record: ExtendedMaterial) => (
            <InputNumber
              min={0}
              value={val}
              onChange={(v) => updateMaterial(record.key, "recover_qty", v)}
              variant="borderless"
              controls={false}
              style={{ textAlign: 'center' }}
            />
          ),
        },
        {
          title: "% hư hỏng",
          dataIndex: "recover_damage",
          key: "recover_damage",
          width: 90,
          align: "center",
          render: (val: number, record: ExtendedMaterial) => (
             <Input 
                value={val}
                onChange={e => updateMaterial(record.key, "recover_damage", e.target.value)}
                variant="borderless"
                style={{ textAlign: 'center' }}
            />
          ),
        },
      ],
    },
    {
      title: "Vật tư xin hủy",
      children: [
        {
          title: "SL",
          dataIndex: "scrap_qty",
          key: "scrap_qty",
          width: 60,
          align: "center",
          render: (val: number, record: ExtendedMaterial) => (
            <InputNumber
              min={0}
              value={val}
              onChange={(v) => updateMaterial(record.key, "scrap_qty", v)}
              variant="borderless"
              controls={false}
              style={{ textAlign: 'center' }}
            />
          ),
        },
        {
          title: "% hư hỏng",
          dataIndex: "scrap_damage",
          key: "scrap_damage",
          width: 90,
          align: "center",
           render: (val: number, record: ExtendedMaterial) => (
             <Input 
                value={val}
                onChange={e => updateMaterial(record.key, "scrap_damage", e.target.value)}
                variant="borderless"
                style={{ textAlign: 'center' }}
            />
          ),
        },
      ],
    },
    {
      title: "",
      key: "action",
      width: 40,
      render: (_: any, record: ExtendedMaterial) =>
        record.is_new_row && (
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => removeMaterial(record.key)}
          />
        ),
    },
  ];

  return (
    <>
      <Modal
        open={open}
        onCancel={onClose}
        width={1000}
        style={{ top: 20 }}
        title={null}
        footer={null}
        className="repair-acceptance-modal"
      >
        <Card bordered={false} styles={{ body: { padding: "40px 50px" } }} style={{ minHeight: "800px", fontFamily: '"Times New Roman", Times, serif', fontSize: '16px' }}>
          
           {/* HEADER */}
           <div style={{ textAlign: "center", marginBottom: 32 }}>
               <Title level={3} style={{ margin: 0, textTransform: "uppercase" }}>
                   BIÊN BẢN NGHIỆM THU SỬA CHỮA - BẢO DƯỠNG
               </Title>
               <div style={{ marginTop: 8, fontStyle: 'italic' }}>
                   Căn cứ: Theo nội dung yêu cầu sửa chữa ................................................................
               </div>
           </div>

           {/* I. PHẦN TỔNG QUÁT */}
           <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold' }}>I. PHẦN TỔNG QUÁT:</Title>
                
                {/* 1. Lý lịch thiết bị */}
                <div style={{ paddingLeft: 10 }}>
                    <Text strong>1. Lý lịch thiết bị:</Text>
                    <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr>
                                <td style={{ padding: '4px 0', width: '200px' }}>- Tên thiết bị:</td>
                                <td>{initialData.device?.name || "..."}</td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0' }}>- Biển số đăng ký:</td>
                                <td>{initialData.device?.serial_number || "..."}</td>
                            </tr>
                             <tr>
                                <td style={{ padding: '4px 0' }}>- Nơi đặt:</td>
                                <td>
                                    <Input 
                                        value={location} 
                                        onChange={e => setLocation(e.target.value)} 
                                        variant="borderless" 
                                        style={{ width: '100%', padding: 0 }} 
                                    />
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '4px 0' }}>- Đơn vị quản lý:</td>
                                <td>{initialData.device?.using_department || "..."}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 2. Thành phần kiểm tra */}
                <div style={{ paddingLeft: 10, marginTop: 16 }}>
                    <Text strong>2. Thành phần kiểm tra:</Text>
                    <Form form={form} component={false}>
                        <Form.List name="committee">
                            {(fields, { add, remove }) => (
                            <table style={{ width: '100%', marginTop: 8 }}>
                                <tbody>
                                    {fields.map(({ key, name, ...restField }, index) => (
                                    <tr key={key}>
                                        <td style={{ padding: '4px 8px 4px 0', width: '60%', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>{index + 1}. Ông:</span>
                                                <Form.Item {...restField} name={[name, 'user_id']} style={{ margin: 0, flex: 1 }}>
                                                    <Select 
                                                        placeholder="................................................................................................................................" 
                                                        variant="borderless" 
                                                        style={{ width: '100%', borderBottom: '1px dotted #ccc' }}
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
                                            </div>
                                        </td>
                                        <td style={{ padding: '4px 0', width: '40%', verticalAlign: 'middle' }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                <span style={{ whiteSpace: 'nowrap', marginRight: 8 }}>Chức vụ:</span>
                                                <Form.Item {...restField} name={[name, 'role']} style={{ margin: 0, flex: 1 }}>
                                                    <Input variant="borderless" style={{ borderBottom: '1px dotted #ccc', width: '100%' }} placeholder="..................................................................................................." />
                                                </Form.Item>
                                            </div>
                                        </td>
                                        <td style={{ width: 30, verticalAlign: 'middle' }}>
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
                 <div style={{ paddingLeft: 10, marginTop: 16 }}>
                    <Text strong>3. Thời gian nghiệm thu:</Text> 
                    <Input 
                        defaultValue={dayjs().format('HH:mm DD/MM/YYYY')}
                        style={{ width: 200, marginLeft: 8 }} 
                        variant="borderless" 
                    />
                </div>
            </div>

            {/* II. NỘI DUNG NGHIỆM THU */}
             <div style={{ marginBottom: 24 }}>
                <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold' }}>II. NỘI DUNG NGHIỆM THU:</Title>
                
                {/* 1. Mô tả sự cố */}
                 <div style={{ paddingLeft: 10, marginTop: 8 }}>
                    <Text strong>1. Mô tả sự cố hỏng hóc:</Text>
                    <TextArea 
                        value={failureDescription} 
                        onChange={e => setFailureDescription(e.target.value)} 
                        autoSize={{ minRows: 3 }} 
                        variant="borderless" 
                        style={{ marginTop: 4 }}
                        placeholder="..................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................."
                    />
                </div>

                {/* 2. Nguyên nhân */}
                 <div style={{ paddingLeft: 10, marginTop: 16 }}>
                    <Text strong>2. Xác định nguyên nhân hỏng hóc:</Text>
                    <TextArea 
                        value={failureCause} 
                        onChange={e => setFailureCause(e.target.value)} 
                        autoSize={{ minRows: 3 }} 
                        variant="borderless" 
                        style={{ marginTop: 4 }}
                        placeholder="..................................................................................................................................................................................................................................................................................................................................................................................................................................................................................................."
                    />
                </div>

                {/* 3. Vật tư */}
                <div style={{ paddingLeft: 10, marginTop: 24 }}>
                    <Row justify="space-between" align="middle">
                        <Col><Text strong>3. Vật tư cần thay thế: <span style={{ fontWeight: 'normal', fontStyle: 'italic' }}>(Ghi rõ chủng loại, số lượng vật tư, phụ tùng cần thay thế, kèm phiếu đề nghị vật tư)</span></Text></Col>
                         <Col><Button size="small" type="dashed" icon={<PlusOutlined />} onClick={handleAddNewMaterial}>Thêm vật tư</Button></Col>
                    </Row>
                    
                    <Table
                        dataSource={materials}
                        columns={columns}
                        pagination={false}
                        bordered
                        size="small"
                        rowKey="key"
                        style={{ marginTop: 8 }}
                    />
                </div>
             </div>

             {/* III. KẾT LUẬN */}
            <div style={{ marginBottom: 24 }}>
                 <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold' }}>III. KẾT LUẬN:</Title>
                 <TextArea 
                    value={conclusion} 
                    onChange={e => setConclusion(e.target.value)} 
                    placeholder="Kết luận..." 
                    autoSize={{ minRows: 2 }} 
                    variant="borderless" 
                    style={{ marginTop: 4, width: '100%' }}
                />
            </div>

             {/* IV. Ý KIẾN KHÁC */}
             <div style={{ marginBottom: 32 }}>
                 <Title level={5} style={{ fontSize: '16px', fontWeight: 'bold' }}>IV. CÁC Ý KIẾN KHÁC NẾU CÓ:</Title>
                 <TextArea 
                    value={otherOpinions} 
                    onChange={e => setOtherOpinions(e.target.value)} 
                    placeholder="......................................................................................................................................................................" 
                    autoSize={{ minRows: 2 }} 
                    variant="borderless" 
                    style={{ marginTop: 4 }} 
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

        {/* CONTROLS */}
        <div style={{ background: '#f5f5f5', padding: '16px', marginTop: '24px', borderTop: '1px solid #d9d9d9', textAlign: 'right' }}>
               <Space>
                     <Button onClick={onClose}>Thoát</Button>
                     {/* CREATOR SAVE / RESUBMIT */}
                     {(isCreator || !isManagerOrDirector) && (
                         <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={() => handleFinalSubmit('approve')}>
                             Lưu phiếu
                         </Button>
                     )}
 
                     {/* MANAGER APPROVE / REJECT */}
                     {isManagerOrDirector && (
                         <>
                               <Button danger icon={<CloseOutlined />} onClick={() => setRejectModalOpen(true)}>
                                 Từ chối
                             </Button>
                             <Button type="primary" icon={<CheckCircleOutlined />} onClick={() => handleFinalSubmit('approve')}>
                                 Phê duyệt
                             </Button>
                         </>
                     )}
                 </Space>
         </div>
      </Modal>

      <Modal
        title="Từ chối nghiệm thu"
        open={rejectModalOpen}
        onOk={() => {
          handleFinalSubmit("reject", rejectReason);
          setRejectModalOpen(false);
        }}
        onCancel={() => setRejectModalOpen(false)}
      >
        <Typography.Paragraph>Vui lòng nhập lý do từ chối:</Typography.Paragraph>
        <TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
        />
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
