import React, { useEffect, useState } from 'react';
import { Modal, Form, Input, Select, DatePicker, Upload, message, InputNumber, Button, Radio, Checkbox } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { IEmployeeCertificate } from '../../../types/certificates.types';
import { IUser } from '../../../types/user.types';
import dayjs from 'dayjs';

type QualSubType = 'BANG_CAP' | 'GIAY_PHEP_LAI_XE' | 'CHUNG_CHI_NGOAI_NGU' | 'CHUNG_CHI_TIN_HOC';

interface QualificationModalProps {
    open: boolean;
    onCancel: () => void;
    onOk: (values: any, file?: File | null) => void;
    initialValues?: IEmployeeCertificate | null;
    loading?: boolean;
    user?: IUser | null;
    okText?: string;
}

const DEGREE_TYPES = ['Trung cấp', 'Cao đẳng', 'Cử nhân', 'Kỹ sư', 'Thạc sĩ', 'Tiến sĩ'];
const STUDY_MODES = ['Chính quy', 'Tại chức', 'Từ xa', 'Liên thông'];
const GRADINGS = ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình'];
const LICENSE_CLASSES = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'C', 'D', 'E', 'F', 'FB2', 'FC', 'FD', 'FE'];
const NGOAI_NGU_TYPES = ['TOEIC', 'IELTS', 'TOEFL', 'Aptis', 'VSTEP', 'Khác'];
const TIN_HOC_TYPES = ['MOS', 'IC3', 'Ứng dụng CNTT cơ bản', 'Ứng dụng CNTT nâng cao', 'Khác'];

