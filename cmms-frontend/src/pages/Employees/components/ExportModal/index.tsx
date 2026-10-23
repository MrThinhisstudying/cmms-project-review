import React, { useState, useMemo } from 'react';
import {
  Modal, Checkbox, Radio, Collapse, Button, Space, Typography,
  Divider, Tag, Spin, message
} from 'antd';
import {
  UserOutlined, FileTextOutlined,
  TrophyOutlined, ApartmentOutlined, ExportOutlined,
  WarningOutlined, BookOutlined, IdcardOutlined
} from '@ant-design/icons';
import { IUser } from '../../../../types/user.types';
import { ILaborContract } from '../../../../apis/laborContracts';
import { IEmployeeCertificate } from '../../../../types/certificates.types';
import { IRewardDiscipline, getRewardDisciplines } from '../../../../apis/rewardDisciplines';
import certificatesApi from '../../../../apis/certificates';
import { exportUsersToExcelCustom, ExportConfig } from '../../../../utils/excelHelper';

const { Text } = Typography;

// ═══════════════════════════════════════════════
// Field Group Definitions
// ═══════════════════════════════════════════════
interface FieldItem {
  key: string;
  label: string;
}

interface FieldGroup {
  groupKey: string;
  label: string;
  icon: React.ReactNode;
  fields: FieldItem[];
  /** Các field được check mặc định */
  defaults: string[];
  /** Nếu nhóm cần lazy-fetch data */
  requiresFetch?: boolean;
  /** Bộ lọc trạng thái chứng chỉ (chỉ áp dụng cho nhóm certificates) */
  hasCertFilter?: boolean;
  /** Lọc theo loại certificate khi fetch */
  certTypeFilter?: string[];
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    groupKey: 'personal',
    label: 'Thông tin cá nhân',
    icon: <UserOutlined />,
    defaults: ['name', 'employee_code', 'position', 'email', 'phone_number'],
    fields: [
      { key: 'name', label: 'Họ tên' },
      { key: 'employee_code', label: 'MSNV' },
      { key: 'position', label: 'Chức vụ' },
      { key: 'email', label: 'Email' },
      { key: 'phone_number', label: 'SĐT' },
      { key: 'gender', label: 'Giới tính' },
      { key: 'ethnicity', label: 'Dân tộc' },
      { key: 'date_of_birth', label: 'Ngày sinh' },
      { key: 'place_of_birth', label: 'Nơi sinh' },
      { key: 'citizen_identification_card', label: 'CCCD' },
      { key: 'cccd_issue_date', label: 'Ngày cấp CCCD' },
      { key: 'permanent_address', label: 'Nơi thường trú' },
      { key: 'temporary_address', label: 'Nơi tạm trú' },
      { key: 'hometown', label: 'Quê quán' },
    ],
  },
  {
    groupKey: 'degrees',
    label: 'Bằng cấp & GPLX',
    icon: <BookOutlined />,
    defaults: [],
    requiresFetch: true,
    hasCertFilter: false,
    certTypeFilter: ['BANG_CAP', 'GIAY_PHEP'],
    fields: [
      { key: 'deg_type', label: 'Loại bằng' },
      { key: 'deg_program', label: 'Tên bằng' },
      { key: 'deg_number', label: 'Số hiệu' },
      { key: 'deg_school', label: 'Trường' },
      { key: 'deg_major', label: 'Chuyên ngành' },
      { key: 'deg_graduation_year', label: 'Năm tốt nghiệp' },
      { key: 'deg_grading', label: 'Xếp loại' },
      { key: 'deg_study_mode', label: 'Hình thức đào tạo' },
      { key: 'deg_license_class', label: 'Hạng GPLX' },
      { key: 'deg_status', label: 'Trạng thái' },
    ],
  },
  {
    groupKey: 'cccm',
    label: 'CCCM & Đào tạo',
    icon: <IdcardOutlined />,
    defaults: [],
    requiresFetch: true,
    hasCertFilter: true,
    certTypeFilter: ['CCCM', 'QDCN', 'NANG_DINH'],
    fields: [
      { key: 'cccm_type', label: 'Loại' },
      { key: 'cccm_program', label: 'Chương trình' },
      { key: 'cccm_number', label: 'Số hiệu' },
      { key: 'cccm_issue_date', label: 'Ngày cấp' },
      { key: 'cccm_expiry_date', label: 'Ngày hết hạn' },
      { key: 'cccm_grading', label: 'Xếp loại' },
      { key: 'cccm_next_training', label: 'Ngày đào tạo lại' },
      { key: 'cccm_status', label: 'Trạng thái' },
    ],
  },
  {
    groupKey: 'contracts',
    label: 'Hợp đồng lao động',
    icon: <FileTextOutlined />,
    defaults: [],
    fields: [
      { key: 'contract_number', label: 'Số HĐ' },
      { key: 'contract_type', label: 'Loại HĐ' },
      { key: 'contract_start', label: 'Ngày bắt đầu' },
      { key: 'contract_end', label: 'Ngày kết thúc' },
      { key: 'contract_status', label: 'Trạng thái' },
    ],
  },
  {
    groupKey: 'rewards',
    label: 'Khen thưởng / Kỷ luật',
    icon: <TrophyOutlined />,
    defaults: [],
    requiresFetch: true,
    fields: [
      { key: 'rd_type', label: 'Loại (KT/KL)' },
      { key: 'rd_decision', label: 'Số quyết định' },
      { key: 'rd_content', label: 'Nội dung' },
      { key: 'rd_date', label: 'Ngày hiệu lực' },
    ],
  },
  {
    groupKey: 'department',
    label: 'Đơn vị tổ chức',
    icon: <ApartmentOutlined />,
    defaults: [],
    fields: [
      { key: 'dept_name', label: 'Bộ phận chính' },
      { key: 'dept_role', label: 'Vai trò' },
    ],
  },
];

