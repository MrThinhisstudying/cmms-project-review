import React from "react";
import {
  Drawer,
  Typography,
  Button,
  Tag,
  Table,
  Space,
  Descriptions,
  Input,
  Modal,
  Steps,
  Collapse,
  Empty,
  Divider,
  Alert,
} from "antd";
import {
  PrinterOutlined,
  CheckCircleOutlined,
  CloseOutlined,
  LeftOutlined,
  RightOutlined,
  FilePdfOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useRepairsContext } from "../../../../context/RepairsContext/RepairsContext";
import { IRepair } from "../../../../types/repairs.types";

const { Title, Text } = Typography;
const { TextArea } = Input;

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
  onEditInspection?: () => void;
  onEditAcceptance?: () => void;
  currentUser?: any;
  onReview?: (action: "approve" | "reject", reason?: string, phase?: "request" | "inspection" | "acceptance") => void;
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
  onEditInspection,
  onEditAcceptance,
  currentUser,
  onReview,
}: RepairDetailDrawerProps) {
  const [rejectModalOpen, setRejectModalOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");

  // Logic Phase
  const currentPhase = React.useMemo(() => {
     if (!data) return 'request';
     if (data.status_request === 'REJECTED_B03' || data.status_request === 'REJECTED') return 'request'; // Stuck at request

     if (data.status_request !== 'COMPLETED') return 'request';
     
     if (data.status_inspection === 'REJECTED_B04' || data.status_inspection === 'inspection_rejected') return 'inspection'; // Stuck at inspection
     if (data.status_inspection !== 'inspection_admin_approved') return 'inspection';
     
     if (data.status_acceptance === 'REJECTED_B05' || data.status_acceptance === 'acceptance_rejected') return 'acceptance'; // Stuck at acceptance
     if (data.status_acceptance !== 'acceptance_admin_approved') return 'acceptance';
     
     return 'completed';
  }, [data]);

  const currentStep = React.useMemo(() => {
      // If rejected, we might want to stay on that step but color it red (handled by status='error' in Steps)
      switch(currentPhase) {
          case 'request': return 0;
          case 'inspection': return 1;
          case 'acceptance': return 2;
          case 'completed': return 3;
          default: return 0;
      }
  }, [currentPhase]);

  const stepStatus = React.useMemo(() => {
     if (currentPhase === 'request' && (data?.status_request === 'REJECTED_B03' || data?.status_request === 'REJECTED')) return 'error';
     if (currentPhase === 'inspection' && (data?.status_inspection === 'REJECTED_B04' || data?.status_inspection === 'inspection_rejected')) return 'error';
     if (currentPhase === 'acceptance' && (data?.status_acceptance === 'REJECTED_B05' || data?.status_acceptance === 'acceptance_rejected')) return 'error';
     return 'process';
  }, [currentPhase, data]);

  const submitReject = () => {
    onReview && onReview("reject", rejectReason, currentPhase as any);
    setRejectModalOpen(false);
    setRejectReason("");
  };

  const renderStatusTag = (status: string) => {
    const colorMap: Record<string, string> = {
      WAITING_TECH: "blue",
      WAITING_TEAM_LEAD: "blue",
      WAITING_DIRECTOR: "purple",
      REJECTED_B03: "red",
      COMPLETED: "green",

      inspection_pending: "purple",
      inspection_lead_approved: "warning",
      inspection_manager_approved: "cyan",
      inspection_admin_approved: "teal",
      REJECTED_B04: "red",

      acceptance_pending: "cyan",
      acceptance_lead_approved: "warning",
      acceptance_manager_approved: "cyan",
      acceptance_admin_approved: "green",
      REJECTED_B05: "red",
    };

    const labelMap: Record<string, string> = {
      WAITING_TECH: "Yêu cầu: Chờ KT tiếp nhận",
      WAITING_TEAM_LEAD: "Yêu cầu: Chờ Tổ trưởng duyệt", // Adjusted based on standard flow if needed, but usually B03
      WAITING_MANAGER: "Yêu cầu: Chờ CB đội duyệt",
      WAITING_DIRECTOR: "Yêu cầu: Chờ Ban GĐ duyệt",
      REJECTED_B03: "B03: Đã từ chối",
      REJECTED: "Đã hủy",
      COMPLETED: "Hoàn tất yêu cầu",

      inspection_pending: data?.inspection_created_at ? "Kiểm nghiệm: chờ CB tổ duyệt" : "Chờ kiểm nghiệm",
      inspection_lead_approved: "Kiểm nghiệm: Chờ CB đội duyệt", 
      inspection_manager_approved: "Kiểm nghiệm: chờ ban GĐ duyệt",
      inspection_admin_approved: "Hoàn tất kiểm nghiệm",
      REJECTED_B04: "B04: Đã từ chối",
      inspection_rejected: "B04: Đã từ chối",

      acceptance_pending: data?.acceptance_created_at ? "Nghiệm thu: Chờ CB tổ duyệt" : "Chờ nghiệm thu",
      acceptance_lead_approved: "Nghiệm thu: Chờ CB đội duyệt",
      acceptance_manager_approved: "Nghiệm thu: chờ ban GĐ duyệt",
      acceptance_admin_approved: "Hoàn tất nghiệm thu",
      REJECTED_B05: "B05: Đã từ chối",
      acceptance_rejected: "B05: Đã từ chối",
    };

    const color = colorMap[status] || "default";

    // Style for rejected status should be "error" (red) to match the alert/tag request
    if (status === 'REJECTED_B03' || status === 'REJECTED' || 
        status === 'REJECTED_B04' || status === 'inspection_rejected' ||
        status === 'REJECTED_B05' || status === 'acceptance_rejected') {
        return <Tag color="error">{labelMap[status] || status}</Tag>;
    }

    return (
      <Tag color={color}>
        {labelMap[status] || status}
      </Tag>
    );
  };

  const role = currentUser?.role;
  const canReviewAction = React.useMemo(() => {
      if (!data) return false;
      if (currentPhase === 'request') {
          return (role === 'ADMIN') ||
                 (role === 'TECHNICIAN' && data.status_request === 'WAITING_TECH') ||
                 (role === 'UNIT_HEAD' && data.status_request === 'WAITING_MANAGER') ||
                 (role === 'DIRECTOR' && data.status_request === 'WAITING_DIRECTOR');
      }
      if (currentPhase === 'inspection') {
          return (data.status_inspection === 'inspection_pending' && (role === 'TEAM_LEAD' || role === 'UNIT_HEAD')) ||
                 (data.status_inspection === 'inspection_lead_approved' && role === 'UNIT_HEAD') ||
                 (data.status_inspection === 'inspection_manager_approved' && (role === 'ADMIN' || role === 'DIRECTOR'));
      }
      if (currentPhase === 'acceptance') {
          return (data.status_acceptance === 'acceptance_pending' && (role === 'TEAM_LEAD' || role === 'UNIT_HEAD')) ||
                 (data.status_acceptance === 'acceptance_lead_approved' && role === 'UNIT_HEAD') ||
                 (data.status_acceptance === 'acceptance_manager_approved' && (role === 'ADMIN' || role === 'DIRECTOR'));
      }
      return false;
  }, [data, role, currentPhase]);

  // Redo Actions
  const showRedoB03 = (data?.status_request === 'REJECTED_B03' || data?.status_request === 'REJECTED') && (role === 'OPERATOR');
  // Only technician can redo B04/B05
  const showRedoB04 = (data?.status_inspection === 'REJECTED_B04' || data?.status_inspection === 'inspection_rejected') && (role === 'TECHNICIAN' || role === 'ADMIN');
  const showRedoB05 = (data?.status_acceptance === 'REJECTED_B05' || data?.status_acceptance === 'acceptance_rejected') && (role === 'TECHNICIAN' || role === 'ADMIN');

  // --- Limited Use Logic ---
  const { requestLimitedUseItem, reviewLimitedUseItem } = useRepairsContext();
  const [limitedUseReason, setLimitedUseReason] = React.useState("");
  const [limitedUseModalOpen, setLimitedUseModalOpen] = React.useState(false);
  
  const showRequestLimitedUse = data && !data.canceled && 
                                (!data.limited_use_status || data.limited_use_status === 'REJECTED') &&
                                (data.status_request === 'COMPLETED') && // Must be approved request
                                (data.status_inspection !== 'inspection_admin_approved') && // Not yet finished inspection completely (or inspection_pending specific?) User said: "phiếu kiểm nghiệm chưa được duyệt".
                                (role === 'OPERATOR');
  
  const showReviewLimitedUse = data && data.limited_use_status === 'PENDING' && 
                               (role === 'UNIT_HEAD' || role === 'ADMIN' || role === 'DIRECTOR') &&
                               data.status_request === 'COMPLETED';

  const handleRequestLimitedUse = async () => {
    if (!limitedUseReason.trim()) return;
    try {
        if(data) await requestLimitedUseItem(data.repair_id, limitedUseReason);
        setLimitedUseModalOpen(false);
        setLimitedUseReason("");
    } catch (e) { console.error(e); }
  };

  const renderLimitedUseTag = () => {
      if (!data) return null;
      if (data.limited_use_status === 'APPROVED') return <Tag color="success">SDHC: Đã duyệt</Tag>;
      if (data.limited_use_status === 'REJECTED') return <Tag color="error">SDHC: Từ chối</Tag>;
      return null;
  };

  if (!data) return null;

  // --- Render Helpers ---
  const renderB03 = () => (
      <div>
          <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Thiết bị">{data.device?.name}</Descriptions.Item>
              <Descriptions.Item label="Biển số">{data.device?.reg_number}</Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                  {renderStatusTag(data.status_request)}
              </Descriptions.Item>
              <Descriptions.Item label="Người lập">
                  {data.created_by?.name}
                  <br/>
                  <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(data.created_at).format('HH:mm DD/MM/YYYY')}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tình trạng hư hỏng" span={2}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{data.location_issue}</div>
              </Descriptions.Item>
              {data.recommendation && (
                  <Descriptions.Item label="Kiến nghị / Giải pháp" span={2}>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{data.recommendation}</div>
                  </Descriptions.Item>
              )}
          </Descriptions>
      </div>
  );

  const renderB04 = () => {
      if(!data.inspection_created_at && !data.inspection_items?.length && data.status_inspection !== 'REJECTED_B04' && data.status_inspection !== 'inspection_rejected') return <Empty description="Chưa có biên bản kiểm nghiệm" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
      
      const inspectionCols = [
          { title: "Mô tả", dataIndex: "description", key: "desc" },
          { title: "Nguyên nhân", dataIndex: "cause", key: "cause" },
          { title: "Biện pháp", dataIndex: "solution", key: "sol" },
      ];

      const dataSource = (data.inspection_materials || []).map((m: any, index: number) => ({
          ...m,
          key: m.item_id || index,
          formatted_specs: m.specifications || m.code || m.item_code || (m.item_id ? `MA-${m.item_id}` : ""),
          formatted_qty: `${m.quantity} ${m.unit || ''}`
      }));

      const materialCols = [
          { title: "Tên vật tư", dataIndex: "item_name", key: "name" },
          { title: "Quy cách, mã số", dataIndex: "formatted_specs", key: "specifications" },
          { title: "Số lượng", dataIndex: "formatted_qty", key: "qty" },
          { title: "Ghi chú", dataIndex: "notes", key: "notes" },
      ];

      return (
          <Space direction="vertical" style={{ width: '100%' }}>
              <Descriptions size="small" column={2} bordered>
                   <Descriptions.Item label="Thành phần kiểm nghiệm" span={2}>
                       {data.inspection_committee?.map(u => {
                           let position = u.role || '';
                           if(position === 'OPERATOR') position = 'Nhân viên vận hành';
                           else if(position === 'TECHNICIAN') position = 'Nhân viên kỹ thuật';
                           else if(position === 'TEAM_LEAD') position = 'Tổ trưởng';
                           else if(position === 'UNIT_HEAD') position = 'Cán bộ đội';
                           else if(position === 'DIRECTOR') position = 'Ban Giám đốc';
                           else if(position === 'ADMIN') position = 'Quản trị viên';
                           return `${u.name}${position ? ` - ${position}` : ''}`;
                       }).join(", ")}
                   </Descriptions.Item>
                  <Descriptions.Item label="Ngày kiểm">{data.inspection_created_at ? dayjs(data.inspection_created_at).format("DD/MM/YYYY") : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">{renderStatusTag(data.status_inspection || '')}</Descriptions.Item>
              </Descriptions>
              
              <Divider orientation={"left" as any} style={{ margin: '12px 0' }}>Nội dung kiểm tra</Divider>
              <Table dataSource={data.inspection_items || []} columns={inspectionCols} pagination={false} size="small" bordered rowKey="id" />

              <Divider orientation={"left" as any} style={{ margin: '12px 0' }}>Vật tư dự kiến</Divider>
              <Table dataSource={dataSource} columns={materialCols} pagination={false} size="small" bordered rowKey="key" />
          </Space>
      );
  };

  const renderB05 = () => {
      if(!data.acceptance_created_at && data.status_acceptance !== 'REJECTED_B05' && data.status_acceptance !== 'acceptance_rejected') return <Empty description="Chưa có biên bản nghiệm thu" image={Empty.PRESENTED_IMAGE_SIMPLE} />;

      // Combine material tables logic
      // Merge items by name
      const mergedMap = new Map<string, any>();

      // 1. Replacements
      data.inspection_materials?.forEach((m: any, i: number) => {
          const name = m.item_name || m.name || "Unknown";
          if (!mergedMap.has(name)) {
              mergedMap.set(name, {
                  key: `mat_${i}`,
                  item_name: name,
                  unit: m.unit,
                  quantity: m.quantity, // Replace Qty
                  recover_qty: '-',
                  scrap_qty: '-',
                  recover_damage: '-',
                  scrap_damage: '-',
              });
          } else {
             // If duplicate name, sum up? Or assume unique? Let's assume unique or take first.
             const ex = mergedMap.get(name);
             ex.quantity = (ex.quantity || 0) + (m.quantity || 0);
          }
      });

      // 2. Recovered
      data.recovered_materials?.forEach((m: any) => {
          const name = m.name || "Unknown";
          if (mergedMap.has(name)) {
              const ex = mergedMap.get(name);
              ex.recover_qty = m.quantity;
              ex.recover_damage = m.damage_percentage !== undefined ? `${m.damage_percentage}%` : '-';
          } else {
              // Standalone recovery (unlikely but possible)
               mergedMap.set(name, {
                  key: `rec_${name}`,
                  item_name: name,
                  unit: m.unit,
                  quantity: '-',
                  recover_qty: m.quantity,
                  recover_damage: m.damage_percentage !== undefined ? `${m.damage_percentage}%` : '-',
                  scrap_qty: '-',
                  scrap_damage: '-',
              });
          }
      });

      // 3. Scrap
      data.materials_to_scrap?.forEach((m: any) => {
          const name = m.name || "Unknown";
          if (mergedMap.has(name)) {
              const ex = mergedMap.get(name);
              ex.scrap_qty = m.quantity;
              ex.scrap_damage = m.damage_percentage !== undefined ? `${m.damage_percentage}%` : '-';
          } else {
               mergedMap.set(name, {
                  key: `scr_${name}`,
                  item_name: name,
                  unit: m.unit,
                  quantity: '-',
                  recover_qty: '-',
                  recover_damage: '-',
                  scrap_qty: m.quantity,
                  scrap_damage: m.damage_percentage !== undefined ? `${m.damage_percentage}%` : '-',
              });
          }
      });
      
      const finalMats = Array.from(mergedMap.values());

      const matCols = [
          { title: 'Loại', dataIndex: 'type', render: (t: string) => <Tag color={t==='Thay thế'?'blue':t==='Thu hồi'?'orange':'red'}>{t}</Tag> },
          { title: 'Tên vật tư', dataIndex: 'item_name' },
          { title: 'SL', dataIndex: 'quantity' },
          { title: 'ĐVT', dataIndex: 'unit' },
          { title: 'Ghi chú', dataIndex: 'notes' }
      ];

      return (
          <Space direction="vertical" style={{ width: '100%' }}>
              <Descriptions size="small" column={2} bordered>
                  <Descriptions.Item label="Thành phần nghiệm thu" span={2}>
                      {data.acceptance_committee?.map(u => `${u.name}${u.position ? ` - ${u.position}` : ''}`).join(", ")}
                  </Descriptions.Item>
                  <Descriptions.Item label="Ngày nghiệm thu">{data.acceptance_created_at ? dayjs(data.acceptance_created_at).format("DD/MM/YYYY") : '-'}</Descriptions.Item>
                  <Descriptions.Item label="Trạng thái">{renderStatusTag(data.status_acceptance || '')}</Descriptions.Item>
                  <Descriptions.Item label="Mô tả sự cố hỏng hóc" span={2}>{data.failure_description}</Descriptions.Item>
                  <Descriptions.Item label="Xác định nguyên nhân hỏng hóc" span={2}>{data.failure_cause}</Descriptions.Item>
                  <Descriptions.Item label="Kết luận" span={2}>{data.acceptance_note}</Descriptions.Item>
              </Descriptions>

              <Divider orientation={"left" as any} style={{ margin: '12px 0' }}>Vật tư thực tế</Divider>
              <Table 
                dataSource={finalMats} 
                pagination={false} 
                size="small" 
                bordered 
                rowKey="key"
                columns={[
                    { title: 'Stt', width: 50, align: 'center', render: (_, __, index) => index + 1 },
                    {
                        title: 'Vật tư thay thế',
                        children: [
                            { title: 'Tên', dataIndex: 'item_name', width: 150 },
                            { title: 'ĐVT', dataIndex: 'unit', width: 60 },
                            { title: 'SL', dataIndex: 'quantity', width: 60, align: 'center' },
                        ]
                    },
                    {
                         title: <div style={{textAlign: 'center'}}>Vật tư thu hồi<br/><i>Recovered Material</i></div>,
                        children: [
                            { title: 'SL', dataIndex: 'recover_qty', width: 60, align: 'center', render: (val, record) => val || '-' },
                            { title: '% hư hỏng', dataIndex: 'recover_damage', width: 80, align: 'center', render: (val, record) => val || '-' },
                        ]
                    },
                    {
                        title: <div style={{textAlign: 'center'}}>Vật tư xin hủy<br/><i>Material for Disposal</i></div>,
                        children: [
                            { title: 'SL', dataIndex: 'scrap_qty', width: 60, align: 'center', render: (val, record) => val || '-' },
                            { title: '% hư hỏng', dataIndex: 'scrap_damage', width: 80, align: 'center', render: (val, record) => val || '-' },
                        ]
                    }
                ]}
              />
          </Space>
      );
  };

  const items = [
      {
          key: '1',
          label: <Space>I. PHIẾU YÊU CẦU (B03) {(data.status_request === 'REJECTED_B03' || data.status_request === 'REJECTED') && <Tag color="red">Từ chối</Tag>}</Space>,
          children: (
            <div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                 <Button 
                        size="small" 
                        icon={<PrinterOutlined />} 
                        onClick={() => onExport && onExport('request')}
                     >
                        Xuất phiếu B03
                     </Button>
                </div>
                {renderB03()}
            </div>
          ),
      },
      (data.status_request === 'COMPLETED' || data.inspection_created_at || data.status_inspection === 'REJECTED_B04' || data.status_inspection === 'inspection_rejected') && {
          key: '2',
          label: <Space>II. BIÊN BẢN KIỂM NGHIỆM (B04) {(data.status_inspection === 'REJECTED_B04' || data.status_inspection === 'inspection_rejected') && <Tag color="red">Từ chối</Tag>}</Space>,
          children: (
            <div>
                 {data.status_inspection === 'inspection_admin_approved' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <Button 
                            size="small" 
                            icon={<PrinterOutlined />} 
                            onClick={() => onExport && onExport('inspection')}
                        >
                            Xuất phiếu B04
                        </Button>
                    </div>
                 )}
            {renderB04()}
            </div>
        ),
      },
      (data.acceptance_created_at || data.status_inspection === 'inspection_admin_approved' || data.status_acceptance === 'REJECTED_B05' || data.status_acceptance === 'acceptance_rejected') && {
          key: '3',
          label: <Space>III. BIÊN BẢN NGHIỆM THU (B05) {(data.status_acceptance === 'REJECTED_B05' || data.status_acceptance === 'acceptance_rejected') && <Tag color="red">Từ chối</Tag>}</Space>,
          children: (
            <div>
                {data.status_acceptance === 'acceptance_admin_approved' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
                        <Button 
                            size="small" 
                            icon={<PrinterOutlined />} 
                            onClick={() => onExport && onExport('acceptance')}
                        >
                            Xuất phiếu B05
                        </Button>
                    </div>
                 )}
                {renderB05()}
            </div>
        ),
      }
  ].filter(Boolean);

  const rejectedStatus = 
    (data.status_request === 'REJECTED_B03' || data.status_request === 'REJECTED') ? 'REJECTED_B03' : 
    (data.status_inspection === 'REJECTED_B04' || data.status_inspection === 'inspection_rejected') ? 'REJECTED_B04' :
    (data.status_acceptance === 'REJECTED_B05' || data.status_acceptance === 'acceptance_rejected') ? 'REJECTED_B05' : null;

  return (
    <>
    <Drawer
      title={
        <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Space direction="vertical" size={2}>
                    <Title level={4} style={{ margin: 0 }}>Chi tiết phiếu #{data.repair_id}</Title>
                    <Space>
                    {renderStatusTag(currentPhase === 'completed' ? 'COMPLETED' : 
                                        ((currentPhase === 'acceptance' || data.status_acceptance==='REJECTED_B05' || data.status_acceptance==='acceptance_rejected') ? data.status_acceptance! : 
                                        (currentPhase === 'inspection' || data.status_inspection==='REJECTED_B04' || data.status_inspection==='inspection_rejected') ? data.status_inspection! : 
                                        data.status_request))}
                    {renderLimitedUseTag()}
                    </Space>
                </Space>
                
                <Space>
                    {(hasPrev || hasNext) && (
                        <Button.Group>
                            <Button icon={<LeftOutlined />} onClick={onPrev} disabled={!hasPrev} />
                            <Button icon={<RightOutlined />} onClick={onNext} disabled={!hasNext} />
                        </Button.Group>
                    )}
                </Space>
            </div>
            
            {rejectedStatus && (
                <Alert 
                    message={`Phiếu bị từ chối bởi: ${data.rejected_by?.name || 'Unknown'}${data.rejected_by?.position ? ` - ${data.rejected_by.position}` : ''}`}
                    description={`Lý do: ${data.rejection_reason}`}
                    type="error"
                    showIcon
                    style={{ marginTop: 8 }}
                />
            )}
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={open}
      width={900}
      extra={
        <Space>
            {showRequestLimitedUse && (
                <Button onClick={() => setLimitedUseModalOpen(true)}>Xin SDHC</Button>
            )}
            {showReviewLimitedUse && (
                <>
                   {/* Removed per user request */}
                </>
            )}
            {canExport && !data.canceled && !rejectedStatus && (
                <Button icon={<PrinterOutlined />} onClick={() => onExport && onExport(currentPhase as any)}>
                    In phiếu
                </Button>
            )}
        </Space>
      }
      footer={
        <div style={{ textAlign: "right" }}>
            <Space>
                <Button onClick={onClose}>Đóng</Button>
                
                {/* REDO BUTTONS */}
                {showRedoB03 && (
                    <Button type="primary" danger ghost onClick={onEdit}>Sửa lại phiếu yêu cầu</Button>
                )}
                {showRedoB04 && (
                    <Button type="primary" danger ghost onClick={onEditInspection}>Sửa lại phiếu kiểm nghiệm (B04)</Button>
                )}
                {showRedoB05 && (
                    <Button type="primary" danger ghost onClick={onEditAcceptance}>Sửa lại phiếu nghiệm thu (B05)</Button>
                )}

                {canReviewAction && (
                    <>
                        {(() => {
                            const isVHTTBMD = currentUser?.department?.name === 'Tổ VHTTBMĐ';
                            // Disable only if Team Lead is required (Step 1 of Inspection/Acceptance) but user is not in VHTTBMD
                            const isApprovalDisabled = role === 'TEAM_LEAD' && 
                                                      ((currentPhase === 'inspection' && data.status_inspection === 'inspection_pending') || 
                                                       (currentPhase === 'acceptance' && data.status_acceptance === 'acceptance_pending')) && 
                                                      !isVHTTBMD;

                            const approveBtn = (
                                <Button 
                                    type="primary" 
                                    icon={<CheckCircleOutlined />} 
                                    onClick={() => onReview && onReview("approve", undefined, currentPhase as any)}
                                    disabled={isApprovalDisabled}
                                >
                                    Duyệt phiếu
                                </Button>
                            );

                            return (
                                <Space>
                                    <Button danger icon={<CloseOutlined />} onClick={() => setRejectModalOpen(true)} disabled={isApprovalDisabled}>
                                        Từ chối phiếu
                                    </Button>
                                    {isApprovalDisabled ? (
                                        <div title="Chỉ Tổ trưởng thuộc Tổ VHTTBMĐ mới có quyền duyệt phiếu này">
                                            {approveBtn}
                                        </div>
                                    ) : approveBtn}
                                    {/* Consolidated print not yet supported by backend */}
                                </Space>
                            );
                        })()}
                    </>
                )}
            </Space>
        </div>
      }
    >
      <div style={{ paddingBottom: 20 }}>
          <Steps
              current={currentStep}
              status={stepStatus}
              items={[
                  { title: 'Yêu cầu (B03)' },
                  { title: 'Kiểm nghiệm (B04)' },
                  { title: 'Nghiệm thu (B05)' },
                  { title: 'Hoàn thành' },
              ]}
              style={{ marginBottom: 24 }}
              size="small"
          />
          
          <Collapse defaultActiveKey={['1', '2', '3']} items={items as any} />
      </div>
    </Drawer>

    <Modal
        title="Từ chối phiếu"
        open={rejectModalOpen}
        onOk={submitReject}
        onCancel={() => setRejectModalOpen(false)}
    >
        <p>Vui lòng nhập lý do từ chối:</p>
        <TextArea rows={4} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
    </Modal>

    <Modal
        title="Xin sử dụng hạn chế"
        open={limitedUseModalOpen}
        onOk={handleRequestLimitedUse}
        onCancel={() => setLimitedUseModalOpen(false)}
    >
        <p>Lý do xin sử dụng hạn chế:</p>
        <TextArea rows={4} value={limitedUseReason} onChange={(e) => setLimitedUseReason(e.target.value)} />
    </Modal>
    </>
  );
}