const QualificationModal: React.FC<QualificationModalProps> = ({
    open,
    onCancel,
    onOk,
    initialValues,
    loading,
    user,
    okText
}) => {
    const [form] = Form.useForm();
    const isEdit = !!initialValues;
    const [fileList, setFileList] = useState<any[]>([]);
    const [subType, setSubType] = useState<QualSubType>('BANG_CAP');
    const [isPermanent, setIsPermanent] = useState(false);

    useEffect(() => {
        if (open && initialValues) {
            const qualType = initialValues.qualification_type as QualSubType || 'BANG_CAP';
            setSubType(qualType);
            setIsPermanent(initialValues.is_permanent || false);
            form.setFieldsValue({
                ...initialValues,
                qualification_type: qualType,
                issue_date: initialValues.issue_date ? dayjs(initialValues.issue_date) : null,
                expiry_date: initialValues.expiry_date ? dayjs(initialValues.expiry_date) : null,
                is_permanent: initialValues.is_permanent || false,
            });
            if (initialValues.file_url) {
                setFileList([{
                    uid: '-1',
                    name: initialValues.file_url.split('/').pop(),
                    status: 'done',
                    url: `http://localhost:3000${initialValues.file_url}`,
                }]);
            } else {
                setFileList([]);
            }
        } else if (open && !initialValues) {
            form.resetFields();
            setFileList([]);
            setSubType('BANG_CAP');
            setIsPermanent(false);
        }
    }, [open, initialValues, form]);

    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();
            const formattedValues = {
                ...values,
                type: 'BANG_CAP' as const, // All qualifications go under BANG_CAP certificate type
                qualification_type: subType,
                issue_date: values.issue_date?.format('YYYY-MM-DD'),
                expiry_date: values.expiry_date?.format('YYYY-MM-DD'),
                is_permanent: ['GIAY_PHEP_LAI_XE', 'CHUNG_CHI_NGOAI_NGU', 'CHUNG_CHI_TIN_HOC'].includes(subType) ? isPermanent : false,
            };
            const file = fileList.length > 0 && fileList[0].originFileObj ? fileList[0].originFileObj : null;
            onOk(formattedValues, file);
        } catch (error) {
            console.error('Validation failed:', error);
        }
    };

    const handleUploadChange = ({ fileList: newFileList }: any) => {
        setFileList(newFileList.slice(-1));
    };

    const beforeUpload = (file: File) => {
        const isPdfOrImg = file.type === 'application/pdf' || file.type.startsWith('image/');
        if (!isPdfOrImg) {
            message.error('Chỉ hỗ trợ file PDF hoặc Hình ảnh!');
        }
        return isPdfOrImg || Upload.LIST_IGNORE;
    };

    const getTitle = () => {
        if (isEdit) {
            const map: Record<string, string> = { 
                BANG_CAP: 'Cập nhật Bằng cấp', 
                GIAY_PHEP_LAI_XE: 'Cập nhật Giấy phép lái xe',
                CHUNG_CHI_NGOAI_NGU: 'Cập nhật Chứng chỉ ngoại ngữ',
                CHUNG_CHI_TIN_HOC: 'Cập nhật Chứng chỉ tin học'
            };
            return map[subType] || 'Cập nhật thông tin';
        }
        return 'Thêm mới chứng chỉ / trình độ';
    };

    return (
        <Modal
            title={
                <div>
                    <div>{getTitle()}</div>
                    {user && (
                        <div style={{ fontSize: '14px', fontWeight: 'normal', color: '#1890ff', marginTop: 4 }}>
                            Học viên: {user.name} - Mã: {user.user_id}
                        </div>
                    )}
                </div>
            }
            open={open}
            onCancel={onCancel}
            onOk={handleSubmit}
            confirmLoading={loading}
            width={700}
            style={{ top: 40 }}
            footer={[
                <Button key="back" onClick={onCancel}>Đóng</Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>{okText || 'Lưu'}</Button>,
            ]}
        >
            <Form form={form} layout="vertical" requiredMark={false}>
                {/* Loại trình độ */}
                {!isEdit && (
                    <Form.Item label={<span style={{ fontWeight: 600 }}>Loại trình độ</span>}>
                        <Radio.Group
                            value={subType}
                            onChange={(e) => {
                                setSubType(e.target.value);
                                form.resetFields();
                                setIsPermanent(false);
                            }}
                            optionType="button"
                            buttonStyle="solid"
                        >
                            <Radio.Button value="BANG_CAP">🎓 Bằng cấp</Radio.Button>
                            <Radio.Button value="GIAY_PHEP_LAI_XE">🚗 GPLX</Radio.Button>
                            <Radio.Button value="CHUNG_CHI_NGOAI_NGU">🌍 Ngoại ngữ</Radio.Button>
                            <Radio.Button value="CHUNG_CHI_TIN_HOC">💻 Tin học</Radio.Button>
                        </Radio.Group>
                    </Form.Item>
                )}

                {/* === BẰNG CẤP FORM === */}
                {subType === 'BANG_CAP' && (
                    <>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
                            <Form.Item
                                name="degree_type"
                                label={<span>Loại bằng <span style={{ color: 'red' }}>*</span></span>}
                                style={{ flex: 1 }}
                                rules={[{ required: true, message: 'Vui lòng chọn loại bằng' }]}
                            >
                                <Select placeholder="-- Chọn --">
                                    {DEGREE_TYPES.map(d => (
                                        <Select.Option key={d} value={d}>{d}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="major"
                                label={<span>Chuyên ngành <span style={{ color: 'red' }}>*</span></span>}
                                style={{ flex: 2 }}
                                rules={[{ required: true, message: 'Vui lòng nhập chuyên ngành' }]}
                            >
                                <Input placeholder="Ví dụ: Tài chính - Ngân hàng" />
                            </Form.Item>
                        </div>

                        <Form.Item
                            name="school_name"
                            label={<span>Trường / Cơ sở đào tạo <span style={{ color: 'red' }}>*</span></span>}
                            rules={[{ required: true, message: 'Vui lòng nhập tên trường' }]}
                        >
                            <Input placeholder="Ví dụ: Đại học Hoa Sen" />
                        </Form.Item>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
                            <Form.Item
                                name="graduation_year"
                                label="Năm tốt nghiệp"
                                style={{ flex: 1 }}
                            >
                                <InputNumber min={1950} max={2100} style={{ width: '100%' }} placeholder="2013" />
                            </Form.Item>

                            <Form.Item name="grading" label="Xếp loại tốt nghiệp" style={{ flex: 1 }}>
                                <Select placeholder="-- Chọn --" allowClear>
                                    {GRADINGS.map(g => (
                                        <Select.Option key={g} value={g}>{g}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item name="study_mode" label="Hình thức đào tạo" style={{ flex: 1 }}>
                                <Select placeholder="-- Chọn --" allowClear>
                                    {STUDY_MODES.map(s => (
                                        <Select.Option key={s} value={s}>{s}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
                            <Form.Item name="certificate_number" label="Số hiệu bằng" style={{ flex: 1 }}>
                                <Input placeholder="Ví dụ: 263/TCNH" />
                            </Form.Item>
                            <Form.Item name="issue_date" label="Ngày cấp bằng" style={{ flex: 1 }}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                            </Form.Item>
                        </div>
                    </>
                )}

                {/* === GIẤY PHÉP LÁI XE FORM === */}
                {subType === 'GIAY_PHEP_LAI_XE' && (
                    <>
                        <Form.Item
                            name="license_class"
                            label={<span>Hạng giấy phép <span style={{ color: 'red' }}>*</span></span>}
                            rules={[{ required: true, message: 'Vui lòng chọn hạng' }]}
                        >
                            <Select placeholder="-- Chọn hạng --">
                                {LICENSE_CLASSES.map(c => (
                                    <Select.Option key={c} value={c}>{c}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
                            <Form.Item
                                name="certificate_number"
                                label={<span>Số giấy phép <span style={{ color: 'red' }}>*</span></span>}
                                style={{ flex: 1 }}
                                rules={[{ required: true, message: 'Vui lòng nhập số giấy phép' }]}
                            >
                                <Input placeholder="Nhập số giấy phép" />
                            </Form.Item>

                            <Form.Item name="issuing_place" label="Nơi cấp" style={{ flex: 1 }}>
                                <Input placeholder="Ví dụ: Hồ Chí Minh" />
                            </Form.Item>
                        </div>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
                            <Form.Item name="issue_date" label="Ngày cấp" style={{ flex: 1 }}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                            </Form.Item>

                            <Form.Item label="Có giá trị đến" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Form.Item name="expiry_date" noStyle>
                                        <DatePicker
                                            format="DD/MM/YYYY"
                                            style={{ width: '100%' }}
                                            placeholder="Chọn ngày"
                                            disabled={isPermanent}
                                        />
                                    </Form.Item>
                                    <Checkbox
                                        checked={isPermanent}
                                        onChange={(e) => {
                                            setIsPermanent(e.target.checked);
                                            if (e.target.checked) {
                                                form.setFieldValue('expiry_date', null);
                                            }
                                        }}
                                    >
                                        <span style={{ whiteSpace: 'nowrap' }}>Không thời hạn</span>
                                    </Checkbox>
                                </div>
                            </Form.Item>
                        </div>
                    </>
                )}

                {/* === CHỨNG CHỈ NGOẠI NGỮ / TIN HỌC FORM === */}
                {(subType === 'CHUNG_CHI_NGOAI_NGU' || subType === 'CHUNG_CHI_TIN_HOC') && (
                    <>
                        <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
                            <Form.Item
                                name="degree_type"
                                label={<span>Loại chứng chỉ <span style={{ color: 'red' }}>*</span></span>}
                                style={{ flex: 1 }}
                                rules={[{ required: true, message: 'Vui lòng chọn loại chứng chỉ' }]}
                            >
                                <Select placeholder="-- Chọn --" showSearch>
                                    {(subType === 'CHUNG_CHI_NGOAI_NGU' ? NGOAI_NGU_TYPES : TIN_HOC_TYPES).map(d => (
                                        <Select.Option key={d} value={d}>{d}</Select.Option>
                                    ))}
                                </Select>
                            </Form.Item>

                            <Form.Item
                                name="grading"
                                label="Điểm số / Xếp loại"
                                style={{ flex: 1 }}
                            >
                                <Input placeholder={subType === 'CHUNG_CHI_NGOAI_NGU' ? 'Ví dụ: 850, 7.5' : 'Ví dụ: Xuất sắc, Giỏi'} />
                            </Form.Item>
                        </div>

                        <Form.Item
                            name="school_name"
                            label={<span>Nơi cấp <span style={{ color: 'red' }}>*</span></span>}
                            rules={[{ required: true, message: 'Vui lòng nhập nơi cấp' }]}
                        >
                            <Input placeholder={subType === 'CHUNG_CHI_NGOAI_NGU' ? 'Ví dụ: IIG Việt Nam, Hội đồng Anh' : 'Ví dụ: IIG Việt Nam, ĐH KHTN'} />
                        </Form.Item>

                        <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
                            <Form.Item name="issue_date" label="Ngày cấp" style={{ flex: 1 }}>
                                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                            </Form.Item>

                            <Form.Item label="Có giá trị đến" style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <Form.Item name="expiry_date" noStyle>
                                        <DatePicker
                                            format="DD/MM/YYYY"
                                            style={{ width: '100%' }}
                                            placeholder="Chọn ngày"
                                            disabled={isPermanent}
                                        />
                                    </Form.Item>
                                    <Checkbox
                                        checked={isPermanent}
                                        onChange={(e) => {
                                            setIsPermanent(e.target.checked);
                                            if (e.target.checked) {
                                                form.setFieldValue('expiry_date', null);
                                            }
                                        }}
                                    >
                                        <span style={{ whiteSpace: 'nowrap' }}>Không thời hạn</span>
                                    </Checkbox>
                                </div>
                            </Form.Item>
                        </div>
                    </>
                )}

                {/* File upload chung */}
                <Form.Item label="File đính kèm (jpg, png, jpeg, pdf)" style={{ marginTop: 8 }}>
                    <Upload.Dragger
                        beforeUpload={beforeUpload}
                        fileList={fileList}
                        onChange={handleUploadChange}
                        maxCount={1}
                        customRequest={({ onSuccess }) => setTimeout(() => onSuccess?.("ok"), 0)}
                    >
                        <p className="ant-upload-drag-icon">
                            <InboxOutlined />
                        </p>
                        <p className="ant-upload-text">Kéo và thả file vào đây (hoặc nhấp chuột)</p>
                    </Upload.Dragger>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default QualificationModal;
