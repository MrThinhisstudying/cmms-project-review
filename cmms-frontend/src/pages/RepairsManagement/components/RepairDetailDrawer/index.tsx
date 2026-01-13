import React from "react";
import {
  Drawer,
  Typography,
  Button,
  Tag,
  Table,
  Space,
  Row,
  Col,
  Card,
  Descriptions,
  Input,
  Modal,
} from "antd";
import {
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  PrinterOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { IRepair } from "../../../../types/repairs.types";

const { Title, Text, Paragraph } = Typography;

interface RepairDetailDrawerProps {
  open: boolean;
  data: IRepair | null;
  onClose: () => void;
  onExport?: (type: "request" | "inspection" | "acceptance") => void;
  canExport?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
  onEdit?: () => void;
  currentUser?: any;
  onReview?: (action: "approve" | "reject", reason?: string) => void;
}

export default function RepairDetailDrawer({
  open,
  data,
  onClose,
  onExport,
  canExport = false,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  onEdit,
  currentUser,
  onReview,
}: RepairDetailDrawerProps) {
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  if (!data) return null;

  const isCreator = currentUser?.user_id === data.created_by?.user_id;

  const submitReject = () => {
    onReview && onReview("reject", rejectReason);
    setRejectModalOpen(false);
    setRejectReason("");
  };

  const renderStatusTag = (status: string) => {
    const colorMap: Record<string, string> = {
      WAITING_TECH: "orange",
      WAITING_TEAM_LEAD: "blue",
      WAITING_DIRECTOR: "purple",
      REJECTED: "red",
      COMPLETED: "green",

      inspection_pending: "purple",
      inspection_manager_approved: "cyan",
      inspection_admin_approved: "teal",
      inspection_rejected: "red",

      acceptance_pending: "cyan",
      acceptance_manager_approved: "cyan",
      acceptance_admin_approved: "green",
      acceptance_rejected: "red",
    };

    const labelMap: Record<string, string> = {
      WAITING_TECH: "Chờ kỹ thuật duyệt",
      WAITING_TEAM_LEAD: "Chờ cán bộ đội duyệt",
      WAITING_DIRECTOR: "Chờ ban giám đốc duyệt",
      REJECTED: "Từ chối",
      COMPLETED: "Hoàn thành",

      inspection_pending: "Đang kiểm nghiệm kỹ thuật",
      inspection_manager_approved: "Kiểm nghiệm – Chờ Ban Giám đốc duyệt",
      inspection_admin_approved: "Hoàn tất kiểm nghiệm",
      inspection_rejected: "Từ chối kiểm nghiệm",

      acceptance_pending: "Đang nghiệm thu thiết bị",
      acceptance_manager_approved: "Nghiệm thu – Chờ Ban Giám đốc duyệt",
      acceptance_admin_approved: "Hoàn tất toàn bộ quy trình",
      acceptance_rejected: "Từ chối nghiệm thu",
    };

    return (
      <Tag color={colorMap[status] || "default"}>
        {labelMap[status] || status}
      </Tag>
    );
  };

  const materialColumns = [
    {
      title: "STT",
      key: "index",
      render: (_: any, __: any, index: number) => index + 1,
      width: 50,
    },
    {
      title: "Tên vật tư",
      dataIndex: "item_name",
      key: "item_name",
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text || `Vật tư #${record.item_id}`}</Text>
          {record.item_code && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Mã: {record.item_code}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "SL",
      dataIndex: "quantity",
      key: "quantity",
      align: "center" as const,
      width: 60,
    },
    {
      title: "ĐVT",
      dataIndex: "unit",
      key: "unit",
      width: 60,
    },
    {
        title: "Nguồn",
        key: "is_new",
        render: (_:any, r:any) => r.is_new ? <Tag color="orange">Mua mới</Tag> : <Tag color="blue">Kho</Tag>
    }
  ];
  
  const canReviewAction = (currentUser?.role === 'manager' || currentUser?.role === 'admin') && 
                          (data.status_request === 'WAITING_TECH' || data.status_request === 'WAITING_TEAM_LEAD' || data.status_request === 'WAITING_DIRECTOR');

  const renderAcceptanceMaterials = () => {
      // 1. Replacement Materials (from inspection_materials)
      const replacements = data.inspection_materials?.map((m, i) => ({
          key: `rep_${i}`,
          type: 'Thay thế',
          name: m.item_name,
          unit: m.unit,
          qty: m.quantity,
          status: m.is_new ? 'Mua mới' : 'Kho',
          note: ''
      })) || [];

      // 2. Recovered Materials
      const recovered = data.recovered_materials?.map((m, i) => ({
          key: `rec_${i}`,
          type: 'Thu hồi',
          name: 'Vật tư thu hồi',
          unit: m.unit,
          qty: m.quantity,
          status: `${m.damage_percentage}% hư hỏng`,
          note: ''
      })) || [];

      // 3. Scrap Materials
      const scrap = data.materials_to_scrap?.map((m, i) => ({
          key: `scr_${i}`,
          type: 'Xin hủy',
          name: 'Vật tư xin hủy',
          unit: m.unit,
          qty: m.quantity,
          status: `${m.damage_percentage}% hư hỏng`,
          note: ''
      })) || [];

      const dataSource = [...replacements, ...recovered, ...scrap];
      
      const columns = [
          { title: 'Loại', dataIndex: 'type', key: 'type', width: 100, render: (t: string) => <Tag color={t === 'Thay thế' ? 'blue' : t === 'Thu hồi' ? 'orange' : 'red'}>{t}</Tag> },
          { title: 'Tên vật tư', dataIndex: 'name', key: 'name' },
          { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
          { title: 'SL', dataIndex: 'qty', key: 'qty', width: 60, align: 'center' as const },
          { title: 'Trạng thái / Nguồn', dataIndex: 'status', key: 'status' },
      ];

      return (
          <Table 
              dataSource={dataSource} 
              columns={columns} 
              pagination={false} 
              size="small" 
              bordered
              summary={(pageData) => {
                  if(pageData.length === 0) return null;
                  return (
                      <Table.Summary.Row>
                          <Table.Summary.Cell index={0} colSpan={5}>
                              <Text type="secondary" italic>Tổng số: {pageData.length} mục</Text>
                          </Table.Summary.Cell>
                      </Table.Summary.Row>
                  )
              }}
          />
      );
  };

  return (
    <>
    <Drawer
      open={open}
      onClose={onClose}
      width={720}
      title={
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={0}>
              <Title level={5} style={{ margin: 0 }}>
                CHI TIẾT PHIẾU SỬA CHỮA
              </Title>
              <Text type="secondary">#{data.repair_id}</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<LeftOutlined />}
                onClick={onPrev}
                disabled={!hasPrev}
              />
              <Button
                icon={<RightOutlined />}
                onClick={onNext}
                disabled={!hasNext}
              />
            </Space>
          </Col>
        </Row>
      }
      extra={
        <Space>
            {isCreator && (data.status_request === 'WAITING_TECH' || data.status_request === 'REJECTED') && (
                <Button onClick={onEdit}>
                    {data.status_request === 'REJECTED' ? 'Gửi lại' : 'Chỉnh sửa'}
                </Button>
            )}
            
            {/* Action Buttons for Approvers/Processors */}
            {canReviewAction && (
                <>
                  <Button type="primary" onClick={() => onReview && onReview("approve")}>
                    Duyệt phiếu
                  </Button>
                  <Button danger onClick={() => setRejectModalOpen(true)}>
                    Từ chối phiếu
                  </Button>
                </>
            )}

            {canExport && (
                 <Button icon={<PrinterOutlined />} onClick={() => onExport?.("request")}>In phiếu</Button>
            )}
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* SECTION 1: DEVICE INFO */}
        <Card size="small" title="I. THÔNG TIN THIẾT BỊ">
          <Descriptions column={1} bordered size="small" styles={{ label: { fontWeight: "bold", width: "160px" } }}>
            <Descriptions.Item label="Tên thiết bị">
              <Text strong>{data.device?.name || "—"}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Mã/Model">
              {data.device?.brand} - {data.device?.serial_number}
            </Descriptions.Item>
            <Descriptions.Item label="Đơn vị quản lý">
               {data.device?.using_department || data.created_department?.name || "—"}
            </Descriptions.Item>
             <Descriptions.Item label="Người lập phiếu">
               {data.created_by?.name} - {dayjs(data.created_at).format("DD/MM/YYYY HH:mm")}
            </Descriptions.Item>
             <Descriptions.Item label="Trạng thái">
               {renderStatusTag(data.status_request)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* SECTION 2: REPAIR REQUEST (COMBINED) */}
        <Card size="small" title="II. YÊU CẦU SỬA CHỮA">
             <Descriptions column={1} bordered size="small" styles={{ label: { fontWeight: "bold", width: "160px" } }}>
                <Descriptions.Item label="Tình trạng hư hỏng">
                    <div style={{ whiteSpace: 'pre-wrap' }}>{data.location_issue || "—"}</div>
                    {data.failure_description && (
                         <div style={{ marginTop: 8, fontStyle: 'italic', color: '#666' }}>
                            (Chi tiết: {data.failure_description})
                         </div>
                    )}
                </Descriptions.Item>
                <Descriptions.Item label="Kiến nghị / Giải pháp">
                    <div style={{ whiteSpace: 'pre-wrap' }}>{data.recommendation || "—"}</div>
                </Descriptions.Item>
             </Descriptions>
        </Card>

        {/* SECTION 3: INSPECTION RESULT (B04) */}
        {/* Only show if Request is COMPLETED and Inspection is NOT pending (or has data) */}
        {data.status_request === 'COMPLETED' && (data.status_inspection !== 'inspection_pending' || (data.inspection_items && data.inspection_items.length > 0)) && (
            <Card size="small" title="III. KẾT QUẢ KIỂM TRA KỸ THUẬT (B04)">
                <div style={{ marginBottom: 16 }}>
                    <Space>
                        <Text strong>Trạng thái:</Text>
                        {renderStatusTag(data.status_inspection)}
                    </Space>
                </div>
                
                {data.inspection_items?.map((item, idx) => (
                    <Card type="inner" size="small" key={idx} style={{ marginBottom: 8, background: '#fafafa' }}>
                        <Text strong>• Hạng mục {idx + 1}: {item.description}</Text>
                        <div style={{ marginLeft: 16, marginTop: 4 }}>
                            <div><Text type="secondary">Nguyên nhân:</Text> {item.cause}</div>
                            <div><Text type="secondary">Giải pháp:</Text> {item.solution}</div>
                        </div>
                    </Card>
                ))}

                {data.inspection_materials?.length > 0 && (
                     <div style={{ marginTop: 16 }}>
                        <Text strong style={{ display: 'block', marginBottom: 8 }}>Vật tư dự kiến thay thế:</Text>
                        <Table
                            dataSource={data.inspection_materials}
                            columns={materialColumns}
                            pagination={false}
                            size="small"
                            rowKey="item_id"
                            bordered
                        />
                     </div>
                )}
                
                {data.approved_by_manager_inspection && (
                     <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Duyệt bởi: {data.approved_by_manager_inspection.name}
                        </Text>
                     </div>
                )}
            </Card>
        )}

        {/* SECTION 4: ACCEPTANCE RESULT (B06) */}
        {/* Only show if Inspection is Approved and Acceptance is NOT pending (or has data) */}
        {data.status_inspection === 'inspection_admin_approved' && (data.status_acceptance !== 'acceptance_pending' || (data.acceptance_committee && data.acceptance_committee.length > 0)) && (
             <Card size="small" title="IV. KẾT QUẢ NGHIỆM THU (B06)" style={{ borderColor: '#1890ff' }}>
                <div style={{ marginBottom: 16 }}>
                    <Space>
                        <Text strong>Trạng thái:</Text>
                        {renderStatusTag(data.status_acceptance)}
                    </Space>
                </div>

                {/* Committee */}
                {data.acceptance_committee && data.acceptance_committee.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                        <Text strong>Thành phần nghiệm thu:</Text>
                        <ul style={{ paddingLeft: 20, margin: '4px 0' }}>
                            {data.acceptance_committee.map((u, i) => (
                                <li key={i}>{u.name} - {u.role || 'Thành viên'}</li>
                            ))}
                        </ul>
                    </div>
                )}

                 {/* Failure Details (Final) */}
                 {(data.failure_description || data.failure_cause) && (
                     <Descriptions column={1} bordered size="small" style={{ marginBottom: 16 }}>
                        <Descriptions.Item label="Mô tả sự cố (Thực tế)">
                            {data.failure_description || "—"}
                        </Descriptions.Item>
                        <Descriptions.Item label="Nguyên nhân (Thực tế)">
                            {data.failure_cause || "—"}
                        </Descriptions.Item>
                     </Descriptions>
                 )}

                {/* Consolidated Material Table */}
                <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ display: 'block', marginBottom: 8 }}>Tổng hợp vật tư nghiệm thu:</Text>
                    {renderAcceptanceMaterials()}
                </div>

                {/* Conclusion */}
                <div style={{ background: '#f6ffed', padding: 12, borderRadius: 8, border: '1px solid #b7eb8f' }}>
                    <Text strong type="success">KẾT LUẬN:</Text>
                    <div style={{ marginTop: 4 }}>
                        {data.acceptance_note || "Sau khi tiến hành sửa chữa, xe hoạt động ổn định và an toàn."}
                    </div>
                </div>

                {data.acceptance_other_opinions && (
                    <div style={{ marginTop: 12 }}>
                        <Text strong>Ý kiến khác:</Text>
                        <Paragraph>{data.acceptance_other_opinions}</Paragraph>
                    </div>
                )}

                {data.approved_by_manager_acceptance && (
                     <div style={{ marginTop: 16, textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Duyệt bởi: {data.approved_by_manager_acceptance.name}
                        </Text>
                     </div>
                )}
             </Card>
        )}

        {canExport && (
             <Card size="small" title="Xuất biểu mẫu" style={{ background: '#f0f5ff' }}>
                <Space wrap>
                    <Button icon={<DownloadOutlined />} onClick={() => onExport?.("request")}>Xuất Yêu cầu (B03)</Button>
                    
                    {/* Only show Export Inspection if Inspection section is visible */}
                    {data.status_request === 'COMPLETED' && (data.status_inspection !== 'inspection_pending' || (data.inspection_items && data.inspection_items.length > 0)) && (
                        <Button icon={<DownloadOutlined />} onClick={() => onExport?.("inspection")}>Xuất Kiểm nghiệm (B04)</Button>
                    )}
                    
                    {/* Only show Export Acceptance if Acceptance section is visible */}
                    {data.status_inspection === 'inspection_admin_approved' && (data.status_acceptance !== 'acceptance_pending' || (data.acceptance_committee && data.acceptance_committee.length > 0)) && (
                        <Button icon={<DownloadOutlined />} onClick={() => onExport?.("acceptance")}>Xuất Nghiệm thu (B06)</Button>
                    )}
                </Space>
             </Card>
        )}

      </Space>
    </Drawer>
    <Modal
        title="Từ chối phiếu"
        open={rejectModalOpen}
        onOk={submitReject}
        onCancel={() => setRejectModalOpen(false)}
    >
        <Input.TextArea 
            rows={4} 
            placeholder="Nhập lý do từ chối..." 
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
        />
    </Modal>
    </>
  );
}
