import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Upload,
  Button,
  message,
  DatePicker,
  Tabs,
  Row,
  Col,
  Tag,
  Tooltip,
} from 'antd';
import {
  UploadOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  UserAddOutlined,
  EditOutlined,
  ApartmentOutlined,
  IdcardOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import { ICreateUser, IDepartment, IUser } from '../../../types/user.types';
import { IDeviceGroup } from '../../../apis/device-groups';
import { uploadSignature } from '../../../apis/users';
import { getToken } from '../../../utils/auth';
import dayjs from 'dayjs';

interface UserModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (values: ICreateUser) => void;
  initialValues?: IUser | null;
  departments: IDepartment[];
  deviceGroups: IDeviceGroup[];
  loading?: boolean;
  readOnly?: boolean;
}

const UserModal: React.FC<UserModalProps> = ({
  open,
  onCancel,
  onOk,
  initialValues,
  departments,
  deviceGroups,
  loading,
  readOnly,
}) => {
  const [form] = Form.useForm();
  const isEdit = !!initialValues;
  const [activeTab, setActiveTab] = useState<string>('account');
  const [currentSignature, setCurrentSignature] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setActiveTab('account');
      if (initialValues) {
        // Map user_departments sang format cho Form.List
        const deptAssignments =
          initialValues.user_departments?.map((ud) => ({
            dept_id: ud.dept_id,
            role_in_dept: ud.role_in_dept || 'MEMBER',
            is_primary: ud.is_primary || false,
          })) || [];

        form.setFieldsValue({
          ...initialValues,
          dept_id: initialValues.department?.dept_id,
          group_id: initialValues.user_device_groups?.[0]?.group_id,
          is_group_lead: initialValues.user_device_groups?.[0]?.is_group_lead,
          password: '',
          confirmPassword: '',
          date_of_birth: initialValues.date_of_birth ? dayjs(initialValues.date_of_birth) : null,
          cccd_issue_date: initialValues.cccd_issue_date ? dayjs(initialValues.cccd_issue_date) : null,
          dept_assignments:
            deptAssignments.length > 0
              ? deptAssignments
              : initialValues.department?.dept_id
              ? [
                  {
                    dept_id: initialValues.department?.dept_id,
                    role_in_dept: 'MEMBER',
                    is_primary: true,
                  },
                ]
              : [],
        });
        setCurrentSignature(initialValues.signature_url || null);
      } else {
        form.resetFields();
        form.setFieldsValue({
          status: 'active',
          role: 'OPERATOR',
          is_group_lead: false,
          dept_assignments: [],
        });
        setCurrentSignature(null);
      }
    }
  }, [open, initialValues, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const formatted = {
        ...values,
        date_of_birth: values.date_of_birth ? dayjs(values.date_of_birth).format('YYYY-MM-DD') : null,
        cccd_issue_date: values.cccd_issue_date ? dayjs(values.cccd_issue_date).format('YYYY-MM-DD') : null,
      };
      onOk(formatted);
    } catch (error: any) {
      if (error?.errorFields?.length > 0) {
        const firstErrName = error.errorFields[0].name[0];
        const profileFields = [
          'phone_number',
          'date_of_birth',
          'place_of_birth',
          'cccd_issue_date',
          'hometown',
          'permanent_address',
          'temporary_address',
        ];
        if (profileFields.includes(firstErrName)) {
          setActiveTab('profile');
        } else {
          setActiveTab('account');
        }
        message.warning('Vui lòng kiểm tra lại các trường thông tin bắt buộc');
      }
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 6 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: isEdit ? '#eff6ff' : '#ecfdf5',
              color: isEdit ? '#2563eb' : '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {isEdit ? <EditOutlined /> : <UserAddOutlined />}
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {readOnly
                ? 'Chi tiết hồ sơ người dùng'
                : isEdit
                ? 'Chỉnh sửa tài khoản & nhân sự'
                : 'Thêm tài khoản người dùng mới'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>
              {isEdit
                ? `Cập nhật phân quyền, đơn vị và lý lịch của ${initialValues?.name || 'nhân sự'}`
                : 'Khởi tạo tài khoản hệ thống và phân bổ đơn vị công tác'}
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={780}
      okText={isEdit ? 'Lưu thay đổi' : 'Tạo người dùng'}
      cancelText="Hủy bỏ"
      footer={readOnly ? null : undefined}
      destroyOnClose
    >
      <Form form={form} layout="vertical" disabled={readOnly} style={{ marginTop: 8 }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'account',
              label: (
                <span style={{ fontSize: 14 }}>
                  <ApartmentOutlined style={{ marginRight: 6 }} />
                  Tài khoản & Đơn vị công tác
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  {/* Nhóm 1: Định danh cơ bản */}
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="name"
                        label="Họ và tên"
                        rules={[{ required: true, message: 'Vui lòng nhập họ và tên' }]}
                      >
                        <Input placeholder="Nguyễn Văn A" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="email"
                        label="Email đăng nhập"
                        rules={[
                          { required: true, message: 'Vui lòng nhập email' },
                          { type: 'email', message: 'Email không hợp lệ' },
                        ]}
                      >
                        <Input placeholder="user@vcs.vn" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {!isEdit && !readOnly && (
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          name="password"
                          label="Mật khẩu khởi tạo"
                          rules={[{ required: true, message: 'Vui lòng nhập mật khẩu khởi tạo' }]}
                        >
                          <Input.Password placeholder="Nhập mật khẩu cho tài khoản mới" />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="employee_code" label="Mã số nhân viên">
                        <Input placeholder="Ví dụ: NV001" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="citizen_identification_card"
                        label="Số CCCD / CMND"
                        rules={[{ required: true, message: 'Vui lòng nhập số CCCD' }]}
                      >
                        <Input placeholder="12 chữ số" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="position"
                        label="Chức vụ chuyên môn"
                        rules={[{ required: true, message: 'Vui lòng nhập chức vụ' }]}
                      >
                        <Input placeholder="Ví dụ: Nhân viên VHTTB, Kỹ thuật viên..." />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="role"
                        label="Vai trò hệ thống"
                        rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
                      >
                        <Select placeholder="Chọn vai trò">
                          <Select.Option value="OPERATOR">
                            <Tag color="green">Vận hành (Operator)</Tag>
                          </Select.Option>
                          <Select.Option value="TECHNICIAN">
                            <Tag color="cyan">Kỹ thuật (Technician)</Tag>
                          </Select.Option>
                          <Select.Option value="TEAM_LEAD">
                            <Tag color="blue">Tổ trưởng (Team Lead)</Tag>
                          </Select.Option>
                          <Select.Option value="UNIT_HEAD">
                            <Tag color="orange">Cán bộ Đội (Unit Head)</Tag>
                          </Select.Option>
                          <Select.Option value="DIRECTOR">
                            <Tag color="purple">Ban Giám Đốc (Director)</Tag>
                          </Select.Option>
                          <Select.Option value="HR_MANAGER">
                            <Tag color="magenta">Quản lý Nhân sự (HR)</Tag>
                          </Select.Option>
                          <Select.Option value="ADMIN">
                            <Tag color="red">Quản trị viên (Admin)</Tag>
                          </Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item name="status" label="Trạng thái tài khoản">
                        <Select>
                          <Select.Option value="active">
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>🟢 Đang hoạt động</span>
                          </Select.Option>
                          <Select.Option value="deactive">
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>🔴 Tạm khóa / Ngừng hoạt động</span>
                          </Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Nhóm 2: Đơn vị tổ chức kiêm nhiệm */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0',
                      marginTop: 8,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 10,
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                          🏛️ Đơn vị tổ chức & Kiêm nhiệm
                        </span>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>
                          Phòng ban / Đội / Tổ mà nhân viên trực thuộc hoặc kiêm nhiệm
                        </div>
                      </div>
                    </div>

                    <Form.List name="dept_assignments">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <div
                              key={key}
                              style={{
                                display: 'flex',
                                gap: 8,
                                alignItems: 'center',
                                marginBottom: 10,
                                background: '#fff',
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <Form.Item
                                {...restField}
                                name={[name, 'dept_id']}
                                rules={[{ required: true, message: 'Chọn đơn vị' }]}
                                style={{ flex: 2, marginBottom: 0 }}
                              >
                                <Select
                                  showSearch
                                  optionFilterProp="children"
                                  placeholder="Chọn phòng ban / đội / tổ"
                                >
                                  {departments.map((d) => (
                                    <Select.Option key={d.dept_id} value={d.dept_id}>
                                      {d.name}
                                      {d.level
                                        ? ` (${d.level === 'PHONG_BAN' ? 'PB' : d.level === 'DOI' ? 'Đội' : 'Tổ'})`
                                        : ''}
                                    </Select.Option>
                                  ))}
                                </Select>
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, 'role_in_dept']}
                                style={{ flex: 1.2, marginBottom: 0 }}
                                initialValue="MEMBER"
                              >
                                <Select>
                                  <Select.Option value="MEMBER">Thành viên</Select.Option>
                                  <Select.Option value="DEPUTY_LEAD">Phó đơn vị</Select.Option>
                                  <Select.Option value="LEAD">Trưởng đơn vị</Select.Option>
                                </Select>
                              </Form.Item>

                              <Form.Item
                                {...restField}
                                name={[name, 'is_primary']}
                                valuePropName="checked"
                                style={{ marginBottom: 0 }}
                              >
                                <Tooltip title="Đánh dấu là đơn vị chính">
                                  <Switch checkedChildren="Chính" unCheckedChildren="Phụ" />
                                </Tooltip>
                              </Form.Item>

                              {!readOnly && (
                                <Tooltip title="Xóa phân bổ">
                                  <MinusCircleOutlined
                                    onClick={() => remove(name)}
                                    style={{ color: '#ef4444', fontSize: 18, cursor: 'pointer', padding: 4 }}
                                  />
                                </Tooltip>
                              )}
                            </div>
                          ))}

                          {!readOnly && (
                            <Button
                              type="dashed"
                              onClick={() => add({ role_in_dept: 'MEMBER', is_primary: false })}
                              block
                              icon={<PlusOutlined />}
                              style={{ borderRadius: 8 }}
                            >
                              Thêm đơn vị công tác
                            </Button>
                          )}
                        </>
                      )}
                    </Form.List>
                  </div>

                  {/* Nhóm 3: Nhóm thiết bị */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      padding: '14px 16px',
                      border: '1px solid #e2e8f0',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginBottom: 10 }}>
                      🚜 Phụ trách Nhóm thiết bị (Device Group)
                    </div>
                    <Row gutter={16} align="middle">
                      <Col span={16}>
                        <Form.Item
                          name="group_id"
                          label="Nhóm thiết bị chỉ định"
                          style={{ marginBottom: 0 }}
                        >
                          <Select allowClear placeholder="Chọn nhóm thiết bị (nếu có)">
                            {deviceGroups.map((g) => (
                              <Select.Option key={g.id} value={g.id}>
                                {g.name}
                              </Select.Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </Col>

                      <Col span={8}>
                        <Form.Item
                          name="is_group_lead"
                          label="Vai trò quản lý nhóm"
                          valuePropName="checked"
                          style={{ marginBottom: 0 }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Switch />
                            <span style={{ fontSize: 13, color: '#475569' }}>Trưởng nhóm</span>
                          </div>
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </div>
              ),
            },
            {
              key: 'profile',
              label: (
                <span style={{ fontSize: 14 }}>
                  <IdcardOutlined style={{ marginRight: 6 }} />
                  Lý lịch & Chữ ký số
                </span>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="phone_number" label="Số điện thoại liên lạc">
                        <Input placeholder="0901234567" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="date_of_birth" label="Ngày sinh">
                        <DatePicker
                          format="DD/MM/YYYY"
                          style={{ width: '100%' }}
                          placeholder="Chọn ngày sinh"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item name="place_of_birth" label="Nơi sinh">
                        <Input placeholder="Ví dụ: TP. Hồ Chí Minh" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={8}>
                      <Form.Item name="cccd_issue_date" label="Ngày cấp CCCD">
                        <DatePicker
                          format="DD/MM/YYYY"
                          style={{ width: '100%' }}
                          placeholder="Chọn ngày cấp"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={16}>
                      <Form.Item name="hometown" label="Quê quán">
                        <Input placeholder="Xã/Phường, Huyện/Quận, Tỉnh/Thành phố" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item name="permanent_address" label="Địa chỉ thường trú">
                        <Input placeholder="Số nhà, đường, tổ/khu phố..." />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={24}>
                      <Form.Item name="temporary_address" label="Địa chỉ tạm trú hiện nay">
                        <Input placeholder="Địa chỉ tạm trú (nếu khác địa chỉ thường trú)" />
                      </Form.Item>
                    </Col>
                  </Row>

                  {/* Chữ ký số */}
                  {(isEdit || readOnly) && (
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: 10,
                        padding: '16px',
                        border: '1px solid #e2e8f0',
                        marginTop: 8,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 13.5,
                          color: '#0f172a',
                          marginBottom: 4,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <FileDoneOutlined style={{ color: '#2563eb' }} /> Chữ ký số điện tử
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>
                        Chữ ký được sử dụng trong các quy trình phê duyệt phiếu sửa chữa, bảo dưỡng và biên bản
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div
                          style={{
                            width: 200,
                            height: 80,
                            borderRadius: 8,
                            border: currentSignature ? '1px solid #cbd5e1' : '1px dashed #cbd5e1',
                            background: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            padding: 6,
                          }}
                        >
                          {currentSignature ? (
                            <img
                              src={currentSignature}
                              alt="Chữ ký số"
                              style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                              Chưa có chữ ký
                            </span>
                          )}
                        </div>

                        {!readOnly && (
                          <Upload
                            showUploadList={false}
                            accept="image/*"
                            customRequest={async (options) => {
                              const { file, onSuccess, onError } = options;
                              try {
                                const token = getToken();
                                const res = await uploadSignature(
                                  initialValues!.user_id,
                                  file as File,
                                  token
                                );
                                form.setFieldsValue({ signature_url: res.signature_url });
                                setCurrentSignature(res.signature_url);
                                message.success('Tải lên chữ ký số thành công!');
                                onSuccess?.(res);
                              } catch (err: any) {
                                message.error(err?.message || 'Tải lên thất bại');
                                onError?.(err);
                              }
                            }}
                          >
                            <Button icon={<UploadOutlined />} style={{ borderRadius: 6 }}>
                              {currentSignature ? 'Thay đổi chữ ký' : 'Tải lên chữ ký'}
                            </Button>
                          </Upload>
                        )}
                      </div>

                      <Form.Item name="signature_url" hidden>
                        <Input />
                      </Form.Item>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  );
};

export default UserModal;