// ═══════════════════════════════════════════════
// Props
// ═══════════════════════════════════════════════
interface ExportModalProps {
  open: boolean;
  onCancel: () => void;
  users: IUser[];
  selectedRowKeys: React.Key[];
  contracts: Record<number, ILaborContract>;
  /** Nếu mở từ Bulk Actions thì mặc định scope = SELECTED */
  defaultScope?: 'ALL' | 'SELECTED';
}

const ExportModal: React.FC<ExportModalProps> = ({
  open, onCancel, users, selectedRowKeys, contracts, defaultScope = 'ALL'
}) => {
  // Scope: ALL hoặc SELECTED
  const [scope, setScope] = useState<'ALL' | 'SELECTED'>(defaultScope);
  // Selected fields per group
  const [checkedFields, setCheckedFields] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    FIELD_GROUPS.forEach(g => { init[g.groupKey] = [...g.defaults]; });
    return init;
  });
  // Certificate filter (cho nhóm CCCM)
  const [certFilter, setCertFilter] = useState<'expiring' | 'expired' | null>(null);
  const [exporting, setExporting] = useState(false);

  // Reset khi mở modal
  React.useEffect(() => {
    if (open) {
      setScope(defaultScope);
      setCertFilter(null);
      const init: Record<string, string[]> = {};
      FIELD_GROUPS.forEach(g => { init[g.groupKey] = [...g.defaults]; });
      setCheckedFields(init);
    }
  }, [open, defaultScope]);

  // Tổng số trường đã chọn
  const totalSelected = useMemo(() =>
    Object.values(checkedFields).reduce((sum, arr) => sum + arr.length, 0)
  , [checkedFields]);

  // Target users
  const targetUsers = useMemo(() => {
    if (scope === 'SELECTED') return users.filter(u => selectedRowKeys.includes(u.user_id));
    return users;
  }, [scope, users, selectedRowKeys]);

  // ── Handlers ──
  const handleGroupCheckAll = (groupKey: string, checked: boolean) => {
    const group = FIELD_GROUPS.find(g => g.groupKey === groupKey);
    if (!group) return;
    setCheckedFields(prev => ({
      ...prev,
      [groupKey]: checked ? group.fields.map(f => f.key) : [],
    }));
  };

  const handleFieldChange = (groupKey: string, values: string[]) => {
    setCheckedFields(prev => ({ ...prev, [groupKey]: values }));
  };

  // ── Export ──
  const handleExport = async () => {
    if (totalSelected === 0) {
      message.warning('Vui lòng chọn ít nhất một trường thông tin.');
      return;
    }
    if (scope === 'SELECTED' && selectedRowKeys.length === 0) {
      message.warning('Chưa có nhân viên nào được chọn trên bảng.');
      return;
    }

    setExporting(true);
    try {
      // Gom tất cả selected fields
      const allSelectedFields = Object.values(checkedFields).flat();

      // Lazy fetch nếu cần
      const hasDegreeFields = (checkedFields.degrees?.length || 0) > 0;
      const hasCccmFields = (checkedFields.cccm?.length || 0) > 0;
      const hasRewardFields = (checkedFields.rewards?.length || 0) > 0;

      let certsMap: Map<number, IEmployeeCertificate[]> | undefined;
      let rewardsMap: Map<number, IRewardDiscipline[]> | undefined;

      // Fetch certificates nếu cần (cho cả degrees và cccm)
      if (hasDegreeFields || hasCccmFields) {
        certsMap = new Map();
        const degreeTypes = FIELD_GROUPS.find(g => g.groupKey === 'degrees')?.certTypeFilter || [];
        const cccmTypes = FIELD_GROUPS.find(g => g.groupKey === 'cccm')?.certTypeFilter || [];
        const neededTypes = [
          ...(hasDegreeFields ? degreeTypes : []),
          ...(hasCccmFields ? cccmTypes : []),
        ];

        const promises = targetUsers.map(async u => {
          const allCerts = await certificatesApi.getUserCertificates(u.user_id);
          // Lọc theo type cần thiết
          let filtered = allCerts.filter(c => neededTypes.includes(c.type));
          // Áp dụng cert filter (chỉ cho CCCM)
          if (hasCccmFields && certFilter) {
            const cccmCerts = filtered.filter(c => cccmTypes.includes(c.type));
            const degreeCerts = filtered.filter(c => degreeTypes.includes(c.type));
            const now = new Date();

            if (certFilter === 'expiring') {
              const limit = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
              const filteredCccm = cccmCerts.filter(c =>
                c.expiry_date && new Date(c.expiry_date) > now && new Date(c.expiry_date) <= limit
              );
              filtered = [...(hasDegreeFields ? degreeCerts : []), ...filteredCccm];
            } else if (certFilter === 'expired') {
              const filteredCccm = cccmCerts.filter(c =>
                c.expiry_date && new Date(c.expiry_date) < now
              );
              filtered = [...(hasDegreeFields ? degreeCerts : []), ...filteredCccm];
            }
          }
          certsMap!.set(u.user_id, filtered);
        });
        await Promise.all(promises);
      }

      if (hasRewardFields) {
        const allRewards = await getRewardDisciplines();
        rewardsMap = new Map();
        targetUsers.forEach(u => {
          rewardsMap!.set(
            u.user_id,
            allRewards.filter(r => r.user?.user_id === u.user_id)
          );
        });
      }

      // Contracts map
      const contractsMap = new Map<number, ILaborContract[]>();
      if ((checkedFields.contracts?.length || 0) > 0) {
        targetUsers.forEach(u => {
          const c = contracts[u.user_id];
          contractsMap.set(u.user_id, c ? [c] : []);
        });
      }

      const config: ExportConfig = {
        users: targetUsers,
        selectedFields: allSelectedFields,
        certificates: certsMap,
        contracts: contractsMap.size > 0 ? contractsMap : undefined,
        rewards: rewardsMap,
        certFilter,
      };

      await exportUsersToExcelCustom(config);
      message.success(`Xuất Excel thành công (${targetUsers.length} nhân viên)`);
      onCancel();
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Lỗi xuất Excel');
    } finally {
      setExporting(false);
    }
  };

  // ── Render ──
  const collapseItems = FIELD_GROUPS.map(group => {
    const checked = checkedFields[group.groupKey] || [];
    const allChecked = checked.length === group.fields.length && checked.length > 0;
    const indeterminate = checked.length > 0 && !allChecked;

    return {
      key: group.groupKey,
      label: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {group.icon}
          <Text strong style={{ fontSize: 13 }}>{group.label}</Text>
          {checked.length > 0 && (
            <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>{checked.length} trường</Tag>
          )}
        </div>
      ),
      extra: (
        <Checkbox
          indeterminate={indeterminate}
          checked={allChecked}
          onChange={(e) => {
            e.stopPropagation();
            handleGroupCheckAll(group.groupKey, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            // Chỉ hiện màu xanh khi đã checked hoặc indeterminate
            ...((!allChecked && !indeterminate) ? { color: '#8c8c8c' } : {}),
          }}
        >
          <Text style={{
            fontSize: 12,
            color: (allChecked || indeterminate) ? '#1890ff' : '#8c8c8c',
          }}>Tất cả</Text>
        </Checkbox>
      ),
      children: (
        <div>
          <Checkbox.Group
            value={checked}
            onChange={(vals) => handleFieldChange(group.groupKey, vals as string[])}
            style={{ width: '100%' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 0' }}>
              {group.fields.map(f => (
                <Checkbox key={f.key} value={f.key} style={{ fontSize: 13 }}>{f.label}</Checkbox>
              ))}
            </div>
          </Checkbox.Group>

          {/* Bộ lọc chứng chỉ — chỉ hiện cho nhóm có hasCertFilter */}
          {group.hasCertFilter && checked.length > 0 && (
            <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbe6', borderRadius: 6, border: '1px solid #ffe58f' }}>
              <Text style={{ fontSize: 12, color: '#d48806', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <WarningOutlined /> Bộ lọc chứng chỉ (tùy chọn)
              </Text>
              <Radio.Group value={certFilter} onChange={e => setCertFilter(e.target.value)} size="small">
                <Space direction="vertical" size={4}>
                  <Radio value={null} style={{ fontSize: 12 }}>Xuất tất cả chứng chỉ</Radio>
                  <Radio value="expiring" style={{ fontSize: 12 }}>Chỉ xuất CC sắp hết hạn (≤ 90 ngày)</Radio>
                  <Radio value="expired" style={{ fontSize: 12 }}>Chỉ xuất CC đã hết hạn</Radio>
                </Space>
              </Radio.Group>
            </div>
          )}
        </div>
      ),
    };
  });

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      title={
        <Space>
          <ExportOutlined style={{ color: '#1890ff' }} />
          <Text strong style={{ fontSize: 16 }}>Xuất Excel tùy chọn</Text>
        </Space>
      }
      width={680}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {targetUsers.length} nhân viên · {totalSelected} trường
          </Text>
          <Space>
            <Button onClick={onCancel}>Huỷ</Button>
            <Button
              type="primary"
              icon={<ExportOutlined />}
              onClick={handleExport}
              loading={exporting}
              disabled={totalSelected === 0}
            >
              Xuất Excel
            </Button>
          </Space>
        </div>
      }
      styles={{ body: { maxHeight: '65vh', overflowY: 'auto', padding: '16px 24px' } }}
    >
      <Spin spinning={exporting} tip="Đang xuất dữ liệu...">
        {/* ── Phạm vi ── */}
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>Phạm vi xuất</Text>
          <Radio.Group value={scope} onChange={e => setScope(e.target.value)}>
            <Space direction="vertical" size={4}>
              <Radio value="ALL" style={{ fontSize: 13 }}>
                Tất cả nhân viên <Tag style={{ marginLeft: 4 }}>{users.length}</Tag>
              </Radio>
              <Radio value="SELECTED" style={{ fontSize: 13 }} disabled={selectedRowKeys.length === 0}>
                Nhân viên đã chọn
                <Tag color={selectedRowKeys.length > 0 ? 'blue' : 'default'} style={{ marginLeft: 4 }}>
                  {selectedRowKeys.length}
                </Tag>
                {selectedRowKeys.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>(Tick chọn trên bảng)</Text>
                )}
              </Radio>
            </Space>
          </Radio.Group>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        {/* ── Chọn trường ── */}
        <Text strong style={{ fontSize: 13, marginBottom: 8, display: 'block' }}>Chọn trường thông tin</Text>
        <Collapse
          items={collapseItems}
          defaultActiveKey={['personal']}
          bordered={false}
          style={{ background: '#fafafa' }}
          size="small"
        />
      </Spin>
    </Modal>
  );
};

export default ExportModal;
