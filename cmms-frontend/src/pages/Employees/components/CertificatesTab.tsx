import React, { useEffect, useState } from 'react';
import {
  Table,
  Card,
  Button,
  Tag,
  Space,
  Input,
  Row,
  Col,
  Modal,
  Form,
  Select,
  DatePicker,
  Popconfirm,
  message,
  Typography,
  Empty,
  Avatar,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  UserOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import certificatesApi from '../../../apis/certificates';
import { IEmployeeCertificate, ITrainingProgram } from '../../../types/certificates.types';
import { IUser } from '../../../types/user.types';
import { getCertificateCategory, CertCategoryGroup } from '../../../utils/excelHelper';
import CertificateImportModal from './CertificateImportModal';

const { Text } = Typography;

interface CertificatesTabProps {
  users: IUser[];
  canWrite: boolean;
  onViewUser: (user: IUser) => void;
  isMobile: boolean;
}

export const CertificatesTab: React.FC<CertificatesTabProps> = ({
  users,
  canWrite,
  onViewUser,
  isMobile,
}) => {
  const [certificates, setCertificates] = useState<IEmployeeCertificate[]>([]);
  const [programs, setPrograms] = useState<ITrainingProgram[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<CertCategoryGroup | null>(null);

  // Modal Import Excel State
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<IEmployeeCertificate | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [certData, progData] = await Promise.all([
        certificatesApi.getAllCertificates().catch(() => []),
        certificatesApi.getTrainingPrograms().catch(() => []),
      ]);
      setCertificates(Array.isArray(certData) ? certData : []);
      setPrograms(Array.isArray(progData) ? progData : []);
    } catch (e: any) {
      console.error(e);
      message.error('Lỗi khi tải danh sách chứng chỉ đào tạo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCertName = (c: IEmployeeCertificate): string => {
    if (c.program?.name) return c.program.name;
    const cat = getCertificateCategory(c);
    if (cat === 'GPLX') {
      const cls = c.license_class || '';
      return cls ? `GPLX Hạng ${cls}` : (c.degree_type || c.certificate_number || 'Giấy phép lái xe');
    }
    return c.degree_type || c.qualification_type || c.certificate_number || 'Chứng chỉ / Bằng cấp';
  };

  const getIssuingAuthority = (c: IEmployeeCertificate): string => {
    return c.school_name || c.issuing_place || '-';
  };

  const getExpiryDate = (c: IEmployeeCertificate): string | null => {
    return c.next_training_date || c.expiry_date || c.end_date || null;
  };

  const handleCreateOrUpdate = async (values: any) => {
    setModalLoading(true);
    try {
      const payload: any = {
        certificate_number: values.certificate_number,
        issue_date: values.issue_date ? values.issue_date.format('YYYY-MM-DD') : undefined,
        expiry_date: values.expiry_date ? values.expiry_date.format('YYYY-MM-DD') : undefined,
        issuing_place: values.issuing_authority,
        school_name: values.issuing_authority,
      };

      if (values.certificate_type === 'CCCM') {
        payload.type = 'CCCM';
        const foundProg = programs.find((p) => p.name.toLowerCase() === values.certificate_name?.toLowerCase());
        if (foundProg) {
          payload.program_id = foundProg.id;
        } else {
          payload.degree_type = values.certificate_name;
        }
      } else if (values.certificate_type === 'GPLX' || values.certificate_type === 'GIAY_PHEP') {
        payload.type = 'GIAY_PHEP';
        payload.qualification_type = 'GIAY_PHEP_LAI_XE';
        payload.license_class = values.certificate_name;
      } else {
        payload.type = 'BANG_CAP';
        payload.qualification_type = 'BANG_CAP';
        payload.degree_type = values.certificate_name;
      }

      if (editingCert) {
        await certificatesApi.updateCertificate(editingCert.id, payload);
        message.success('Cập nhật chứng chỉ thành công');
      } else {
        await certificatesApi.createCertificate(values.user_id, payload);
        message.success('Cấp mới chứng chỉ thành công');
      }
      setModalOpen(false);
      form.resetFields();
      fetchData();
    } catch (e: any) {
      message.error(e.message || 'Lỗi khi lưu chứng chỉ');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await certificatesApi.deleteCertificate(id);
      message.success('Đã xóa chứng chỉ');
      fetchData();
    } catch (e: any) {
      message.error(e.message || 'Xóa chứng chỉ thất bại');
    }
  };

  const openAdd = () => {
    setEditingCert(null);
    form.resetFields();
    form.setFieldsValue({
      certificate_type: 'CCCM',
      issue_date: dayjs(),
    });
    setModalOpen(true);
  };

  const openEdit = (cert: IEmployeeCertificate) => {
    setEditingCert(cert);
    form.resetFields();
    const expiry = getExpiryDate(cert);
    const cat = getCertificateCategory(cert);
    form.setFieldsValue({
      user_id: cert.user?.user_id,
      certificate_type: cat,
      certificate_name: cert.license_class || cert.degree_type || cert.program?.name || getCertName(cert),
      certificate_number: cert.certificate_number || cert.decision_number,
      issuing_authority: getIssuingAuthority(cert),
      issue_date: cert.issue_date ? dayjs(cert.issue_date) : undefined,
      expiry_date: expiry ? dayjs(expiry) : undefined,
    });
    setModalOpen(true);
  };

  // Filter
  const filtered = certificates.filter((c) => {
    if (filterType && getCertificateCategory(c) !== filterType) return false;
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      const userName = c.user?.name?.toLowerCase() || '';
      const certName = getCertName(c).toLowerCase();
      const num = (c.certificate_number || c.decision_number || '').toLowerCase();
      return userName.includes(q) || certName.includes(q) || num.includes(q);
    }
    return true;
  });

  // Expiring check
  const expiringList = certificates.filter((c) => {
    const exp = getExpiryDate(c);
    if (!exp) return false;
    const diff = dayjs(exp).diff(dayjs(), 'days');
    return diff >= 0 && diff <= 60;
  });

  const columns = [
    {
      title: 'Tên chứng chỉ / Bằng cấp',
      key: 'name',
      render: (_: any, r: IEmployeeCertificate) => (
        <div>
          <strong style={{ color: '#003a8c' }}>{getCertName(r)}</strong>
          {r.certificate_number && (
            <div style={{ fontSize: 11, color: '#888' }}>Số: {r.certificate_number}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Nhân viên sở hữu',
      key: 'user',
      render: (_: any, r: IEmployeeCertificate) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <span
            style={{ fontWeight: 600, color: '#1890ff', cursor: 'pointer' }}
            onClick={() => r.user && onViewUser(r.user as any)}
          >
            {r.user?.name}
          </span>
          <Text type="secondary" style={{ fontSize: 11 }}>
            ({r.user?.employee_code || r.user?.user_id})
          </Text>
        </Space>
      ),
    },
    {
      title: 'Loại chứng chỉ',
      key: 'category',
      width: 170,
      render: (_: any, r: IEmployeeCertificate) => {
        const cat = getCertificateCategory(r);
        if (cat === 'CCCM') return <Tag color="blue">CCCM / Đào tạo</Tag>;
        if (cat === 'GPLX') return <Tag color="green">GPLX</Tag>;
        if (r.qualification_type === 'CHUNG_CHI_NGOAI_NGU') {
          return <Tag color="purple">Bằng cấp (Ngoại ngữ)</Tag>;
        }
        if (r.qualification_type === 'CHUNG_CHI_TIN_HOC') {
          return <Tag color="purple">Bằng cấp (Tin học)</Tag>;
        }
        return <Tag color="purple">Bằng cấp</Tag>;
      },
    },
    {
      title: 'Cơ quan cấp',
      key: 'issuer',
      render: (_: any, r: IEmployeeCertificate) => getIssuingAuthority(r),
    },
    {
      title: 'Thời hạn',
      key: 'duration',
      render: (_: any, r: IEmployeeCertificate) => {
        const issue = r.issue_date ? dayjs(r.issue_date).format('DD/MM/YYYY') : '';
        const expiryDateVal = getExpiryDate(r);
        const expiry = expiryDateVal ? dayjs(expiryDateVal).format('DD/MM/YYYY') : 'Vô thời hạn';
        const isExpiring = expiryDateVal && dayjs(expiryDateVal).diff(dayjs(), 'days') <= 60 && dayjs(expiryDateVal).diff(dayjs(), 'days') >= 0;
        const isExpired = expiryDateVal && dayjs(expiryDateVal).isBefore(dayjs());
        return (
          <div>
            <span>{issue} - {expiry}</span>
            {isExpired && (
              <Tag color="error" style={{ marginLeft: 6, fontSize: 10 }}>
                Hết hạn
              </Tag>
            )}
            {isExpiring && !isExpired && (
              <Tag color="warning" icon={<WarningOutlined />} style={{ marginLeft: 6, fontSize: 10 }}>
                Sắp hết hạn
              </Tag>
            )}
          </div>
        );
      },
    },
    ...(canWrite
      ? [
          {
            title: 'Thao tác',
            key: 'action',
            width: 100,
            align: 'center' as const,
            render: (_: any, r: IEmployeeCertificate) => (
              <Space size={4}>
                <Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => openEdit(r)} />
                <Popconfirm title="Xóa chứng chỉ này?" onConfirm={() => handleDelete(r.id)}>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      {/* Expiring Alert */}
      {expiringList.length > 0 && (
        <Card
          size="small"
          style={{
            marginBottom: 16,
            background: '#fffbe6',
            borderColor: '#ffe58f',
            borderRadius: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />
            <div>
              <strong style={{ color: '#ad6800' }}>Cảnh báo đào tạo:</strong> Có{' '}
              <strong>{expiringList.length}</strong> chứng chỉ/bằng lái sắp đến hạn đào tạo lại hoặc sát hạch trong 60 ngày tới.
            </div>
          </div>
        </Card>
      )}

      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <Space wrap style={{ flex: 1 }}>
          <Input
            placeholder="Tìm theo tên NV, chứng chỉ, số hiệu..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 260 }}
            allowClear
          />
          <Select
            placeholder="Loại chứng chỉ"
            allowClear
            value={filterType}
            onChange={(val) => setFilterType(val || null)}
            style={{ width: isMobile ? '100%' : 260 }}
          >
            <Select.Option value="CCCM">CCCM / Đào tạo</Select.Option>
            <Select.Option value="BANG_CAP">Bằng cấp (Đại học, Tin học, Tiếng Anh...)</Select.Option>
            <Select.Option value="GPLX">GPLX (Giấy phép lái xe)</Select.Option>
          </Select>
        </Space>

        {canWrite && (
          <Space wrap>
            <Button
              icon={<UploadOutlined />}
              onClick={() => setImportModalOpen(true)}
            >
              Nhập từ Excel
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
              Cấp chứng chỉ mới
            </Button>
          </Space>
        )}
      </div>

      {/* Responsive View */}
      {isMobile ? (
        <Row gutter={[12, 12]}>
          {filtered.length === 0 ? (
            <Col span={24}>
              <Empty description="Không có chứng chỉ nào" />
            </Col>
          ) : (
            filtered.map((c) => {
              const name = getCertName(c);
              const authority = getIssuingAuthority(c);
              const expVal = getExpiryDate(c);
              const cat = getCertificateCategory(c);
              return (
                <Col xs={24} sm={12} key={c.id}>
                  <Card size="small" style={{ borderRadius: 8, border: '1px solid #e8e8e8' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{name}</div>
                        <div style={{ fontSize: 12, color: '#1890ff', cursor: 'pointer' }} onClick={() => c.user && onViewUser(c.user as any)}>
                          👤 {c.user?.name}
                        </div>
                      </div>
                      <Tag color={cat === 'CCCM' ? 'blue' : cat === 'GPLX' ? 'green' : 'purple'}>
                        {cat === 'CCCM' ? 'CCCM / Đào tạo' : cat === 'GPLX' ? 'GPLX' : 'Bằng cấp'}
                      </Tag>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: '#555', lineHeight: 1.5 }}>
                      <div>Số hiệu: <strong>{c.certificate_number || c.decision_number || 'N/A'}</strong></div>
                      <div>Cơ quan cấp: <strong>{authority}</strong></div>
                      <div>
                        Hạn dùng:{' '}
                        <strong>{expVal ? dayjs(expVal).format('DD/MM/YYYY') : 'Vô thời hạn'}</strong>
                      </div>
                    </div>

                    {canWrite && (
                      <div style={{ marginTop: 10, borderTop: '1px solid #f0f0f0', paddingTop: 6, display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(c)}>
                          Sửa
                        </Button>
                        <Popconfirm title="Xóa chứng chỉ?" onConfirm={() => handleDelete(c.id)}>
                          <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                            Xóa
                          </Button>
                        </Popconfirm>
                      </div>
                    )}
                  </Card>
                </Col>
              );
            })
          )}
        </Row>
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      )}

      {/* Modal Add / Edit */}
      <Modal
        title={editingCert ? 'Chỉnh sửa chứng chỉ' : 'Cấp mới Chứng chỉ / Bằng cấp'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={modalLoading}
        destroyOnClose
        width={isMobile ? '95vw' : 540}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate} style={{ marginTop: 16 }}>
          <Form.Item name="user_id" label="Nhân viên" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select showSearch placeholder="Chọn nhân viên" optionFilterProp="children" disabled={!!editingCert}>
              {users.map((u) => (
                <Select.Option key={u.user_id} value={u.user_id}>
                  {u.name} ({u.employee_code || u.user_id})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="certificate_type" label="Phân loại chứng chỉ" rules={[{ required: true, message: 'Chọn phân loại' }]}>
            <Select>
              <Select.Option value="CCCM">CCCM / Đào tạo</Select.Option>
              <Select.Option value="BANG_CAP">Bằng cấp (Đại học, Tin học, Tiếng Anh...)</Select.Option>
              <Select.Option value="GPLX">GPLX (Giấy phép lái xe sân đỗ / đường bộ)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="certificate_name"
            label="Tên chứng chỉ / Bằng cấp"
            rules={[{ required: true, message: 'Nhập tên chứng chỉ hoặc hạng bằng' }]}
          >
            <Input placeholder="VD: Ô tô thông thường, TOEIC, Hạng C, Kỹ sư CNTT..." />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="certificate_number" label="Số hiệu / Mã chứng chỉ">
                <Input placeholder="VD: CCCM-2026/01, 123456789..." />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="issuing_authority" label="Đơn vị / Cơ quan cấp">
                <Input placeholder="VD: Cục Hàng Không, ACV, IIG Việt Nam, Sở GTVT..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item name="issue_date" label="Ngày cấp">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="expiry_date" label="Ngày hết hạn (nếu có)">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Modal Import Excel */}
      <CertificateImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          fetchData();
        }}
        users={users}
        programs={programs}
      />
    </div>
  );
};

export default CertificatesTab;
