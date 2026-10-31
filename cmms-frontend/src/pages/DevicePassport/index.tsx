import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Tag,
  Descriptions,
  Table,
  Button,
  Space,
  Row,
  Col,
  Alert,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Typography,
  notification,
  Avatar,
  Segmented,
  DatePicker,
  Pagination,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CarOutlined,
  ToolOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  ReloadOutlined,
  ArrowLeftOutlined,
  StarFilled,
  HomeOutlined,
  ApartmentOutlined,
  TeamOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ExclamationCircleOutlined,
  TableOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';

import { getDeviceById } from '../../apis/devices';
import { getMaintenancesByDevice, createMaintenanceTicket } from '../../apis/maintenance';
import { getRepairsByDevice, createRepair } from '../../apis/repairs';
import { getAllUsers } from '../../apis/users';
import { getDeviceGroup, IDeviceGroup } from '../../apis/device-groups';
import { IDevice } from '../../types/devicesManagement.types';
import { IMaintenance } from '../../types/maintenance.types';
import { IRepair } from '../../types/repairs.types';
import { IUser } from '../../types/user.types';
import { getToken } from '../../utils/auth';
import { renderMaintenanceStatusTag, isMaintenanceOverdue, getMaintenanceStatusInfo } from '../../utils/maintenanceDue';
import {
  getPreparedLicenseData,
  calculateLicenseStats,
  isRenewedRecord,
  getRenewedByRecord,
  LicenseItem,
} from '../../utils/deviceExpiries';
import { useAuthContext } from '../../context/AuthContext/AuthContext';
import TicketDetailModal from '../MaintenanceHistory/components/TicketDetailModal';
import EditMaintenanceDateModal from '../../components/EditMaintenanceDateModal';

const { Title, Text } = Typography;
const { TextArea } = Input;

const STATUS_CONFIG: Record<string, { label: string; color: string; tagColor: string }> = {
  MOI: { label: 'Mới tiếp nhận', color: '#1890ff', tagColor: 'blue' },
  DANG_SUA_CHUA: { label: 'Đang bảo dưỡng / Sửa chữa', color: '#f5222d', tagColor: 'error' },
  DANG_SU_DUNG: { label: 'Đang hoạt động / Sẵn sàng', color: '#52c41a', tagColor: 'success' },
  SU_DUNG_HAN_CHE: { label: 'Sử dụng hạn chế', color: '#fa8c16', tagColor: 'warning' },
  THANH_LY: { label: 'Đang thanh lý', color: '#8c8c8c', tagColor: 'default' },
  HUY_BO: { label: 'Hủy bỏ', color: '#ff4d4f', tagColor: 'error' },
};

const LEVEL_CONFIG: Record<string, { label: string; color: string }> = {
  Tuần: { label: 'Tuần', color: 'blue' },
  Week: { label: 'Tuần', color: 'blue' },
  '1M': { label: '01 Tháng', color: 'cyan' },
  '3M': { label: '03 Tháng', color: 'geekblue' },
  '6M': { label: '06 Tháng', color: 'purple' },
  '9M': { label: '09 Tháng', color: 'magenta' },
  '1Y': { label: '01 Năm', color: 'magenta' },
  '2Y': { label: '02 Năm', color: 'volcano' },
  '3_month': { label: '03 Tháng', color: 'geekblue' },
  '6_month': { label: '06 Tháng', color: 'purple' },
  '9_month': { label: '09 Tháng', color: 'magenta' },
  '12_month': { label: '01 Năm', color: 'magenta' },
  '24_month': { label: '02 Năm', color: 'volcano' },
};

const DevicePassportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [device, setDevice] = useState<IDevice | null>(null);
  const [deviceGroup, setDeviceGroup] = useState<IDeviceGroup | null>(null);
  const [maintenances, setMaintenances] = useState<IMaintenance[]>([]);
  const [repairs, setRepairs] = useState<IRepair[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);

  // Maintenance Sub-tab & Ticket Detail modal
  const [maintenanceSubTab, setMaintenanceSubTab] = useState<'plan' | 'completed' | 'all'>('plan');
  const [maintPage, setMaintPage] = useState(1);
  const maintPageSize = 10;
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);

  // Perform Maintenance state
  const [isPerformOpen, setIsPerformOpen] = useState(false);
  const [performRecord, setPerformRecord] = useState<any>(null);
  const [performDate, setPerformDate] = useState<dayjs.Dayjs | null>(dayjs());
  const [performing, setPerforming] = useState(false);

  // Edit Maintenance Date state
  const [isEditDateOpen, setIsEditDateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportForm] = Form.useForm();

  const deviceId = id ? Number(id) : null;

  const fetchData = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    const token = getToken();

    try {
      // 1. Fetch Device Detail
      const dev = await getDeviceById(deviceId, token);
      setDevice(dev);

      // 2. Fetch Maintenances & Repairs in parallel
      const [maintRes, repairRes] = await Promise.all([
        getMaintenancesByDevice(deviceId, token || '').catch(() => []),
        getRepairsByDevice(deviceId, token || '', { page: 1, limit: 15 }).catch(() => ({ repairs: [], total: 0 })),
      ]);

      setMaintenances(Array.isArray(maintRes) ? maintRes : []);
      setRepairs(repairRes.repairs || []);

      // 3. Process Group & Personnel (works for both logged-in and public QR scanning)
      let groupData: IDeviceGroup | null = (dev?.device_group as IDeviceGroup) || null;
      if (dev?.device_group?.id) {
        if (!groupData?.user_device_groups || groupData.user_device_groups.length === 0) {
          try {
            const fetchedGroup = await getDeviceGroup(dev.device_group.id);
            if (fetchedGroup) groupData = fetchedGroup;
          } catch (e) {
            console.error('Failed to getDeviceGroup:', e);
          }
        }
      }
      setDeviceGroup(groupData);

      if (groupData?.user_device_groups && groupData.user_device_groups.length > 0) {
        const leaderId = groupData.leader_id || groupData.leader?.user_id;
        const mappedUsers: IUser[] = groupData.user_device_groups
          .filter((udg: any) => udg && udg.user)
          .map((udg: any) => {
            const isLead = !!udg.is_group_lead || udg.user?.user_id === leaderId;
            return {
              ...udg.user,
              user_device_groups: [
                {
                  group_id: groupData!.id,
                  is_group_lead: isLead,
                  role_in_group: udg.role_in_group,
                },
              ],
            };
          });

        mappedUsers.sort((a, b) => {
          const aIsLead = a.user_device_groups?.[0]?.is_group_lead ? 1 : 0;
          const bIsLead = b.user_device_groups?.[0]?.is_group_lead ? 1 : 0;
          return bIsLead - aIsLead;
        });

        setUsers(mappedUsers);
      } else if (dev?.device_group?.id && token) {
        const groupUsers = await getAllUsers(token, { groupId: dev.device_group.id }).catch(() => []);
        setUsers(groupUsers || []);
      } else if (Array.isArray(dev?.users) && dev.users.length > 0) {
        setUsers(dev.users);
      } else {
        setUsers([]);
      }
    } catch (err: any) {
      console.error('Failed to load device passport:', err);
      notification.error({
        message: 'Không tìm thấy hồ sơ phương tiện',
        title: 'Lỗi',
        description: err?.message || 'Phương tiện không tồn tại hoặc đã bị xóa.',
      });
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Quick Issue Report submission
  const handleReportSubmit = async (values: any) => {
    if (!device?.device_id) return;
    const token = getToken();

    if (!token || !user) {
      notification.warning({
        message: 'Yêu cầu đăng nhập',
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập hệ thống để thực hiện báo hỏng phương tiện.',
      });
      navigate(`/dang_nhap?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setSubmittingReport(true);
    try {
      await createRepair(
        {
          device_id: device.device_id,
          location_issue: values.location_issue,
          recommendation: values.defect_description,
          note: values.note || '',
        },
        token
      );
      notification.success({
        message: 'Báo hỏng thành công',
        title: 'Đã gửi phiếu yêu cầu',
        description: 'Phiếu yêu cầu sửa chữa đã được chuyển tới Đội ngũ Kỹ thuật xem xét.',
      });
      setReportModalOpen(false);
      reportForm.resetFields();
      fetchData(); // Refresh list
    } catch (err: any) {
      notification.error({
        message: 'Gửi yêu cầu thất bại',
        title: 'Lỗi',
        description: err?.message || 'Có lỗi xảy ra khi tạo phiếu.',
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleOpenPerform = (record: any) => {
    const token = getToken();
    if (!token || !user) {
      notification.warning({
        message: 'Yêu cầu đăng nhập',
        title: 'Chưa đăng nhập',
        description: 'Vui lòng đăng nhập tài khoản kỹ thuật viên để thực hiện ghi nhận bảo dưỡng.',
      });
      navigate(`/dang_nhap?returnUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setPerformRecord(record);
    setPerformDate(dayjs());
    setIsPerformOpen(true);
  };

  const handleSavePerform = async () => {
    if (!device?.device_id || !performRecord) return;
    if (!performDate) {
      notification.error({
        message: 'Thiếu thông tin',
        title: 'Lỗi',
        description: 'Vui lòng chọn ngày thực hiện bảo dưỡng!',
      });
      return;
    }
    const token = getToken();
    setPerforming(true);
    try {
      const payload = {
        device_id: device.device_id,
        maintenance_id: performRecord?.maintenance_id,
        template_id: null,
        maintenance_level: performRecord.level,
        execution_date: performDate.hour(12).minute(0).second(0).toISOString(),
        checklist_result: [],
        working_hours: 0,
        execution_team: [],
      };
      await createMaintenanceTicket(token, payload);
      notification.success({
        message: 'Thành công',
        title: 'Đã hoàn thành bảo dưỡng',
        description: `Đã ghi nhận bảo dưỡng cấp độ ${performRecord.level} cho phương tiện!`,
      });
      setIsPerformOpen(false);
      fetchData();
    } catch (err: any) {
      notification.error({
        message: 'Thất bại',
        title: 'Lỗi',
        description: err.message || 'Không thể tạo phiếu và cập nhật bảo dưỡng.',
      });
    } finally {
      setPerforming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Đang tải Hồ sơ số phương tiện..." />
      </div>
    );
  }

  if (!device) {
    return (
      <div style={{ maxWidth: 800, margin: '60px auto', padding: '0 16px', textAlign: 'center' }}>
        <Empty
          description="Không tìm thấy dữ liệu phương tiện"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" icon={<HomeOutlined />} onClick={() => navigate('/quan_ly_ttb_pt')}>
            Quay lại danh sách thiết bị
          </Button>
        </Empty>
      </div>
    );
  }

  // Dữ liệu & Thống kê Giấy phép & Kiểm định kỹ thuật
  const licenseList = getPreparedLicenseData(device);
  const licenseStats = calculateLicenseStats(licenseList);

  const effectiveInspectionExpiry = licenseStats.latestExpiryDate || device.inspection_expiry;
  const inspectionExpiry = effectiveInspectionExpiry ? dayjs(effectiveInspectionExpiry) : null;
  const daysUntilInspection = inspectionExpiry ? inspectionExpiry.diff(dayjs().startOf('day'), 'days') : null;
  const isInspectionExpired = licenseStats.expiredCount > 0 || (daysUntilInspection !== null && daysUntilInspection < 0 && licenseStats.renewedCount === 0);
  const isInspectionExpiringSoon = !isInspectionExpired && ((daysUntilInspection !== null && daysUntilInspection <= 30) || licenseStats.expiringCount > 0);

  const currentStatus = STATUS_CONFIG[device.status || ''] || {
    label: device.status || 'Chưa xác định',
    color: '#8c8c8c',
    tagColor: 'default',
  };

  // --- TAB 1: LÝ LỊCH & THÔNG SỐ ---
  const renderProfileTab = () => (
    <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title="I. Thông tin nhận diện chung" style={{ borderRadius: 8 }}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 2 }}>
          <Descriptions.Item label="Tên trang thiết bị">{device.name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Mã TTB / Ký hiệu">{device.device_code || `TTB-${device.device_id}`}</Descriptions.Item>
          <Descriptions.Item label="Biển số đăng ký">{device.reg_number || 'Chưa đăng ký'}</Descriptions.Item>
          <Descriptions.Item label="Phân loại phương tiện">{device.deviceType?.name || 'NIL'}</Descriptions.Item>
          <Descriptions.Item label="Nhãn hiệu">{device.brand || '-'}</Descriptions.Item>
          <Descriptions.Item label="Số khung / Số máy">{device.serial_number || '-'}</Descriptions.Item>
          <Descriptions.Item label="Nước sản xuất">{device.country_of_origin || '-'}</Descriptions.Item>
          <Descriptions.Item label="Năm sản xuất">{device.manufacture_year || '-'}</Descriptions.Item>
          <Descriptions.Item label="Năm đưa vào sử dụng">{device.usage_start_year || '-'}</Descriptions.Item>
          <Descriptions.Item label="Đơn vị sử dụng">{device.using_department || '-'}</Descriptions.Item>
          <Descriptions.Item label="Mục đích sử dụng" span={2}>{device.usage_purpose || '-'}</Descriptions.Item>
          <Descriptions.Item label="Phạm vi hoạt động" span={2}>{device.operating_scope || '-'}</Descriptions.Item>
          <Descriptions.Item label="Vị trí / Tọa độ đặt">{device.location_coordinates || '-'}</Descriptions.Item>
          <Descriptions.Item label="Thời gian vận hành / ngày">{device.daily_operation_time || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card size="small" title="II. Thông số kỹ thuật & Kích thước" style={{ borderRadius: 8 }}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 2 }}>
          <Descriptions.Item label="Kích thước (D x R x C)">
            {device.length || 'NIL'} x {device.width || 'NIL'} x {device.height || 'NIL'} (mm)
          </Descriptions.Item>
          <Descriptions.Item label="Khối lượng bản thân">{device.weight ? `${device.weight} kg` : 'NIL'}</Descriptions.Item>
          <Descriptions.Item label="Nguồn năng lượng / Động cơ">{device.power_source || 'NIL'}</Descriptions.Item>
          <Descriptions.Item label="Công suất tiêu thụ">{device.power_consumption || 'NIL'}</Descriptions.Item>
          <Descriptions.Item label="Đặc điểm kỹ thuật khác" span={2}>{device.other_specifications || 'NIL'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Components Inventory if any */}
      {device.components_inventory && (
        <Card size="small" title="III. Phụ tùng kèm theo" style={{ borderRadius: 8 }}>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            {(Array.isArray(device.components_inventory) ? device.components_inventory : []).map((item: any, idx: number) => (
              <li key={idx} style={{ fontSize: 13, padding: '2px 0' }}>
                <strong>{item.name}</strong> - Số lượng: {item.qty} {item.unit}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Legal & Inspection records */}
      <Card size="small" title="IV. Hồ sơ pháp lý & Kiểm định" style={{ borderRadius: 8 }}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Hạn đăng kiểm">
            {device.inspection_expiry ? (
              <span style={{ color: isInspectionExpired ? '#f5222d' : isInspectionExpiringSoon ? '#fa8c16' : '#52c41a', fontWeight: 600 }}>
                {dayjs(device.inspection_expiry).format('DD/MM/YYYY')}{' '}
                {isInspectionExpired ? '(Đã hết hạn)' : isInspectionExpiringSoon ? `(Còn ${daysUntilInspection} ngày)` : '(Còn hạn)'}
              </span>
            ) : (
              'Chưa có dữ liệu'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Hạn bảo hiểm">
            {device.insurance_expiry ? dayjs(device.insurance_expiry).format('DD/MM/YYYY') : 'Chưa có dữ liệu'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Space>
  );

  // --- TAB 2: ĐƠN VỊ & NGƯỜI PHỤ TRÁCH ---
  const renderPersonnelTab = () => {
    const currentGroup = deviceGroup || device.device_group;
    const dept = currentGroup?.department;
    let parentTo: any = null;
    let parentDoi: any = null;

    if (dept) {
      if (dept.level === 'DOI') {
        parentDoi = dept;
      } else if (dept.level === 'TO') {
        parentTo = dept;
        parentDoi = dept.parent || null;
      } else {
        parentTo = dept;
        parentDoi = dept.parent || null;
      }
    }
    if (!parentDoi && device.using_department) {
      parentDoi = { name: device.using_department };
    }

    const groupLeader =
      currentGroup?.leader ||
      users.find((u) =>
        u.user_device_groups?.some((g) => g.group_id === currentGroup?.id && g.is_group_lead)
      );

    const personnelColumns = [
      {
        title: 'STT',
        key: 'idx',
        width: 50,
        align: 'center' as const,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Họ và tên',
        dataIndex: 'name',
        key: 'name',
        render: (text: string, record: IUser) => {
          const isLeader =
            record.user_id === groupLeader?.user_id ||
            record.user_device_groups?.some(
              (g) => g.group_id === currentGroup?.id && g.is_group_lead
            );
          return (
            <Space>
              <Avatar
                size="small"
                icon={<UserOutlined />}
                style={{ backgroundColor: isLeader ? '#faad14' : '#1890ff' }}
              />
              <span style={{ fontWeight: isLeader ? 600 : 400 }}>{text}</span>
              {isLeader && (
                <Tag color="gold" icon={<StarFilled />} style={{ fontSize: 11, padding: '0 6px' }}>
                  Nhóm trưởng
                </Tag>
              )}
            </Space>
          );
        },
      },
      {
        title: 'Vai trò trong nhóm',
        key: 'role_in_group',
        width: 170,
        render: (_: any, record: IUser) => {
          const isLeader =
            record.user_id === groupLeader?.user_id ||
            record.user_device_groups?.some(
              (g) => g.group_id === currentGroup?.id && g.is_group_lead
            );
          return isLeader ? (
            <Tag color="gold" style={{ fontWeight: 600 }}>⭐ Nhóm trưởng</Tag>
          ) : (
            <Tag color="cyan">Thành viên kỹ thuật</Tag>
          );
        },
      },
      {
        title: 'Số điện thoại',
        dataIndex: 'phone_number',
        key: 'phone',
        width: 140,
        render: (phone: string) =>
          phone ? (
            <Space size={4}>
              <PhoneOutlined style={{ color: '#52c41a' }} />
              <a href={`tel:${phone}`} style={{ color: '#52c41a', fontWeight: 500 }}>
                {phone}
              </a>
            </Space>
          ) : (
            <span style={{ color: '#ccc' }}>—</span>
          ),
      },
      {
        title: 'Email',
        dataIndex: 'email',
        key: 'email',
        render: (email: string) =>
          email ? (
            <Space size={4}>
              <MailOutlined style={{ color: '#1890ff' }} />
              <a href={`mailto:${email}`} style={{ color: '#1890ff', fontSize: 12 }}>
                {email}
              </a>
            </Space>
          ) : (
            <span style={{ color: '#ccc' }}>—</span>
          ),
      },
      {
        title: 'Chức vụ',
        dataIndex: 'position',
        key: 'position',
        width: 180,
        render: (val: any) => val || '—',
      },
      {
        title: 'Phòng ban / Đơn vị',
        key: 'dept',
        render: (_: any, record: IUser) =>
          record.department?.name || parentTo?.name || parentDoi?.name || '—',
      },
    ];

    return (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Banner Cơ cấu phân cấp quản lý */}
        <Card
          size="small"
          style={{
            background: currentGroup ? 'linear-gradient(135deg, #f6f8fc 0%, #eef2fe 100%)' : '#fffbe6',
            borderColor: currentGroup ? '#adc6ff' : '#ffe58f',
            borderRadius: 8,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: currentGroup ? '#1d39c4' : '#d48806', marginBottom: 6 }}>
            CƠ CẤU PHÂN CẤP QUẢN LÝ THIẾT BỊ
          </div>
          {currentGroup ? (
            <Space size={[16, 8]} wrap style={{ fontSize: 12 }}>
              <div>
                <ApartmentOutlined style={{ color: '#1890ff', marginRight: 4 }} />
                <span style={{ color: '#666' }}>Đội:</span>{' '}
                <strong>{parentDoi?.name || (parentTo?.parent_id ? 'Đội kỹ thuật' : (device.using_department || '—'))}</strong>
              </div>
              <div>
                <TeamOutlined style={{ color: '#13c2c2', marginRight: 4 }} />
                <span style={{ color: '#666' }}>Tổ trực thuộc:</span>{' '}
                <strong>{parentTo?.name || 'Chưa phân Tổ'}</strong>
              </div>
              <div>
                <ToolOutlined style={{ color: '#722ed1', marginRight: 4 }} />
                <span style={{ color: '#666' }}>Nhóm quản lý:</span>{' '}
                <Tag color="purple" style={{ fontWeight: 600, margin: 0 }}>
                  {currentGroup.name}
                </Tag>
              </div>
              {groupLeader && (
                <div>
                  <StarFilled style={{ color: '#faad14', marginRight: 4 }} />
                  <span style={{ color: '#666' }}>Nhóm trưởng:</span>{' '}
                  <strong style={{ color: '#d48806' }}>{groupLeader.name}</strong>
                  {groupLeader.phone_number && (
                    <a href={`tel:${groupLeader.phone_number}`} style={{ marginLeft: 6, color: '#52c41a' }}>
                      <PhoneOutlined /> {groupLeader.phone_number}
                    </a>
                  )}
                </div>
              )}
            </Space>
          ) : (
            <div style={{ fontSize: 12, color: '#ad6800' }}>
              ⚠️ Thiết bị này hiện chưa được phân công cho Nhóm kỹ thuật nào để quản trị vận hành.
            </div>
          )}
        </Card>

        {/* Bảng Danh sách Nhân viên Quản lý */}
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <span>II. Danh sách Nhân viên Quản lý ({users.length} nhân sự)</span>
              {currentGroup && (
                <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
                  Tất cả thành viên trong nhóm <strong>{currentGroup.name}</strong> chịu trách nhiệm bảo dưỡng & vận hành thiết bị này
                </Text>
              )}
            </div>
          }
          style={{ borderRadius: 8 }}
        >
          {/* Desktop View */}
          <div className="passport-desktop-only">
            <Table
              columns={personnelColumns}
              dataSource={users}
              rowKey={(r, idx) => (r.user_id ? `${r.user_id}-${idx}` : String(idx))}
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              locale={{
                emptyText: (
                  <Empty
                    description="Chưa có nhân viên nào được phân công trong nhóm này"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </div>

          {/* Mobile View: Touch Cards with direct call/email */}
          <div className="passport-mobile-only">
            {users.length === 0 ? (
              <Empty
                description="Chưa có nhân viên nào được phân công trong nhóm này"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              users.map((record, idx) => {
                const isLeader =
                  record.user_id === groupLeader?.user_id ||
                  record.user_device_groups?.some(
                    (g) => g.group_id === currentGroup?.id && g.is_group_lead
                  );
                const deptName = record.department?.name || parentTo?.name || parentDoi?.name || '—';

                return (
                  <div
                    key={record.user_id ? `${record.user_id}-${idx}` : String(idx)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #f0f0f0',
                      borderLeft: isLeader ? '4px solid #faad14' : '4px solid #1890ff',
                      borderRadius: 8,
                      padding: '12px 14px',
                      marginBottom: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Space size={8}>
                        <Avatar
                          size="small"
                          icon={<UserOutlined />}
                          style={{ backgroundColor: isLeader ? '#faad14' : '#1890ff' }}
                        />
                        <strong style={{ fontSize: 13, color: '#262626' }}>{record.name}</strong>
                      </Space>
                      {isLeader ? (
                        <Tag color="gold" icon={<StarFilled />} style={{ margin: 0, fontWeight: 600 }}>
                          Nhóm trưởng
                        </Tag>
                      ) : (
                        <Tag color="cyan" style={{ margin: 0 }}>
                          Thành viên
                        </Tag>
                      )}
                    </div>

                    <div style={{ fontSize: 12, color: '#595959', marginBottom: 8, lineHeight: 1.5 }}>
                      <div>Chức vụ: <strong>{record.position || '—'}</strong></div>
                      <div>Đơn vị: <strong>{deptName}</strong></div>
                    </div>

                    {(record.phone_number || record.email) && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        {record.phone_number && (
                          <Button
                            size="small"
                            icon={<PhoneOutlined />}
                            href={`tel:${record.phone_number}`}
                            style={{ flex: 1, color: '#52c41a', borderColor: '#b7eb8f' }}
                          >
                            Gọi {record.phone_number}
                          </Button>
                        )}
                        {record.email && (
                          <Button
                            size="small"
                            icon={<MailOutlined />}
                            href={`mailto:${record.email}`}
                            style={{ flex: 1, color: '#1890ff', borderColor: '#91d5ff' }}
                          >
                            Email
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </Space>
    );
  };

  // --- TAB 3: HỒ SƠ PHÁP LÝ & KIỂM ĐỊNH KỸ THUẬT ---
  const renderInspectionTab = () => {
    const today = dayjs().startOf('day');

    const columns: ColumnsType<LicenseItem> = [
      {
        title: 'STT',
        key: 'index',
        width: 50,
        align: 'center',
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Số Giấy phép / Tem kiểm định',
        dataIndex: 'number',
        key: 'number',
        render: (text: string, record: LicenseItem) => {
          const isRenewed = isRenewedRecord(record, licenseList);
          const renewedBy = isRenewed ? getRenewedByRecord(record, licenseList) : null;

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: isRenewed ? '#f1f5f9' : '#f3e8ff',
                  color: isRenewed ? '#64748b' : '#7e22ce',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  flexShrink: 0,
                }}
              >
                <SafetyCertificateOutlined />
              </div>
              <div>
                <div style={{ fontWeight: 600, color: isRenewed ? '#64748b' : '#0f172a', fontSize: 13 }}>
                  {text || '— (Chưa có số hiệu)'}
                </div>
                {record.previous_expiry && (
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Gia hạn từ: {dayjs(record.previous_expiry).format('DD/MM/YYYY')}
                  </div>
                )}
                {isRenewed && renewedBy && (
                  <div style={{ fontSize: 11, color: '#7c3aed' }}>
                    ↳ Đã gia hạn sang: <b>{renewedBy.number || 'kỳ mới'}</b> ({dayjs(renewedBy.expiry).format('DD/MM/YYYY')})
                  </div>
                )}
              </div>
            </div>
          );
        },
      },
      {
        title: 'Loại giấy tờ',
        dataIndex: 'type',
        key: 'type',
        width: 170,
        render: (text: string) => {
          const t = String(text || '').toLowerCase();
          let color = 'blue';
          if (t.includes('đăng kiểm')) color = 'purple';
          else if (t.includes('bảo hiểm')) color = 'green';
          else if (t.includes('an toàn')) color = 'cyan';
          else if (t.includes('khí thải')) color = 'geekblue';
          else if (t.includes('sân đỗ') || t.includes('lưu hành')) color = 'gold';
          return (
            <Tag color={color} style={{ fontWeight: 600, borderRadius: 4, margin: 0 }}>
              {text || 'Khác'}
            </Tag>
          );
        },
      },
      {
        title: 'Đơn vị cấp',
        dataIndex: 'issuer',
        key: 'issuer',
        render: (t: any) => t || '—',
      },
      {
        title: 'Thời hạn',
        dataIndex: 'expiry',
        key: 'expiry',
        align: 'center',
        width: 130,
        render: (d: string) => (
          <span style={{ fontWeight: 600, color: '#334155' }}>
            {d ? dayjs(d).format('DD/MM/YYYY') : '—'}
          </span>
        ),
      },
      {
        title: 'Trạng thái hiệu lực',
        key: 'status',
        width: 190,
        align: 'center',
        render: (_: any, record: LicenseItem) => {
          if (!record.expiry) return <Tag>Chưa có hạn</Tag>;
          const isRenewed = isRenewedRecord(record, licenseList);

          if (isRenewed) {
            return (
              <Tag
                color="default"
                icon={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                style={{
                  fontWeight: 600,
                  borderRadius: 4,
                  padding: '2px 8px',
                  margin: 0,
                  background: '#f1f5f9',
                  borderColor: '#cbd5e1',
                  color: '#475569',
                }}
              >
                Đã gia hạn (Kỳ cũ)
              </Tag>
            );
          }

          const d = dayjs(record.expiry).startOf('day');
          const diff = d.diff(today, 'day');

          if (diff < 0) {
            return (
              <Tag
                color="error"
                icon={<CloseCircleOutlined />}
                style={{ fontWeight: 600, borderRadius: 4, padding: '2px 8px', margin: 0 }}
              >
                Đã hết hạn ({Math.abs(diff)} ngày)
              </Tag>
            );
          }
          if (diff <= 30) {
            return (
              <Tag
                color="warning"
                icon={<ClockCircleOutlined />}
                style={{ fontWeight: 600, borderRadius: 4, padding: '2px 8px', margin: 0 }}
              >
                Sắp hết hạn (còn {diff} ngày)
              </Tag>
            );
          }
          return (
            <Tag
              color="success"
              icon={<CheckCircleOutlined />}
              style={{ fontWeight: 600, borderRadius: 4, padding: '2px 8px', margin: 0 }}
            >
              Còn hạn ({diff} ngày)
            </Tag>
          );
        },
      },
      {
        title: 'Ghi chú',
        dataIndex: 'note',
        key: 'note',
        render: (t: any) => <span style={{ color: '#64748b', fontSize: 12 }}>{t || '—'}</span>,
      },
    ];

    return (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Banner Tổng Quan Hợp Lệ */}
        {licenseStats.expiredCount > 0 ? (
          <Alert
            type="error"
            showIcon
            icon={<WarningOutlined />}
            message={
              <span>
                <strong>CẢNH BÁO QUÁ HẠN:</strong> Phát hiện <strong>{licenseStats.expiredCount}</strong> giấy phép / tem kiểm định đã hết hạn hiệu lực. Cần kiểm tra kỹ thuật trước khi vận hành!
              </span>
            }
            style={{ borderRadius: 8 }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message={
              <span>
                <strong>HỒ SƠ HỢP LỆ:</strong> Tất cả giấy phép và kiểm định kỹ thuật của phương tiện hiện đang còn đầy đủ hiệu lực.
              </span>
            }
            style={{ borderRadius: 8 }}
          />
        )}

        <Card
          size="small"
          title="III. Theo dõi hồ sơ pháp lý & Kiểm định kỹ thuật"
          style={{ borderRadius: 8 }}
        >
          {/* Quick Summary Bar */}
          <div
            style={{
              display: 'flex',
              gap: 20,
              marginBottom: 12,
              padding: '10px 14px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#64748b' }}>Tổng số giấy tờ: </span>
              <b style={{ color: '#0f172a' }}>{licenseStats.totalCount}</b>
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#16a34a' }}>Còn hiệu lực: </span>
              <b style={{ color: '#16a34a' }}>{licenseStats.validCount}</b>
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#d97706' }}>Sắp hết hạn (≤ 30 ngày): </span>
              <b style={{ color: licenseStats.expiringCount > 0 ? '#d97706' : '#64748b' }}>
                {licenseStats.expiringCount}
              </b>
            </div>
            <div style={{ fontSize: 12 }}>
              <span style={{ color: '#dc2626' }}>Đã hết hạn: </span>
              <b style={{ color: licenseStats.expiredCount > 0 ? '#dc2626' : '#64748b' }}>
                {licenseStats.expiredCount}
              </b>
            </div>
            {licenseStats.renewedCount > 0 && (
              <div style={{ fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Đã gia hạn (kỳ cũ): </span>
                <b style={{ color: '#475569' }}>{licenseStats.renewedCount}</b>
              </div>
            )}
          </div>

          {/* Desktop View: Full Table */}
          <div className="passport-desktop-only">
            <Table
              columns={columns}
              dataSource={licenseList}
              rowKey="_key"
              size="small"
              pagination={false}
              bordered
              locale={{
                emptyText: (
                  <Empty
                    description="Chưa có dữ liệu giấy phép hoặc đăng kiểm nào"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ),
              }}
            />
          </div>

          {/* Mobile View: Vertical Cards */}
          <div className="passport-mobile-only">
            {licenseList.length === 0 ? (
              <Empty
                description="Chưa có dữ liệu giấy phép hoặc đăng kiểm nào"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              licenseList.map((record, index) => {
                const isRenewed = isRenewedRecord(record, licenseList);
                const renewedBy = isRenewed ? getRenewedByRecord(record, licenseList) : null;
                const d = record.expiry ? dayjs(record.expiry).startOf('day') : null;
                const diff = d ? d.diff(today, 'day') : null;

                let borderColor = '#94a3b8';
                let tagStatus = <Tag>Chưa có hạn</Tag>;

                if (isRenewed) {
                  borderColor = '#cbd5e1';
                  tagStatus = (
                    <Tag
                      color="default"
                      icon={<CheckCircleOutlined style={{ color: '#16a34a' }} />}
                      style={{ fontWeight: 600, borderRadius: 4, margin: 0 }}
                    >
                      Đã gia hạn (Kỳ cũ)
                    </Tag>
                  );
                } else if (diff !== null) {
                  if (diff < 0) {
                    borderColor = '#ef4444';
                    tagStatus = (
                      <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontWeight: 600, margin: 0 }}>
                        Đã hết hạn ({Math.abs(diff)} ngày)
                      </Tag>
                    );
                  } else if (diff <= 30) {
                    borderColor = '#f59e0b';
                    tagStatus = (
                      <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontWeight: 600, margin: 0 }}>
                        Sắp hết hạn (còn {diff} ngày)
                      </Tag>
                    );
                  } else {
                    borderColor = '#22c55e';
                    tagStatus = (
                      <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontWeight: 600, margin: 0 }}>
                        Còn hạn ({diff} ngày)
                      </Tag>
                    );
                  }
                }

                const t = String(record.type || '').toLowerCase();
                let typeColor = 'blue';
                if (t.includes('đăng kiểm')) typeColor = 'purple';
                else if (t.includes('bảo hiểm')) typeColor = 'green';
                else if (t.includes('an toàn')) typeColor = 'cyan';
                else if (t.includes('khí thải')) typeColor = 'geekblue';
                else if (t.includes('sân đỗ') || t.includes('lưu hành')) typeColor = 'gold';

                return (
                  <div
                    key={record._key || index}
                    style={{
                      background: isRenewed ? '#f8fafc' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderLeft: `4px solid ${borderColor}`,
                      borderRadius: 8,
                      padding: '12px 14px',
                      marginBottom: 10,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Tag color={typeColor} style={{ fontWeight: 600, margin: 0, borderRadius: 4 }}>
                        {record.type || 'Giấy phép'}
                      </Tag>
                      {tagStatus}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 14, color: isRenewed ? '#64748b' : '#0f172a', marginBottom: 6 }}>
                      {record.number || '— (Chưa có số hiệu)'}
                    </div>

                    <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
                      <div>
                        Đơn vị cấp: <strong>{record.issuer || '—'}</strong>
                      </div>
                      <div>
                        Thời hạn: <strong>{record.expiry ? dayjs(record.expiry).format('DD/MM/YYYY') : '—'}</strong>
                      </div>
                      {record.previous_expiry && (
                        <div style={{ fontSize: 11, color: '#64748b' }}>
                          Gia hạn từ: {dayjs(record.previous_expiry).format('DD/MM/YYYY')}
                        </div>
                      )}
                      {isRenewed && renewedBy && (
                        <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>
                          ↳ Đã gia hạn sang: <b>{renewedBy.number || 'kỳ mới'}</b> ({dayjs(renewedBy.expiry).format('DD/MM/YYYY')})
                        </div>
                      )}
                      {record.note && (
                        <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic', marginTop: 2 }}>
                          Ghi chú: {record.note}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </Space>
    );
  };

  // --- TAB 4: LỊCH SỬ & KẾ HOẠCH BẢO DƯỠNG ---
  const renderMaintenanceTab = () => {
    const today = dayjs().startOf('day');
    const canEditDate = user?.role === 'ADMIN' || user?.permissions?.includes('UPDATE_MAINTENANCE_DATE');

    const completedList = maintenances.filter(
      (m) => m.status === 'inactive' && !!m.last_maintenance_date
    );
    const planList = maintenances.filter(
      (m) => !(m.status === 'inactive' && !!m.last_maintenance_date)
    );
    const overdueList = planList.filter(
      (m) => m.status === 'active' && isMaintenanceOverdue(m)
    );

    const getLevelTag = (level: string) => {
      const config = LEVEL_CONFIG[level] || { label: level || 'Định kỳ', color: 'blue' };
      return (
        <Tag color={config.color} style={{ fontWeight: 600 }}>
          {config.label}
        </Tag>
      );
    };

    // Bảng 1: Lịch bảo dưỡng đã làm (Đã hoàn thành)
    const completedColumns: ColumnsType<IMaintenance> = [
      {
        title: 'STT',
        key: 'idx',
        width: 50,
        align: 'center' as const,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Hạng mục',
        dataIndex: 'level',
        key: 'level',
        width: 120,
        render: (lvl: string) => getLevelTag(lvl),
      },
      {
        title: 'Ngày dự kiến',
        dataIndex: 'next_maintenance_date',
        key: 'next_date',
        width: 130,
        render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
      },
      {
        title: 'Ngày hoàn thành',
        dataIndex: 'last_maintenance_date',
        key: 'last_date',
        width: 140,
        render: (d: string) => (
          <span style={{ color: '#52c41a', fontWeight: 600 }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            {d ? dayjs(d).format('DD/MM/YYYY') : '—'}
          </span>
        ),
      },
      {
        title: 'Kỹ thuật viên thực hiện',
        key: 'performer',
        render: (_: any, r: IMaintenance) => {
          const t = r.tickets?.[0];
          const performerName = t?.user?.name || r.user?.name;
          const deptName = t?.user?.department?.name || r.department?.name;
          return performerName ? (
            <div>
              <div style={{ fontWeight: 600, color: '#1890ff' }}>{performerName}</div>
              {deptName && <div style={{ fontSize: 11, color: '#888' }}>{deptName}</div>}
            </div>
          ) : (
            <span style={{ color: '#888' }}>Kỹ thuật viên phụ trách</span>
          );
        },
      },
      {
        title: 'Phiếu bảo dưỡng',
        key: 'ticket',
        width: 140,
        render: (_: any, r: IMaintenance) => {
          const t = r.tickets?.[0];
          return t ? (
            <Button
              type="link"
              size="small"
              icon={<FileTextOutlined />}
              onClick={() => {
                setSelectedTicket(t);
                setTicketModalOpen(true);
              }}
              style={{ padding: 0 }}
            >
              Phiếu #{t.ticket_id}
            </Button>
          ) : (
            <span style={{ color: '#ccc' }}>—</span>
          );
        },
      },
      {
        title: 'Trạng thái',
        key: 'status',
        width: 130,
        render: () => <Tag color="success" icon={<CheckCircleOutlined />}>Hoàn thành</Tag>,
      },
      ...(canEditDate
        ? [
            {
              title: 'Thao tác',
              key: 'action',
              width: 110,
              align: 'right' as const,
              render: (_: any, r: IMaintenance) => (
                <Button
                  size="small"
                  icon={<CalendarOutlined />}
                  onClick={() => {
                    setEditingRecord({ ...r, device_name: device?.name });
                    setIsEditDateOpen(true);
                  }}
                >
                  Sửa ngày
                </Button>
              ),
            },
          ]
        : []),
    ];

    // Bảng 2: Kế hoạch bảo dưỡng (Dự kiến & Cần làm)
    const planColumns: ColumnsType<IMaintenance> = [
      {
        title: 'STT',
        key: 'idx',
        width: 50,
        align: 'center' as const,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Hạng mục',
        dataIndex: 'level',
        key: 'level',
        width: 120,
        render: (lvl: string) => getLevelTag(lvl),
      },
      {
        title: 'Ngày dự kiến',
        dataIndex: 'next_maintenance_date',
        key: 'next_date',
        width: 130,
        render: (d: string) => (
          <strong style={{ color: '#002766' }}>{d ? dayjs(d).format('DD/MM/YYYY') : '—'}</strong>
        ),
      },
      {
        title: 'Tình trạng đến hạn',
        key: 'status',
        render: (_: any, r: IMaintenance) => renderMaintenanceStatusTag(r),
      },
      {
        title: 'Thao tác',
        key: 'action',
        width: canEditDate ? 200 : 130,
        align: 'right' as const,
        render: (_: any, r: IMaintenance) => (
          <Space size={6}>
            {canEditDate && (
              <Button
                size="small"
                icon={<CalendarOutlined />}
                onClick={() => {
                  setEditingRecord({ ...r, device_name: device?.name });
                  setIsEditDateOpen(true);
                }}
              >
                Sửa ngày
              </Button>
            )}
            {r.status !== 'active' ? (
              <Button size="small" disabled>Chưa tới ngày</Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<ToolOutlined />}
                onClick={() => handleOpenPerform(r)}
              >
                Thực hiện
              </Button>
            )}
          </Space>
        ),
      },
    ];

    // Bảng 3: Toàn bộ lịch (Hiển thị đầy đủ cả 2 mốc ngày như Drawer)
    const allColumns: ColumnsType<IMaintenance> = [
      {
        title: 'STT',
        key: 'idx',
        width: 50,
        align: 'center' as const,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Hạng mục',
        dataIndex: 'level',
        key: 'level',
        width: 110,
        render: (lvl: string) => getLevelTag(lvl),
      },
      {
        title: 'Ngày dự kiến',
        dataIndex: 'next_maintenance_date',
        key: 'next_date',
        width: 120,
        render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '—'),
      },
      {
        title: 'Ngày hoàn thành',
        dataIndex: 'last_maintenance_date',
        key: 'last_date',
        width: 130,
        render: (d: string, r: IMaintenance) => {
          if (r.status === 'inactive' && d) {
            return <span style={{ color: '#52c41a', fontWeight: 600 }}>{dayjs(d).format('DD/MM/YYYY')}</span>;
          }
          return <span style={{ color: '#ccc' }}>---</span>;
        },
      },
      {
        title: 'Trạng thái',
        key: 'status',
        render: (_: any, r: IMaintenance) => renderMaintenanceStatusTag(r),
      },
      {
        title: 'Thao tác',
        key: 'action',
        width: canEditDate ? 190 : 110,
        align: 'right' as const,
        render: (_: any, r: IMaintenance) => (
          <Space size={6}>
            {canEditDate && (
              <Button
                size="small"
                icon={<CalendarOutlined />}
                onClick={() => {
                  setEditingRecord({ ...r, device_name: device?.name });
                  setIsEditDateOpen(true);
                }}
              >
                Sửa ngày
              </Button>
            )}
            {r.status === 'inactive' && r.last_maintenance_date ? (
              <Tag color="green"><CheckCircleOutlined /> Đã xong</Tag>
            ) : r.status !== 'active' ? (
              <Button size="small" disabled>Thực hiện</Button>
            ) : (
              <Button
                type="primary"
                size="small"
                icon={<ToolOutlined />}
                onClick={() => handleOpenPerform(r)}
              >
                Thực hiện
              </Button>
            )}
          </Space>
        ),
      },
    ];

    // --- CHU KỲ BẢO DƯỠNG (VIEW GỐC) ---
    const cycles =
      maintenances.find((m) => m.cycle_config && m.cycle_config.length > 0)?.cycle_config ||
      maintenances[0]?.cycle_config ||
      [];

    const lastMaintenanceDate =
      completedList[0]?.last_maintenance_date ||
      maintenances[0]?.last_maintenance_date ||
      maintenances[0]?.start_date;

    const isCycleActive = (targetKey: string) => {
      if (!Array.isArray(cycles)) return false;
      const matchMap: Record<string, string[]> = {
        Tuần: ['Tuần', 'Week', '1W'],
        '1M': ['1M', '1 Tháng', '01 Tháng', '1_month'],
        '3M': ['3M', '3 Tháng', '03 Tháng', '3_month'],
        '6M': ['6M', '6 Tháng', '06 Tháng', '6_month'],
        '1Y': ['1Y', '1 Năm', '01 Năm', '12_month'],
        '2Y': ['2Y', '2 Năm', '02 Năm', '24_month'],
      };
      const targets = matchMap[targetKey] || [targetKey];
      return cycles.some((c) => targets.includes(c));
    };

    const renderOriginalCheck = (targetKey: string) => {
      return isCycleActive(targetKey) ? (
        <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>
          x
        </Tag>
      ) : null;
    };

    const originalPlanColumns: ColumnsType<any> = [
      {
        title: 'STT',
        width: 50,
        align: 'center',
        render: () => 1,
      },
      {
        title: 'Tên Trang Thiết Bị',
        dataIndex: 'name',
        key: 'name',
        render: (text) => <b>{text || device.name}</b>,
      },
      {
        title: 'Nước sản xuất',
        dataIndex: 'country_of_origin',
        key: 'country',
        width: 120,
        render: (val) => val || '—',
      },
      {
        title: 'Biển số xe',
        dataIndex: 'reg_number',
        key: 'reg_number',
        width: 130,
        render: (text) =>
          text ? <Tag color="blue">{text}</Tag> : <span style={{ color: '#ccc', fontStyle: 'italic' }}>N/A</span>,
      },
      {
        title: 'Ngày BD Gần Nhất',
        key: 'last_date',
        align: 'center',
        width: 140,
        render: () => (lastMaintenanceDate ? dayjs(lastMaintenanceDate).format('DD/MM/YYYY') : '—'),
      },
      {
        title: 'Tuần',
        align: 'center',
        width: 80,
        render: () => renderOriginalCheck('Tuần'),
      },
      {
        title: '1 Tháng',
        align: 'center',
        width: 80,
        render: () => renderOriginalCheck('1M'),
      },
      {
        title: '3 Tháng',
        align: 'center',
        width: 80,
        render: () => renderOriginalCheck('3M'),
      },
      {
        title: '6 Tháng',
        align: 'center',
        width: 80,
        render: () => renderOriginalCheck('6M'),
      },
      {
        title: '1 Năm',
        align: 'center',
        width: 80,
        render: () => renderOriginalCheck('1Y'),
      },
      {
        title: '2 Năm',
        align: 'center',
        width: 80,
        render: () => renderOriginalCheck('2Y'),
      },
    ];

    let currentDataSource = planList;
    let currentColumns: ColumnsType<IMaintenance> = planColumns;
    let emptyDescription = 'Không có kế hoạch bảo dưỡng nào cần thực hiện';

    if (maintenanceSubTab === 'completed') {
      currentDataSource = completedList;
      currentColumns = completedColumns;
      emptyDescription = 'Chưa có lịch sử bảo dưỡng nào được hoàn thành';
    } else if (maintenanceSubTab === 'all') {
      currentDataSource = maintenances;
      currentColumns = allColumns;
      emptyDescription = 'Chưa có dữ liệu bảo dưỡng nào';
    }

    const paginatedMaintList = currentDataSource.slice(
      (maintPage - 1) * maintPageSize,
      maintPage * maintPageSize
    );

    return (
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 1. BẢNG KẾ HOẠCH BẢO DƯỠNG (VIEW GỐC) */}
        <Card
          size="small"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <TableOutlined style={{ color: '#1890ff' }} />
              <span style={{ fontWeight: 700, color: '#002766', fontSize: 13 }}>
                DANH SÁCH KẾ HOẠCH BẢO DƯỠNG (VIEW GỐC)
              </span>
            </div>
          }
          style={{ borderRadius: 8, borderColor: '#d9d9d9' }}
        >
          {/* Desktop View */}
          <div className="passport-desktop-only">
            <Table
              columns={originalPlanColumns}
              dataSource={[device]}
              rowKey={(r) => r.device_id || 'view-goc'}
              pagination={false}
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </div>

          {/* Mobile View: Clean Matrix Grid Card (No horizontal scroll) */}
          <div className="passport-mobile-only">
            <div style={{ background: '#fafafa', borderRadius: 8, padding: 12, border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#002766' }}>{device.name}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                    Xuất xứ: <strong>{device.country_of_origin || '—'}</strong>
                  </div>
                </div>
                {device.reg_number ? (
                  <Tag color="blue" style={{ margin: 0, fontWeight: 600 }}>{device.reg_number}</Tag>
                ) : (
                  <span style={{ fontSize: 11, color: '#ccc', fontStyle: 'italic' }}>Không biển số</span>
                )}
              </div>

              <div style={{ fontSize: 12, color: '#595959', marginBottom: 10, padding: '6px 8px', background: '#fff', borderRadius: 6, border: '1px dashed #d9d9d9' }}>
                📅 Ngày BD gần nhất: <strong>{lastMaintenanceDate ? dayjs(lastMaintenanceDate).format('DD/MM/YYYY') : '—'}</strong>
              </div>

              <div style={{ fontSize: 11, fontWeight: 600, color: '#595959', marginBottom: 6 }}>
                Chu kỳ áp dụng trong kế hoạch:
              </div>

              <Row gutter={[6, 6]}>
                {[
                  { key: 'Tuần', label: 'Tuần' },
                  { key: '1M', label: '1 Tháng' },
                  { key: '3M', label: '3 Tháng' },
                  { key: '6M', label: '6 Tháng' },
                  { key: '1Y', label: '1 Năm' },
                  { key: '2Y', label: '2 Năm' },
                ].map((cycleItem) => {
                  const isActive = isCycleActive(cycleItem.key);
                  return (
                    <Col span={8} key={cycleItem.key}>
                      <div
                        style={{
                          textAlign: 'center',
                          padding: '6px 4px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 600,
                          border: isActive ? '1px solid #b7eb8f' : '1px solid #f0f0f0',
                          background: isActive ? '#f6ffed' : '#ffffff',
                          color: isActive ? '#389e0d' : '#bfbfbf',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        {isActive ? (
                          <>
                            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                            <span>{cycleItem.label}</span>
                          </>
                        ) : (
                          <>
                            <span style={{ color: '#d9d9d9' }}>—</span>
                            <span style={{ color: '#bfbfbf' }}>{cycleItem.label}</span>
                          </>
                        )}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </div>
          </div>
        </Card>

        {/* 2. Thẻ thống kê nhanh */}
        <Row gutter={[12, 12]}>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: '#f0f5ff',
                borderColor: '#adc6ff',
                cursor: 'pointer',
              }}
              onClick={() => {
                setMaintenanceSubTab('all');
                setMaintPage(1);
              }}
            >
              <div style={{ fontSize: 11, color: '#595959' }}>TỔNG LỊCH BẢO TRÌ</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1d39c4' }}>{maintenances.length}</div>
              <div style={{ fontSize: 11, color: '#8c8c8c' }}>Chu kỳ 2 năm</div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: '#f6ffed',
                borderColor: '#b7eb8f',
                cursor: 'pointer',
              }}
              onClick={() => {
                setMaintenanceSubTab('completed');
                setMaintPage(1);
              }}
            >
              <div style={{ fontSize: 11, color: '#595959' }}>LỊCH ĐÃ LÀM</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#389e0d' }}>{completedList.length}</div>
              <div style={{ fontSize: 11, color: '#52c41a' }}>Đã hoàn thành</div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: overdueList.length > 0 ? '#fff1f0' : '#fafafa',
                borderColor: overdueList.length > 0 ? '#ffa39e' : '#f0f0f0',
                cursor: 'pointer',
              }}
              onClick={() => {
                setMaintenanceSubTab('plan');
                setMaintPage(1);
              }}
            >
              <div style={{ fontSize: 11, color: '#595959' }}>QUÁ HẠN CẦN LÀM</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: overdueList.length > 0 ? '#cf1322' : '#8c8c8c' }}>
                {overdueList.length}
              </div>
              <div style={{ fontSize: 11, color: overdueList.length > 0 ? '#ff4d4f' : '#8c8c8c' }}>Cần xử lý ngay</div>
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card
              size="small"
              style={{
                borderRadius: 8,
                background: '#fffbe6',
                borderColor: '#ffe58f',
                cursor: 'pointer',
              }}
              onClick={() => {
                setMaintenanceSubTab('plan');
                setMaintPage(1);
              }}
            >
              <div style={{ fontSize: 11, color: '#595959' }}>KẾ HOẠCH SẮP TỚI</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#d48806' }}>
                {planList.length - overdueList.length}
              </div>
              <div style={{ fontSize: 11, color: '#faad14' }}>Chưa tới ngày</div>
            </Card>
          </Col>
        </Row>

        {/* 3. Lịch trình & Kế hoạch bảo dưỡng phương tiện */}
        <Card
          size="small"
          title={
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#002766' }}>
                Lịch trình & Kế hoạch bảo dưỡng phương tiện
              </div>
              <Segmented
                value={maintenanceSubTab}
                onChange={(val) => {
                  setMaintenanceSubTab(val as any);
                  setMaintPage(1);
                }}
                block
                options={[
                  {
                    label: (
                      <span>
                        <CalendarOutlined /> Kế hoạch ({planList.length})
                      </span>
                    ),
                    value: 'plan',
                  },
                  {
                    label: (
                      <span>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} /> Đã làm ({completedList.length})
                      </span>
                    ),
                    value: 'completed',
                  },
                  {
                    label: (
                      <span>
                        <ToolOutlined /> Toàn bộ ({maintenances.length})
                      </span>
                    ),
                    value: 'all',
                  },
                ]}
              />
            </div>
          }
          style={{ borderRadius: 8 }}
        >
          {/* Desktop View */}
          <div className="passport-desktop-only">
            <Table
              columns={currentColumns}
              dataSource={currentDataSource}
              rowKey={(r, idx) => (r.maintenance_id ? `${r.maintenance_id}-${idx}` : String(idx))}
              size="small"
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: ['5', '10', '20', '50'],
                showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} lịch`,
              }}
              locale={{ emptyText: <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
              scroll={{ x: 'max-content' }}
            />
          </div>

          {/* Mobile View: Vertical Cards without horizontal scrolling */}
          <div className="passport-mobile-only">
            {currentDataSource.length === 0 ? (
              <Empty description={emptyDescription} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <div>
                {paginatedMaintList.map((r, index) => {
                  const itemIndex = (maintPage - 1) * maintPageSize + index + 1;
                  const statusInfo = getMaintenanceStatusInfo(r, today);
                  let borderColor = '#d9d9d9';
                  if (statusInfo.isCompleted) borderColor = '#52c41a';
                  else if (statusInfo.isOverdue) borderColor = '#ff4d4f';
                  else if (statusInfo.type === 'near_due') borderColor = '#faad14';
                  else if (statusInfo.isActive) borderColor = '#1890ff';

                  const t = r.tickets?.[0];
                  const performerName = t?.user?.name || r.user?.name;
                  const deptName = t?.user?.department?.name || r.department?.name;

                  return (
                    <div
                      key={r.maintenance_id ? `${r.maintenance_id}-${index}` : String(index)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #f0f0f0',
                        borderLeft: `4px solid ${borderColor}`,
                        borderRadius: 8,
                        padding: '12px 14px',
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Space size={6}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#8c8c8c' }}>#{itemIndex}</span>
                          {getLevelTag(r.level)}
                        </Space>

                        <div>
                          {renderMaintenanceStatusTag(r, today)}
                        </div>
                      </div>

                      <div style={{ fontSize: 12, lineHeight: 1.6, color: '#595959' }}>
                        <div>
                          <span>📅 Ngày dự kiến: </span>
                          <strong style={{ color: '#002766' }}>
                            {r.next_maintenance_date ? dayjs(r.next_maintenance_date).format('DD/MM/YYYY') : '—'}
                          </strong>
                        </div>

                        {r.last_maintenance_date && (
                          <div>
                            <span>✅ Ngày hoàn thành: </span>
                            <strong style={{ color: '#52c41a' }}>
                              {dayjs(r.last_maintenance_date).format('DD/MM/YYYY')}
                            </strong>
                          </div>
                        )}

                        {performerName && (
                          <div style={{ marginTop: 2 }}>
                            <span>👤 KTV thực hiện: </span>
                            <strong style={{ color: '#1890ff' }}>{performerName}</strong>
                            {deptName && <span style={{ color: '#8c8c8c' }}> ({deptName})</span>}
                          </div>
                        )}

                        {t && (
                          <div style={{ marginTop: 4 }}>
                            <span>📄 Phiếu bảo dưỡng: </span>
                            <Button
                              type="link"
                              size="small"
                              icon={<FileTextOutlined />}
                              onClick={() => {
                                setSelectedTicket(t);
                                setTicketModalOpen(true);
                              }}
                              style={{ padding: 0, height: 'auto', fontSize: 12 }}
                            >
                              Phiếu #{t.ticket_id}
                            </Button>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        {canEditDate && (
                          <Button
                            size="small"
                            icon={<CalendarOutlined />}
                            onClick={() => {
                              setEditingRecord({ ...r, device_name: device?.name });
                              setIsEditDateOpen(true);
                            }}
                            style={{ flex: 1, borderRadius: 6 }}
                          >
                            Sửa ngày
                          </Button>
                        )}
                        {r.status === 'active' && (
                          <Button
                            type="primary"
                            icon={<ToolOutlined />}
                            size="small"
                            onClick={() => handleOpenPerform(r)}
                            style={{ flex: 1, borderRadius: 6, fontWeight: 500 }}
                          >
                            Thực hiện
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {currentDataSource.length > maintPageSize && (
                  <Pagination
                    current={maintPage}
                    pageSize={maintPageSize}
                    total={currentDataSource.length}
                    onChange={(page) => setMaintPage(page)}
                    simple
                    size="small"
                    style={{ textAlign: 'center', marginTop: 12 }}
                  />
                )}
              </div>
            )}
          </div>
        </Card>
      </Space>
    );
  };

  // --- TAB 4: LỊCH SỬ SỬA CHỮA ---
  const renderRepairsTab = () => {
    const repairColumns = [
      {
        title: '#',
        key: 'idx',
        width: 45,
        align: 'center' as const,
        render: (_: any, __: any, index: number) => index + 1,
      },
      {
        title: 'Ngày báo',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 110,
        render: (d: string) => (d ? dayjs(d).format('DD/MM/YYYY') : '-'),
      },
      {
        title: 'Mô tả sự cố hư hỏng',
        key: 'defect',
        render: (_: any, r: IRepair) => (
          <div>
            <div style={{ fontWeight: 600 }}>{r.recommendation || r.description_defect || 'Báo hỏng sửa chữa'}</div>
            {r.location_issue && (
              <div style={{ fontSize: 11, color: '#888' }}>Vị trí: {r.location_issue}</div>
            )}
          </div>
        ),
      },
      {
        title: 'Người báo',
        key: 'reporter',
        width: 130,
        render: (_: any, r: IRepair) => r.created_by?.name || '-',
      },
      {
        title: 'Trạng thái',
        key: 'status',
        width: 140,
        render: (_: any, r: IRepair) => {
          let color = 'default';
          let text = 'Chờ xử lý';
          if (r.status_acceptance === 'acceptance_admin_approved' || r.status_request === 'COMPLETED') {
            color = 'success';
            text = 'Đã hoàn thành';
          } else if (r.status_request === 'REJECTED' || r.canceled) {
            color = 'error';
            text = 'Từ chối / Hủy';
          } else {
            color = 'processing';
            text = 'Đang xử lý';
          }
          return <Tag color={color}>{text}</Tag>;
        },
      },
    ];

    const getRepairStatus = (r: IRepair) => {
      if (r.status_acceptance === 'acceptance_admin_approved' || r.status_request === 'COMPLETED') {
        return { color: 'success', text: 'Đã hoàn thành', border: '#52c41a' };
      } else if (r.status_request === 'REJECTED' || r.canceled) {
        return { color: 'error', text: 'Từ chối / Hủy', border: '#ff4d4f' };
      } else {
        return { color: 'processing', text: 'Đang xử lý', border: '#1890ff' };
      }
    };

    return (
      <Card size="small" title="Lịch sử ghi nhận hư hỏng & sửa chữa" style={{ borderRadius: 8 }}>
        {/* Desktop View */}
        <div className="passport-desktop-only">
          <Table
            columns={repairColumns}
            dataSource={repairs}
            rowKey="repair_id"
            size="small"
            pagination={{ pageSize: 5 }}
            locale={{ emptyText: <Empty description="Phương tiện chưa có lịch sử hư hỏng nào" /> }}
            scroll={{ x: 'max-content' }}
          />
        </div>

        {/* Mobile View: Vertical Cards without horizontal scrolling */}
        <div className="passport-mobile-only">
          {repairs.length === 0 ? (
            <Empty description="Phương tiện chưa có lịch sử hư hỏng nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            repairs.map((r, idx) => {
              const status = getRepairStatus(r);
              return (
                <div
                  key={r.repair_id || idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #f0f0f0',
                    borderLeft: `4px solid ${status.border}`,
                    borderRadius: 8,
                    padding: '12px 14px',
                    marginBottom: 10,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#8c8c8c' }}>
                      📅 {r.created_at ? dayjs(r.created_at).format('DD/MM/YYYY') : '—'}
                    </span>
                    <Tag color={status.color} style={{ margin: 0 }}>
                      {status.text}
                    </Tag>
                  </div>

                  <div style={{ fontWeight: 600, fontSize: 13, color: '#262626', marginBottom: 4 }}>
                    {r.recommendation || r.description_defect || 'Báo hỏng sửa chữa'}
                  </div>

                  {r.location_issue && (
                    <div style={{ fontSize: 12, color: '#595959', marginBottom: 4 }}>
                      📍 Vị trí: <strong>{r.location_issue}</strong>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: '#8c8c8c' }}>
                    👤 Người báo: <strong>{r.created_by?.name || '—'}</strong>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    );
  };

  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <CarOutlined /> Lý lịch & Thông số
        </span>
      ),
      children: renderProfileTab(),
    },
    {
      key: '2',
      label: (
        <span>
          <UserOutlined /> Người phụ trách ({users.length})
        </span>
      ),
      children: renderPersonnelTab(),
    },
    {
      key: '3',
      label: (
        <span>
          <SafetyCertificateOutlined /> Giấy phép & Đăng kiểm ({licenseStats.totalCount})
        </span>
      ),
      children: renderInspectionTab(),
    },
    {
      key: '4',
      label: (
        <span>
          <ToolOutlined /> Bảo dưỡng ({maintenances.length})
        </span>
      ),
      children: renderMaintenanceTab(),
    },
    {
      key: '5',
      label: (
        <span>
          <WarningOutlined /> Sửa chữa ({repairs.length})
        </span>
      ),
      children: renderRepairsTab(),
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: '16px 12px 80px 12px',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Top Navigation Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
          className="no-print"
        >
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/quan_ly_ttb_pt');
              }
            }}
          >
            Quay lại
          </Button>

          <Button icon={<ReloadOutlined />} onClick={fetchData} title="Làm mới">
            Làm mới
          </Button>
        </div>

        {/* HERO CARD: Vehicle Identity */}
        <Card
          style={{
            marginBottom: 16,
            borderRadius: 12,
            boxShadow: '0 4px 16px rgba(0, 58, 140, 0.08)',
            borderTop: `4px solid ${currentStatus.color}`,
          }}
          styles={{ body: { padding: '16px 20px' } }}
        >
          {/* Header Title */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid #f0f0f0', paddingBottom: 10, marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#003a8c', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CẢNG HÀNG KHÔNG - HỒ SƠ SỐ TRANG THIẾT BỊ PHƯƠNG TIỆN
            </div>
            <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase' }}>
              HỆ THỐNG QUẢN LÝ BẢO DƯỠNG & SỬA CHỮA CMMS
            </div>
          </div>

          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} sm={16}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Title level={4} style={{ margin: 0, color: '#1f1f1f' }}>
                  {device.name}
                </Title>
                <Tag color={currentStatus.tagColor} style={{ fontSize: 12, padding: '2px 8px' }}>
                  {currentStatus.label}
                </Tag>
              </div>

              <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {device.reg_number ? (
                  <div
                    style={{
                      border: '1.5px solid #1890ff',
                      borderRadius: 4,
                      padding: '2px 10px',
                      fontSize: 15,
                      fontWeight: 800,
                      color: '#003a8c',
                      background: '#e6f7ff',
                      letterSpacing: '0.5px',
                    }}
                  >
                    {device.reg_number}
                  </div>
                ) : (
                  <Tag color="blue">Chưa có biển số</Tag>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Mã TTB: <strong>{device.device_code || `TTB-${device.device_id}`}</strong>
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Loại: <strong>{device.deviceType?.name || 'NIL'}</strong>
                </Text>
              </div>
            </Col>

            <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: '#555' }}>
                <div><strong>Đơn vị QL:</strong> {device.using_department || device.device_group?.name || 'Chưa gán'}</div>
                <div><strong>Năm đưa vào SD:</strong> {device.usage_start_year || '-'}</div>
              </div>
            </Col>
          </Row>

          {/* Inspection Alert Bar */}
          <div style={{ marginTop: 12 }}>
            {licenseStats.expiredCount > 0 ? (
              <Alert
                type="error"
                showIcon
                icon={<WarningOutlined />}
                message={
                  <span>
                    <strong>CẢNH BÁO KIỂM ĐỊNH:</strong> Phương tiện có <strong>{licenseStats.expiredCount}</strong> giấy tờ / tem kiểm định đã quá hạn! Cần liên hệ tổ kỹ thuật kiểm tra và gia hạn ngay.
                  </span>
                }
              />
            ) : licenseStats.expiringCount > 0 ? (
              <Alert
                type="warning"
                showIcon
                icon={<ClockCircleOutlined />}
                message={
                  <span>
                    <strong>LƯU Ý:</strong> Có <strong>{licenseStats.expiringCount}</strong> giấy tờ / tem kiểm định sắp hết hạn trong vòng 30 ngày tới.
                  </span>
                }
              />
            ) : licenseStats.totalCount > 0 ? (
              <Alert
                type="success"
                showIcon
                icon={<SafetyCertificateOutlined />}
                message={
                  <span>
                    <strong>HỒ SƠ HỢP LỆ:</strong> Tất cả giấy phép và kiểm định kỹ thuật của phương tiện hiện đang còn đầy đủ hiệu lực{licenseStats.latestExpiryDate ? ` (Hạn đến ${dayjs(licenseStats.latestExpiryDate).format('DD/MM/YYYY')})` : ''}.
                  </span>
                }
              />
            ) : (
              <Alert
                type="info"
                showIcon
                icon={<SafetyCertificateOutlined />}
                message="Chưa có thông tin giấy phép / tem kiểm định cho phương tiện này."
              />
            )}
          </div>
        </Card>

        {/* TABS CONTAINER */}
        <Card className="passport-tabs-card" style={{ borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <Tabs defaultActiveKey="1" items={tabItems} size="middle" />
        </Card>
      </div>

      {/* FIXED BOTTOM ACTION BAR (Sticky on Mobile) */}
      <div
        className="no-print"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid #e8e8e8',
          padding: '10px 16px',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.06)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 800, width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <Button
            type="primary"
            danger
            icon={<WarningOutlined />}
            size="large"
            style={{ flex: 1, fontWeight: 600 }}
            onClick={() => setReportModalOpen(true)}
          >
            🚨 Báo hỏng nhanh xe này
          </Button>

          <Button
            icon={<HomeOutlined />}
            size="large"
            onClick={() => navigate('/quan_ly_ttb_pt')}
          >
            Trang thiết bị
          </Button>
        </div>
      </div>

      {/* QUICK ISSUE REPORT MODAL */}
      <Modal
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        title={
          <Space>
            <WarningOutlined style={{ color: '#f5222d', fontSize: 20 }} />
            <span>Báo Hỏng Phương Tiện: {device.name}</span>
          </Space>
        }
        footer={null}
        destroyOnClose
      >
        <div style={{ marginBottom: 12, background: '#fff1f0', border: '1px solid #ffa39e', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
          Xe: <strong>{device.name}</strong> | Biển số: <strong>{device.reg_number || 'NIL'}</strong> | Mã: <strong>{device.device_code || device.device_id}</strong>
        </div>

        <Form
          form={reportForm}
          layout="vertical"
          onFinish={handleReportSubmit}
          initialValues={{
            location_issue: device.location_coordinates || device.operating_scope || 'Sân đỗ tàu bay',
          }}
        >
          <Form.Item
            name="location_issue"
            label="Vị trí xảy ra sự cố / Phương tiện đang đỗ"
            rules={[{ required: true, message: 'Vui lòng nhập vị trí sự cố' }]}
          >
            <Input placeholder="Ví dụ: Vị trí đỗ số 15, Ga T1..." />
          </Form.Item>

          <Form.Item
            name="defect_description"
            label="Mô tả hiện tượng hư hỏng / Sự cố"
            rules={[{ required: true, message: 'Vui lòng mô tả chi tiết hư hỏng' }]}
          >
            <TextArea
              rows={4}
              placeholder="Mô tả cụ thể hiện tượng: xì dầu thủy lực, đề không nổ, lốp mòn rách, đèn chiếu sáng hỏng..."
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú thêm (nếu có)">
            <Input placeholder="Người bàn giao, số điện thoại liên hệ..." />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <Button onClick={() => setReportModalOpen(false)}>Hủy</Button>
            <Button type="primary" danger htmlType="submit" loading={submittingReport}>
              Gửi yêu cầu sửa chữa
            </Button>
          </div>
        </Form>
      </Modal>

      {/* CHI TIẾT PHIẾU BẢO DƯỠNG MODAL */}
      <TicketDetailModal
        open={ticketModalOpen}
        onCancel={() => {
          setTicketModalOpen(false);
          setSelectedTicket(null);
        }}
        data={selectedTicket}
      />

      {/* THỰC HIỆN BẢO DƯỠNG MODAL */}
      <Modal
        title={
          <span>
            <ToolOutlined style={{ color: '#1890ff', marginRight: 6 }} />
            Thực hiện bảo dưỡng: <strong>{device.name}</strong>
          </span>
        }
        open={isPerformOpen}
        onCancel={() => setIsPerformOpen(false)}
        onOk={handleSavePerform}
        okText="Lưu & Hoàn thành"
        cancelText="Hủy bỏ"
        confirmLoading={performing}
        destroyOnClose
      >
        <div style={{ marginBottom: 16 }}>
          <Text strong>1. Cấp độ bảo dưỡng:</Text>
          <div style={{ marginTop: 6 }}>
            <Tag color="blue" style={{ fontSize: 13, padding: '2px 8px' }}>
              {performRecord?.level}
            </Tag>
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <Text strong>2. Chọn ngày thực hiện:</Text>
          <DatePicker
            style={{ width: '100%', marginTop: 8 }}
            format="DD/MM/YYYY"
            value={performDate}
            onChange={setPerformDate}
            allowClear={false}
          />
        </div>
        <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, fontSize: 12 }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 6 }} />
          Hệ thống sẽ tạo phiếu bảo dưỡng tự động và đánh dấu lịch này là đã hoàn thành.
        </div>
      </Modal>

      <EditMaintenanceDateModal
        open={isEditDateOpen}
        record={editingRecord}
        onClose={() => {
          setIsEditDateOpen(false);
          setEditingRecord(null);
        }}
        onSuccess={fetchData}
      />

      {/* RESPONSIVE & PRINT CSS STYLES */}
      <style>{`
        @media (max-width: 767px) {
          .passport-desktop-only {
            display: none !important;
          }
          .passport-mobile-only {
            display: block !important;
          }
          .passport-tabs-card > .ant-card-body {
            padding: 12px 8px !important;
          }
        }
        @media (min-width: 768px) {
          .passport-desktop-only {
            display: block !important;
          }
          .passport-mobile-only {
            display: none !important;
          }
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DevicePassportPage;
