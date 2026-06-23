import React, { useEffect, useState } from 'react';
import { Drawer, Form, Input, Button, Upload, message, Avatar, Tag, Spin, Empty, Badge, Tooltip, Table, Space, Popconfirm, DatePicker, Modal, Descriptions } from 'antd';
import {
    UploadOutlined, UserOutlined, LockOutlined, WarningOutlined, PlusOutlined,
    SafetyCertificateOutlined, BookOutlined, CarOutlined, EditOutlined,
    PhoneOutlined, DeleteOutlined, CloseOutlined, FileTextOutlined,
    TrophyOutlined, CalendarOutlined, IdcardOutlined, MailOutlined,
    TeamOutlined, ToolOutlined, GlobalOutlined, DesktopOutlined, EyeOutlined
} from '@ant-design/icons';
import { IUser } from '../../../../types/user.types';
import { uploadSignature, updateUser, uploadAvatar } from '../../../../apis/users';
import { optimizeImageBeforeUpload } from '../../../../utils/imageOptimizer';
import { getToken } from '../../../../utils/auth';
import { getBackendImageUrl } from '../../../../utils/imageUrl';
import QualificationModal from '../QualificationModal';
import CertificateModal from '../CertificateModal';
import certificatesApi from '../../../../apis/certificates';
import { IEmployeeCertificate } from '../../../../types/certificates.types';
import dayjs from 'dayjs';
import { useAuthContext } from '../../../../context/AuthContext/AuthContext';
import { createProfileRequest, getMyRequests, IProfileRequest } from '../../../../apis/profileRequests';
import { createLaborContract } from '../../../../apis/laborContracts';
import { createRewardDiscipline } from '../../../../apis/rewardDisciplines';
import { Select } from 'antd';

// ─────────────────────────── Types ───────────────────────────
interface ProfileModalProps {
    open: boolean;
    onCancel: () => void;
    user: IUser | null;
    onUpdateSuccess: (updatedUser: IUser) => void;
    initialSection?: SectionKey;
}

// ─────────────────────────── Helpers ─────────────────────────
const getRoleLabel = (role: string | undefined) => {
    const map: Record<string, string> = {
        ADMIN: 'Quản trị viên', OPERATOR: 'Vận hành', TECHNICIAN: 'Kỹ thuật',
        TEAM_LEAD: 'Tổ trưởng', UNIT_HEAD: 'Cán bộ đội', DIRECTOR: 'Ban giám đốc',
        HR_MANAGER: 'Quản lý nhân sự',
    };
    return map[role?.toUpperCase() || ''] || role;
};

const getRoleColor = (role: string | undefined) => {
    const map: Record<string, string> = {
        ADMIN: '#f50', DIRECTOR: '#722ed1', UNIT_HEAD: '#2f54eb',
        TEAM_LEAD: '#1890ff', HR_MANAGER: '#13c2c2',
    };
    return map[role?.toUpperCase() || ''] || '#87d068';
};

type SectionKey = 'info' | 'certificates' | 'cccm' | 'contracts' | 'history' | 'leaves' | 'my_requests';

const NAV_ITEMS: { key: SectionKey; label: string; icon: React.ReactNode }[] = [
    { key: 'info', label: 'Thông tin cá nhân', icon: <UserOutlined /> },
    { key: 'certificates', label: 'Bằng cấp & GPLX', icon: <SafetyCertificateOutlined /> },
    { key: 'cccm', label: 'CCCM & Đào tạo', icon: <BookOutlined /> },
    { key: 'contracts', label: 'Hợp đồng lao động', icon: <FileTextOutlined /> },
    { key: 'history', label: 'Khen thưởng / Kỷ luật', icon: <TrophyOutlined /> },
    { key: 'leaves', label: 'Phép năm', icon: <CalendarOutlined /> },
    { key: 'my_requests', label: 'Lịch sử yêu cầu', icon: <IdcardOutlined /> },
];

// ─────────────────────── Main Component ──────────────────────
const ProfileModal: React.FC<ProfileModalProps> = ({ open, onCancel, user, onUpdateSuccess, initialSection }) => {
    const { user: currentUser } = useAuthContext();

    const [infoForm] = Form.useForm();
    const [passForm] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [activeSection, setActiveSection] = useState<SectionKey>('info');
    const [signatureUrl, setSignatureUrl] = useState<string | undefined>(undefined);
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);

    const isOwnProfile = currentUser?.user_id === user?.user_id;
    const isPublicView = currentUser?.role === 'TEAM_LEAD' && !isOwnProfile;
    const isAdminOrHR = ['ADMIN', 'HR_MANAGER'].includes(currentUser?.role || '');

    // ── Data States ──
    const [qualifications, setQualifications] = useState<IEmployeeCertificate[]>([]);
    const [qualLoading, setQualLoading] = useState(false);
    const [qualModalOpen, setQualModalOpen] = useState(false);
    const [selectedQual, setSelectedQual] = useState<IEmployeeCertificate | null>(null);
    const [qualModalLoading, setQualModalLoading] = useState(false);

    const [cccmCerts, setCccmCerts] = useState<IEmployeeCertificate[]>([]);
    const [cccmLoading, setCccmLoading] = useState(false);

    const [laborContracts, setLaborContracts] = useState<any[]>([]);
    const [rewardDisciplines, setRewardDisciplines] = useState<any[]>([]);
    const [annualLeaves, setAnnualLeaves] = useState<any[]>([]);
    const [leaveHistories, setLeaveHistories] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [trainingPrograms, setTrainingPrograms] = useState<any[]>([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [isCertModalOpen, setIsCertModalOpen] = useState(false);
    const [selectedCert, setSelectedCert] = useState<any>(null);
    const [editCertificates, setEditCertificates] = useState<any[]>([]);

    const [myRequests, setMyRequests] = useState<IProfileRequest[]>([]);

    const [loadedTabs, setLoadedTabs] = useState<Record<string, boolean>>({});

    // ── Add Modal States ──
    const [addContractOpen, setAddContractOpen] = useState(false);
    const [addRewardOpen, setAddRewardOpen] = useState(false);
    const [addModalLoading, setAddModalLoading] = useState(false);
    const [contractForm] = Form.useForm();
    const [rewardForm] = Form.useForm();

    // ── Data Loading ──
    useEffect(() => {
        if (open && trainingPrograms.length === 0) {
            certificatesApi.getTrainingPrograms()
                .then(data => setTrainingPrograms(data))
                .catch(err => console.error("Error fetching programs:", err));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    useEffect(() => {
        if (open && user) {
            infoForm.setFieldsValue({
                name: user.name,
                phone_number: user.phone_number,
                citizen_identification_card: user.citizen_identification_card,
                employee_code: user.employee_code,
                position: user.position,
                date_of_birth: user.date_of_birth ? dayjs(user.date_of_birth) : null,
                place_of_birth: user.place_of_birth,
                gender: user.gender,
                ethnicity: user.ethnicity,
                cccd_issue_date: user.cccd_issue_date ? dayjs(user.cccd_issue_date) : null,
                permanent_address: user.permanent_address,
                temporary_address: user.temporary_address,
                hometown: user.hometown,
            });
            setSignatureUrl(user.signature_url);
            passForm.resetFields();
            setActiveSection(initialSection || 'info');
            setLoadedTabs({});
            fetchQuals();
            fetchCccmCerts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user, initialSection]);

    // Lazy-load data per section
    useEffect(() => {
        if (!open || !user) return;
        const loadData = async () => {
            if (activeSection === 'contracts' && !loadedTabs.contracts) {
                setHistoryLoading(true);
                try {
                    const { getLaborContractsByUser } = await import('../../../../apis/laborContracts');
                    const data = await getLaborContractsByUser(user.user_id).catch(() => []);
                    setLaborContracts(data);
                    setLoadedTabs(prev => ({ ...prev, contracts: true }));
                } finally { setHistoryLoading(false); }
            }
            if (activeSection === 'history' && !loadedTabs.history) {
                setHistoryLoading(true);
                try {
                    const { getRewardDisciplinesByUser } = await import('../../../../apis/rewardDisciplines');
                    const data = await getRewardDisciplinesByUser(user.user_id).catch(() => []);
                    setRewardDisciplines(data);
                    setLoadedTabs(prev => ({ ...prev, history: true }));
                } finally { setHistoryLoading(false); }
            }
            if (activeSection === 'leaves' && !loadedTabs.leaves) {
                setHistoryLoading(true);
                try {
                    const { getAnnualLeavesByUser, getLeaveHistoriesByUser } = await import('../../../../apis/annualLeaves');
                    const [leavesData, historiesData] = await Promise.all([
                        getAnnualLeavesByUser(user.user_id).catch(() => []),
                        getLeaveHistoriesByUser(user.user_id).catch(() => [])
                    ]);
                    setAnnualLeaves(leavesData);
                    setLeaveHistories(historiesData);
                    setLoadedTabs(prev => ({ ...prev, leaves: true }));
                } finally { setHistoryLoading(false); }
            }
            if (activeSection === 'cccm' && !loadedTabs.cccm) {
                setHistoryLoading(true);
                try {
                    const data = await certificatesApi.getUserCertificates(user.user_id, 'CCCM');
                    setEditCertificates(data);
                    setLoadedTabs(prev => ({ ...prev, cccm: true }));
                } finally { setHistoryLoading(false); }
            }
            if (activeSection === 'my_requests' && !loadedTabs.my_requests) {
                setHistoryLoading(true);
                try {
                    const data = await getMyRequests().catch(() => []);
                    setMyRequests(data);
                    setLoadedTabs(prev => ({ ...prev, my_requests: true }));
                } finally { setHistoryLoading(false); }
            }
        };
        loadData();
    }, [activeSection, open, user, loadedTabs]);

    const fetchQuals = async () => {
        if (!user) return;
        setQualLoading(true);
        try {
            const data = await certificatesApi.getUserCertificates(user.user_id, 'BANG_CAP');
            setQualifications(data);
        } catch { message.error('Lỗi lấy danh sách chứng chỉ/bằng cấp'); }
        finally { setQualLoading(false); }
    };

    const fetchCccmCerts = async () => {
        if (!user) return;
        setCccmLoading(true);
        try {
            const data = await certificatesApi.getUserCertificates(user.user_id, 'CCCM');
            setCccmCerts(data);
        } catch { message.error('Lỗi lấy danh sách CCCM'); }
        finally { setCccmLoading(false); }
    };

    // ── Handlers ──

    // Refresh contract data
    const refreshContracts = async () => {
        if (!user) return;
        try {
            const { getLaborContractsByUser } = await import('../../../../apis/laborContracts');
            const data = await getLaborContractsByUser(user.user_id).catch(() => []);
            setLaborContracts(data);
        } catch { /* silent */ }
    };

    // Refresh reward/discipline data
    const refreshRewards = async () => {
        if (!user) return;
        try {
            const { getRewardDisciplinesByUser } = await import('../../../../apis/rewardDisciplines');
            const data = await getRewardDisciplinesByUser(user.user_id).catch(() => []);
            setRewardDisciplines(data);
        } catch { /* silent */ }
    };

    const handleAddContract = async (values: any) => {
        if (!user) return;
        setAddModalLoading(true);
        try {
            await createLaborContract({
                ...values,
                user: user.user_id,
                start_date: values.start_date?.format('YYYY-MM-DD'),
                end_date: values.end_date?.format('YYYY-MM-DD'),
            });
            message.success('Th\u00eam h\u1ee3p \u0111\u1ed3ng th\u00e0nh c\u00f4ng');
            setAddContractOpen(false);
            contractForm.resetFields();
            refreshContracts();
            onUpdateSuccess(user);
        } catch (err: any) {
            message.error(err.message || 'L\u1ed7i th\u00eam h\u1ee3p \u0111\u1ed3ng');
        } finally {
            setAddModalLoading(false);
        }
    };

    const handleAddReward = async (values: any) => {
        if (!user) return;
        setAddModalLoading(true);
        try {
            await createRewardDiscipline({
                ...values,
                user: user.user_id,
                effective_date: values.effective_date?.format('YYYY-MM-DD'),
            });
            message.success('Th\u00eam quy\u1ebft \u0111\u1ecbnh th\u00e0nh c\u00f4ng');
            setAddRewardOpen(false);
            rewardForm.resetFields();
            refreshRewards();
        } catch (err: any) {
            message.error(err.message || 'L\u1ed7i th\u00eam quy\u1ebft \u0111\u1ecbnh');
        } finally {
            setAddModalLoading(false);
        }
    };


    const handleChangePassword = async (values: any) => {
        if (!user) return;
        setLoading(true);
        try {
            const token = getToken();
            await updateUser(user.user_id, { password: values.newPassword }, token);
            message.success('Đổi mật khẩu thành công!');
            passForm.resetFields();
            setPasswordModalOpen(false);
        } catch (error: any) { message.error(error.message || 'Đổi mật khẩu thất bại'); }
        finally { setLoading(false); }
    };

    const handleAddQual = () => { setSelectedQual(null); setQualModalOpen(true); };
    const handleEditQual = (cert: IEmployeeCertificate) => { setSelectedQual(cert); setQualModalOpen(true); };
    const handleDeleteQual = async (id: number) => {
        try {
            await certificatesApi.deleteCertificate(id);
            message.success('Đã xóa');
            setQualifications(prev => prev.filter(q => q.id !== id));
        } catch (error: any) { message.error(error.message || 'Lỗi khi xóa'); }
    };

    const handleQualModalOk = async (values: any, files?: File[]) => {
        if (!user || !currentUser) return;
        if (files && files.some(f => f.size / 1024 / 1024 >= 5)) {
            message.error('File đính kèm phải nhỏ hơn 5MB!');
            return;
        }
        setQualModalLoading(true);
        try {
            if (isAdminOrHR) {
                if (selectedQual) {
                    const res = await certificatesApi.updateCertificate(selectedQual.id, values, files);
                    setQualifications(prev => prev.map(q => q.id === selectedQual.id ? res : q));
                    message.success('Cập nhật thành công');
                } else {
                    const res = await certificatesApi.createCertificate(user.user_id, values, files);
                    setQualifications(prev => [...prev, res]);
                    message.success('Thêm mới thành công');
                }
            } else {
                await createProfileRequest({ request_type: 'NEW_CERTIFICATE', data_payload: values }, files);
                message.success('Yêu cầu đã được gửi. Vui lòng chờ HR phê duyệt.');
            }
            setQualModalOpen(false);
        } catch (error: any) { message.error(error.message || 'Lỗi lưu thông tin'); }
        finally { setQualModalLoading(false); }
    };

    const handleAddCert = () => { setSelectedCert(null); setIsCertModalOpen(true); };
    const handleEditCert = (cert: any) => { setSelectedCert(cert); setIsCertModalOpen(true); };

    const handleDeleteCert = async (id: number) => {
        try {
            await certificatesApi.deleteCertificate(id);
            message.success('Đã xóa chứng chỉ');
            setEditCertificates(prev => prev.filter(c => c.id !== id));
            fetchCccmCerts();
        } catch (error: any) { message.error(error.message || 'Lỗi khi xóa chứng chỉ'); }
    };

    const handleCertModalOk = async (values: any, files?: File[]) => {
        if (!user) return;
        if (files && files.some(f => f.size / 1024 / 1024 >= 5)) {
            message.error('Các file đính kèm phải nhỏ hơn 5MB!');
            return;
        }
        setModalLoading(true);
        try {
            if (selectedCert) {
                const res = await certificatesApi.updateCertificate(selectedCert.id, values, files);
                setEditCertificates(prev => prev.map(c => c.id === selectedCert.id ? res : c));
                message.success('Cập nhật thành công');
            } else {
                if (isAdminOrHR) {
                    const res = await certificatesApi.createCertificate(user.user_id, values, files);
                    setEditCertificates(prev => [...prev, res]);
                    message.success('Thêm mới thành công');
                } else {
                    await createProfileRequest({ request_type: 'NEW_CERTIFICATE', data_payload: values }, files);
                    message.success('Yêu cầu đã được gửi. Vui lòng chờ HR phê duyệt.');
                }
            }
            fetchCccmCerts();
            setIsCertModalOpen(false);
        } catch (error: any) { message.error(error.message || 'Lỗi lưu thông tin'); }
        finally { setModalLoading(false); }
    };

    // ── Computed ──
    const getExpiryStatus = (cert: IEmployeeCertificate): 'ok' | 'warning' | 'expired' | 'permanent' => {
        if (cert.is_permanent) return 'permanent';
        if (!cert.expiry_date) return 'ok';
        const d = dayjs(cert.expiry_date);
        if (d.isBefore(dayjs())) return 'expired';
        if (d.diff(dayjs(), 'month', true) <= 3) return 'warning';
        return 'ok';
    };

    const getCccmExpiryStatus = (cert: IEmployeeCertificate): 'ok' | 'warning' | 'expired' => {
        const endDate = cert.end_date || cert.expiry_date;
        if (!endDate) return 'ok';
        const d = dayjs(endDate);
        if (d.isBefore(dayjs())) return 'expired';
        if (d.diff(dayjs(), 'month', true) <= 3) return 'warning';
        return 'ok';
    };

    if (!user) return null;

    const groupNames = user.user_device_groups?.map(g => g.device_group?.name).filter(Boolean).join(', ') || 'Chưa vào nhóm';
    // Đơn vị tổ chức từ user_departments
    const primaryDept = user.user_departments?.find(ud => ud.is_primary);
    const primaryDeptName = primaryDept?.department?.name || user.department?.name || '-';
    const otherDepts = user.user_departments
        ?.filter(ud => !ud.is_primary)
        ?.map(ud => ud.department?.name)
        .filter(Boolean)
        .join(', ') || '-';
    const degrees = qualifications.filter(c => c.qualification_type === 'BANG_CAP' || (!c.qualification_type && !c.license_class));
    const licenses = qualifications.filter(c => c.qualification_type === 'GIAY_PHEP_LAI_XE' || (!c.qualification_type && c.license_class));
    const englishCerts = qualifications.filter(c => c.qualification_type === 'CHUNG_CHI_NGOAI_NGU');
    const itCerts = qualifications.filter(c => c.qualification_type === 'CHUNG_CHI_TIN_HOC');
    const expiringCount = licenses.filter(c => { const s = getExpiryStatus(c); return s === 'warning' || s === 'expired'; }).length;
    const cccmExpiringCount = cccmCerts.filter(c => getCccmExpiryStatus(c) !== 'ok').length;

    // Filter nav items based on role
    const visibleNav = isPublicView
        ? NAV_ITEMS.filter(n => ['info', 'certificates', 'cccm'].includes(n.key))
        : NAV_ITEMS;

    // ══════════════════════════ SECTIONS ══════════════════════════

    // ── SECTION 1: Thông tin cá nhân ──
    const renderInfoSection = () => (
        <div className="pf-section">
            <div className="pf-section-header">
                <UserOutlined className="pf-section-icon" />
                <span>Thông tin cá nhân</span>
            </div>
            <Form form={infoForm} layout="vertical" disabled={!isOwnProfile && !isAdminOrHR} onFinish={async (vals) => {
                setLoading(true);
                try {
                    const formatted = {
                        ...vals,
                        date_of_birth: vals.date_of_birth ? dayjs(vals.date_of_birth).format('YYYY-MM-DD') : null,
                        cccd_issue_date: vals.cccd_issue_date ? dayjs(vals.cccd_issue_date).format('YYYY-MM-DD') : null,
                    };
                    if (isAdminOrHR) {
                        const token = getToken();
                        await updateUser(user.user_id, formatted, token);
                        onUpdateSuccess({ ...user!, ...formatted });
                        message.success('Cập nhật thông tin thành công');
                    } else {
                        // Tất cả thông tin đều phải gửi phê duyệt (trừ ADMIN/HR)
                        const allFields: Record<string, any> = {
                            name: formatted.name,
                            phone_number: formatted.phone_number,
                            date_of_birth: formatted.date_of_birth,
                            place_of_birth: formatted.place_of_birth,
                            gender: formatted.gender,
                            ethnicity: formatted.ethnicity,
                            citizen_identification_card: formatted.citizen_identification_card,
                            cccd_issue_date: formatted.cccd_issue_date,
                            position: formatted.position,
                            permanent_address: formatted.permanent_address,
                            temporary_address: formatted.temporary_address,
                            hometown: formatted.hometown
                        };

                        // Giá trị hiện tại để so sánh
                        const oldValues: Record<string, any> = {
                            name: user.name || '',
                            phone_number: user.phone_number || '',
                            date_of_birth: user.date_of_birth ? dayjs(user.date_of_birth).format('YYYY-MM-DD') : '',
                            place_of_birth: user.place_of_birth || '',
                            gender: user.gender || '',
                            ethnicity: user.ethnicity || '',
                            citizen_identification_card: user.citizen_identification_card || '',
                            cccd_issue_date: user.cccd_issue_date ? dayjs(user.cccd_issue_date).format('YYYY-MM-DD') : '',
                            position: user.position || '',
                            permanent_address: user.permanent_address || '',
                            temporary_address: user.temporary_address || '',
                            hometown: user.hometown || '',
                        };

                        const changedFields: Record<string, any> = {};
                        const changedOldValues: Record<string, any> = {};

                        Object.keys(allFields).forEach((key) => {
                            const normalizedNew = allFields[key] || '';
                            const normalizedOld = oldValues[key] || '';
                            if (normalizedNew !== normalizedOld) {
                                changedFields[key] = allFields[key];
                                changedOldValues[key] = oldValues[key] || null;
                            }
                        });

                        if (Object.keys(changedFields).length > 0) {
                            await createProfileRequest({
                                request_type: 'UPDATE_INFO',
                                data_payload: {
                                    ...changedFields,
                                    _old_values: changedOldValues,
                                }
                            });
                            message.success('Yêu cầu thay đổi đã được gửi cho Quản lý nhân sự phê duyệt.');
                        } else {
                            message.info('Không có thông tin nào thay đổi.');
                        }
                    }
                } catch (e: any) { message.error(e.message || 'Lỗi cập nhật'); }
                finally { setLoading(false); }
            }}>
                <div className="pf-form-grid">
                    <Form.Item name="name" label="Họ và tên" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                        <Input />
                    </Form.Item>
                    {isAdminOrHR && (
                        <Form.Item name="employee_code" label="Mã NV (MSNV)">
                            <Input />
                        </Form.Item>
                    )}
                    <Form.Item name="position" label="Chức vụ">
                        <Input />
                    </Form.Item>
                    <Form.Item name="phone_number" label="Số điện thoại" rules={[{ pattern: /^[0-9]{10,11}$/, message: 'SĐT không hợp lệ' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="date_of_birth" label="Ngày sinh">
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                    </Form.Item>
                    <Form.Item name="place_of_birth" label="Nơi sinh">
                        <Input placeholder="Ví dụ: TP. Hồ Chí Minh" />
                    </Form.Item>
                    <Form.Item name="gender" label="Giới tính">
                        <Select placeholder="-- Chọn --" allowClear>
                            <Select.Option value="Nam">Nam</Select.Option>
                            <Select.Option value="Nữ">Nữ</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="ethnicity" label="Dân tộc">
                        <Input placeholder="Ví dụ: Kinh" />
                    </Form.Item>
                    <Form.Item name="citizen_identification_card" label="Số CCCD" rules={[{ pattern: /^[0-9]{12}$/, message: 'CCCD phải có 12 số' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="cccd_issue_date" label="Ngày cấp CCCD">
                        <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày" />
                    </Form.Item>
                </div>
                <Form.Item name="permanent_address" label="Nơi thường trú">
                    <Input placeholder="Địa chỉ thường trú đầy đủ" />
                </Form.Item>
                <Form.Item name="temporary_address" label="Nơi tạm trú">
                    <Input placeholder="Địa chỉ tạm trú (nếu có)" />
                </Form.Item>
                <Form.Item name="hometown" label="Quê quán">
                    <Input placeholder="Ví dụ: TP. Hồ Chí Minh" />
                </Form.Item>
                {(isOwnProfile || isAdminOrHR) && (
                    <Button type="primary" htmlType="submit" loading={loading} className="pf-submit-btn">
                        Lưu thông tin cá nhân
                    </Button>
                )}
            </Form>
        </div>
    );

    const renderCertFileLinks = (file_url?: string) => {
        if (!file_url) return null;
        let urls: string[] = [];
        try {
            const parsed = JSON.parse(file_url);
            if (Array.isArray(parsed)) urls = parsed;
            else urls = [file_url];
        } catch {
            urls = [file_url];
        }
        if (!urls.length || urls[0] === null) return null;
        
        return (
            <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#8c8c8c' }}><FileTextOutlined style={{ marginRight: 4 }}/> Đính kèm: </span>
                {urls.map((u, i) => (
                    <Button key={i} size="small" type="dashed" href={getBackendImageUrl(u)} target="_blank" icon={<EyeOutlined />}>
                        File {urls.length > 1 ? i + 1 : ''}
                    </Button>
                ))}
            </div>
        );
    };

    const renderActionButtons = (cert: IEmployeeCertificate) => {
        if (!isAdminOrHR) return null;
        return (
            <div style={{ marginTop: 12, borderTop: '1px solid #f0f0f0', paddingTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Button size="small" type="text" icon={<EditOutlined style={{ color: '#1890ff' }}/>} onClick={() => handleEditQual(cert)}>Sửa</Button>
                <Popconfirm title="Xóa chứng chỉ này?" onConfirm={() => handleDeleteQual(cert.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                    <Button size="small" type="text" danger icon={<DeleteOutlined />}>Xóa</Button>
                </Popconfirm>
            </div>
        );
    };

    // ── SECTION 2: Bằng cấp & GPLX ──
    const renderCertificatesSection = () => {
        if (qualLoading) return <div className="pf-loading"><Spin tip="Đang tải..." /></div>;
        return (
            <div className="pf-section">
                <div className="pf-section-header">
                    <SafetyCertificateOutlined className="pf-section-icon" />
                    <span>Bằng cấp & Giấy phép lái xe</span>
                    {expiringCount > 0 && <Badge count={expiringCount} style={{ backgroundColor: '#faad14', marginLeft: 8 }} />}
                    {(isOwnProfile || isAdminOrHR) && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddQual} style={{ marginLeft: 'auto' }}>Thêm mới</Button>}
                </div>

                {/* Bằng cấp */}
                <div className="pf-subsection">
                    <div className="pf-subsection-title"><BookOutlined style={{ color: '#1890ff' }} /> Bằng cấp ({degrees.length})</div>
                    {degrees.length === 0 ? (
                        <Empty description="Chưa có bằng cấp" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                            {degrees.map(cert => {
                                const isTHPT = cert.degree_type === 'THPT';
                                return (
                                <div key={cert.id} style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 12, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Tag color={isTHPT ? 'gold' : 'blue'} style={{ border: 'none', background: isTHPT ? '#fffbe6' : '#e6f7ff', color: isTHPT ? '#d48806' : '#1890ff', fontWeight: 500 }}>
                                            {isTHPT ? 'Bằng TN THPT' : cert.degree_type || 'Bằng cấp'}
                                        </Tag>
                                        {cert.grading && <Tag color="green" style={{ border: 'none', background: '#f6ffed' }}>{cert.grading}</Tag>}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: '#262626' }}>
                                        {isTHPT ? (cert.school_name || '-') : (cert.major || '-')}
                                    </div>
                                    <div style={{ fontSize: 13, color: '#595959', flex: 1 }}>
                                        {isTHPT ? (
                                            <>
                                                {cert.exam_session && <div style={{ marginBottom: 4 }}>Khoá thi: <span style={{ fontWeight: 500 }}>{dayjs(cert.exam_session).format('DD/MM/YYYY')}</span></div>}
                                                {cert.exam_council && <div style={{ marginBottom: 4 }}>Hội đồng thi: <span style={{ fontWeight: 500 }}>{cert.exam_council}</span></div>}
                                                {cert.certificate_number && <div style={{ marginBottom: 4 }}>Số hiệu: <span style={{ fontWeight: 500 }}>{cert.certificate_number}</span></div>}
                                                {cert.registry_number && <div style={{ marginBottom: 4 }}>Số vào sổ: <span style={{ fontWeight: 500 }}>{cert.registry_number}</span></div>}
                                                {cert.graduation_year && <div style={{ marginBottom: 4 }}>Năm TN: <span style={{ fontWeight: 500 }}>{cert.graduation_year}</span></div>}
                                                {cert.issue_date && <div style={{ marginBottom: 4 }}>Ngày cấp: <span style={{ fontWeight: 500 }}>{dayjs(cert.issue_date).format('DD/MM/YYYY')}</span></div>}
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ marginBottom: 4 }}>Trường: <span style={{ fontWeight: 500 }}>{cert.school_name || '-'}</span></div>
                                                {cert.graduation_year && <div style={{ marginBottom: 4 }}>Tốt nghiệp: <span style={{ fontWeight: 500 }}>{cert.graduation_year}</span></div>}
                                                {cert.study_mode && <div style={{ marginBottom: 4 }}>Hình thức: <span style={{ fontWeight: 500 }}>{cert.study_mode}</span></div>}
                                            </>
                                        )}
                                    </div>
                                    {renderCertFileLinks(cert.file_url)}
                                    {renderActionButtons(cert)}
                                </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* GPLX */}
                <div className="pf-subsection" style={{ marginTop: 24 }}>
                    <div className="pf-subsection-title"><CarOutlined style={{ color: '#faad14' }} /> Giấy phép lái xe ({licenses.length})</div>
                    {licenses.length === 0 ? (
                        <Empty description="Chưa có GPLX" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                            {licenses.map(cert => {
                                const status = getExpiryStatus(cert);
                                const isWarning = status === 'warning' || status === 'expired';
                                return (
                                    <div key={cert.id} style={{ border: isWarning ? '1px solid #ffccc7' : '1px solid #e8e8e8', borderRadius: 8, padding: 12, background: isWarning ? '#fff2f0' : '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <Tag color="orange" style={{ fontSize: 14, fontWeight: 700, padding: '2px 10px', border: 'none' }}>Hạng {cert.license_class}</Tag>
                                            {isWarning && (
                                                <Tag color={status === 'expired' ? 'error' : 'warning'} icon={<WarningOutlined />} style={{ border: 'none' }}>
                                                    {status === 'expired' ? 'Hết hạn' : `Còn ${dayjs(cert.expiry_date).diff(dayjs(), 'day')} ngày`}
                                                </Tag>
                                            )}
                                        </div>
                                        <div style={{ fontSize: 13, color: '#595959', flex: 1 }}>
                                            <div style={{ marginBottom: 6 }}>Ngày cấp: <span style={{ fontWeight: 500, color: '#262626' }}>{cert.issue_date ? dayjs(cert.issue_date).format('DD/MM/YYYY') : '-'}</span></div>
                                            <div style={{ marginBottom: 6 }}>Có giá trị đến: <span style={{ fontWeight: 500, color: '#262626' }}>{cert.is_permanent ? 'Vĩnh viễn' : cert.expiry_date ? dayjs(cert.expiry_date).format('DD/MM/YYYY') : '-'}</span></div>
                                            <div style={{ marginBottom: 6 }}>Nơi cấp: <span style={{ fontWeight: 500, color: '#262626' }}>{cert.issuing_place || '-'}</span></div>
                                            <div style={{ marginBottom: 6 }}>Số GPLX: <span style={{ fontWeight: 500, color: '#262626' }}>{cert.certificate_number || '-'}</span></div>
                                        </div>
                                        {renderCertFileLinks(cert.file_url)}
                                        {renderActionButtons(cert)}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Ngoại ngữ */}
                <div className="pf-subsection" style={{ marginTop: 24 }}>
                    <div className="pf-subsection-title"><GlobalOutlined style={{ color: '#eb2f96' }} /> Chứng chỉ Ngoại ngữ ({englishCerts.length})</div>
                    {englishCerts.length === 0 ? (
                        <Empty description="Chưa có thông tin" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                            {englishCerts.map(cert => (
                                <div key={cert.id} style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 12, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Tag color="magenta" style={{ border: 'none', background: '#fff0f6' }}>{cert.degree_type || 'Ngoại ngữ'}</Tag>
                                        {cert.grading && <Tag color="green" style={{ border: 'none' }}>{cert.grading}</Tag>}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: '#262626' }}>{cert.school_name || '-'}</div>
                                    <div style={{ fontSize: 13, color: '#595959', flex: 1 }}>
                                        <div style={{ marginBottom: 4 }}>Ngày cấp: <span style={{ fontWeight: 500 }}>{cert.issue_date ? dayjs(cert.issue_date).format('DD/MM/YYYY') : '-'}</span></div>
                                        <div style={{ marginBottom: 4 }}>Hết hạn: <span style={{ fontWeight: 500 }}>{cert.is_permanent ? 'Vĩnh viễn' : cert.expiry_date ? dayjs(cert.expiry_date).format('DD/MM/YYYY') : '-'}</span></div>
                                    </div>
                                    {renderCertFileLinks(cert.file_url)}
                                    {renderActionButtons(cert)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Tin học */}
                <div className="pf-subsection" style={{ marginTop: 24 }}>
                    <div className="pf-subsection-title"><DesktopOutlined style={{ color: '#13c2c2' }} /> Chứng chỉ Tin học ({itCerts.length})</div>
                    {itCerts.length === 0 ? (
                        <Empty description="Chưa có thông tin" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 16 }}>
                            {itCerts.map(cert => (
                                <div key={cert.id} style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 12, background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Tag color="cyan" style={{ border: 'none', background: '#e6fffb' }}>{cert.degree_type || 'Tin học'}</Tag>
                                        {cert.grading && <Tag color="green" style={{ border: 'none' }}>{cert.grading}</Tag>}
                                    </div>
                                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: '#262626' }}>{cert.school_name || '-'}</div>
                                    <div style={{ fontSize: 13, color: '#595959', flex: 1 }}>
                                        <div style={{ marginBottom: 4 }}>Ngày cấp: <span style={{ fontWeight: 500 }}>{cert.issue_date ? dayjs(cert.issue_date).format('DD/MM/YYYY') : '-'}</span></div>
                                        <div style={{ marginBottom: 4 }}>Hết hạn: <span style={{ fontWeight: 500 }}>{cert.is_permanent ? 'Vĩnh viễn' : cert.expiry_date ? dayjs(cert.expiry_date).format('DD/MM/YYYY') : '-'}</span></div>
                                    </div>
                                    {renderCertFileLinks(cert.file_url)}
                                    {renderActionButtons(cert)}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // ── SECTION 3: CCCM & Đào tạo (merged) ──
    const cccmColumns = [
        { title: 'STT', render: (_: any, __: any, i: number) => i + 1, width: 50 },
        { title: 'Tên chứng chỉ', dataIndex: ['program', 'name'], width: 180, ellipsis: true },
        { title: 'Ngày ban hành QĐ', dataIndex: 'issue_date', width: 120, render: (d: string) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
        {
            title: 'Hết hạn định kỳ', dataIndex: 'next_training_date', width: 120,
            render: (d: string) => {
                if (!d) return '-';
                const isExp = dayjs(d).isBefore(dayjs());
                return <span style={{ color: isExp ? '#ff4d4f' : 'inherit', fontWeight: isExp ? 700 : 400 }}>{dayjs(d).format('DD/MM/YYYY')}</span>;
            }
        },
        { title: 'Xếp loại', dataIndex: 'grading', width: 100, render: (t: string) => t || '-' },
        ...(isAdminOrHR ? [{
            title: '', key: 'action', width: 80,
            render: (_: any, record: IEmployeeCertificate) => (
                <Space size="small">
                    <Button type="text" size="small" icon={<EditOutlined style={{ color: '#1890ff' }} />} onClick={() => handleEditCert(record)} />
                    <Popconfirm title="Xóa chứng chỉ này?" onConfirm={() => handleDeleteCert(record.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                        <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }] : []),
    ];

    const renderCccmSection = () => {
        if (cccmLoading && historyLoading) return <div className="pf-loading"><Spin tip="Đang tải..." /></div>;
        
        const now = dayjs();
        const splitCerts = (certs: IEmployeeCertificate[]) => {
            const active: IEmployeeCertificate[] = [];
            const history: IEmployeeCertificate[] = [];
            certs.forEach(cert => {
                if (cert.status === 'REVOKED' || cert.status === 'EXPIRED') {
                    history.push(cert);
                } else if (cert.next_training_date) {
                    const daysExpired = now.diff(dayjs(cert.next_training_date), 'day');
                    if (daysExpired >= 14) {
                        history.push(cert);
                    } else {
                        active.push(cert);
                    }
                } else {
                    active.push(cert);
                }
            });
            return { active, history };
        };

        const { active: activeReadonly, history: historyReadonly } = splitCerts(cccmCerts);
        const { active: activeEdit, history: historyEdit } = splitCerts(editCertificates);

        const readonlyColumns = [
            { title: 'Tên chứng chỉ', render: (_: any, r: IEmployeeCertificate) => (<div><div style={{ fontWeight: 600, fontSize: 13 }}>{r.program?.name || '-'}</div></div>) },
            { title: 'Ngày ban hành QĐ', width: 120, render: (_: any, r: IEmployeeCertificate) => r.issue_date ? dayjs(r.issue_date).format('DD/MM/YYYY') : '-' },
            {
                title: 'Hết hạn định kỳ', width: 120, render: (_: any, r: IEmployeeCertificate) => {
                    const end = r.end_date || r.expiry_date || r.next_training_date;
                    if (!end) return <span style={{ color: '#999' }}>Không có</span>;
                    const st = getCccmExpiryStatus ? getCccmExpiryStatus(r) : 'ok';
                    const color = st === 'expired' ? '#ff4d4f' : st === 'warning' ? '#faad14' : '#52c41a';
                    return <span style={{ color, fontWeight: 600 }}>{(st !== 'ok') && <WarningOutlined style={{ marginRight: 4 }} />}{dayjs(end).format('DD/MM/YYYY')}</span>;
                }
            },
            {
                title: 'T.Thái', width: 90, align: 'center' as const, render: (_: any, r: IEmployeeCertificate) => {
                    const st = getCccmExpiryStatus ? getCccmExpiryStatus(r) : 'ok';
                    return <Tag color={st === 'expired' ? 'red' : st === 'warning' ? 'orange' : 'green'}>{st === 'expired' ? 'Hết hạn' : st === 'warning' ? 'Sắp hết' : 'Còn HL'}</Tag>;
                }
            },
        ];

        return (
            <div className="pf-section">
                <div className="pf-section-header">
                    <BookOutlined className="pf-section-icon" />
                    <span>CCCM & Đào tạo</span>
                    {cccmExpiringCount > 0 && <Badge count={cccmExpiringCount} style={{ backgroundColor: '#faad14', marginLeft: 8 }} />}
                    {isAdminOrHR && <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleAddCert} style={{ marginLeft: 'auto' }}>Thêm CCCM</Button>}
                </div>

                {/* CCCM Summary (read-only view) */}
                {!isAdminOrHR && (
                    <>
                        <div className="pf-subsection">
                            <div className="pf-subsection-title">Chứng chỉ chuyên môn ({activeReadonly.length})</div>
                            {activeReadonly.length === 0 ? (
                                <Empty description="Chưa có CCCM hiện tại" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <Table dataSource={activeReadonly} rowKey="id" pagination={false} size="small" bordered scroll={{ x: 'max-content' }} columns={readonlyColumns} />
                            )}
                        </div>
                        {historyReadonly.length > 0 && (
                            <div className="pf-subsection">
                                <div className="pf-subsection-title" style={{ color: '#8c8c8c' }}>Lịch sử đào tạo ({historyReadonly.length})</div>
                                <Table dataSource={historyReadonly} rowKey="id" pagination={{ pageSize: 5 }} size="small" bordered scroll={{ x: 'max-content' }} columns={readonlyColumns} />
                            </div>
                        )}
                    </>
                )}

                {/* CCCM Editable Table (Admin/HR view) */}
                {isAdminOrHR && (
                    <>
                        <div className="pf-subsection">
                            <div className="pf-subsection-title">Quản lý CCCM ({activeEdit.length})</div>
                            {activeEdit.length === 0 ? (
                                <Empty description="Chưa có CCCM hiện tại" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            ) : (
                                <Table dataSource={activeEdit} columns={cccmColumns} rowKey="id" loading={historyLoading} scroll={{ x: 'max-content' }} pagination={false} bordered size="small" />
                            )}
                        </div>
                        {historyEdit.length > 0 && (
                            <div className="pf-subsection">
                                <div className="pf-subsection-title" style={{ color: '#8c8c8c' }}>Lịch sử đào tạo ({historyEdit.length})</div>
                                <Table dataSource={historyEdit} columns={cccmColumns} rowKey="id" loading={historyLoading} scroll={{ x: 'max-content' }} pagination={{ pageSize: 5 }} bordered size="small" />
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    // ── SECTION 4: Hợp đồng ──
    const renderContractsSection = () => {
        if (historyLoading && !loadedTabs.contracts) return <div className="pf-loading"><Spin tip="Đang tải..." /></div>;
        return (
            <div className="pf-section">
                <div className="pf-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <FileTextOutlined className="pf-section-icon" />
                        <span>Hợp đồng lao động</span>
                    </div>
                    {isAdminOrHR && (
                        <Button 
                            type="primary" 
                            size="small" 
                            icon={<PlusOutlined />}
                            onClick={() => {
                                contractForm.resetFields();
                                setAddContractOpen(true);
                            }}
                        >
                            Thêm hợp đồng
                        </Button>
                    )}
                </div>
                {laborContracts.length === 0 ? (
                    <Empty description="Chưa có thông tin hợp đồng" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <div className="pf-card-list">
                        {laborContracts.map(c => (
                            <div key={c.id} className="pf-card">
                                <div className="pf-card-top">
                                    <span style={{ fontWeight: 600, color: '#1890ff' }}>{c.contract_number}</span>
                                    {(() => {
                                        if (c.status === 'TERMINATED') return <Tag color="red">Chấm dứt</Tag>;
                                        if (c.status === 'EXPIRED') return <Tag color="orange">Đã hết hạn</Tag>;
                                        if (c.end_date) {
                                            const end = dayjs(c.end_date);
                                            const now = dayjs();
                                            if (end.isBefore(now)) return <Tag color="red">Hết hạn (Chưa cập nhật)</Tag>;
                                            const daysLeft = end.diff(now, 'day');
                                            if (daysLeft <= 30) return <Tag color="warning">Sắp hết hạn ({daysLeft} ngày)</Tag>;
                                        }
                                        return <Tag color="green">Còn hiệu lực</Tag>;
                                    })()}
                                </div>
                                <Descriptions size="small" column={1} style={{ marginTop: 8 }}>
                                    <Descriptions.Item label="Chức danh">{c.job_title || 'N/A'}</Descriptions.Item>
                                    <Descriptions.Item label="Loại HĐ">
                                        {{
                                            '1_MONTH': '1 Tháng',
                                            'APPRENTICESHIP': 'Học việc',
                                            'PROBATION': 'Thử việc',
                                            '12_MONTHS': '12 tháng',
                                            '24_MONTHS': '2 Năm',
                                            '36_MONTHS': '36 tháng',
                                            'INDEFINITE': 'Vô thời hạn'
                                        }[c.contract_type as string] || c.contract_type}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Thời hạn">
                                        {dayjs(c.start_date).format('DD/MM/YYYY')} → {c.end_date ? dayjs(c.end_date).format('DD/MM/YYYY') : 'Vô thời hạn'}
                                    </Descriptions.Item>
                                </Descriptions>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ── SECTION 5: Khen thưởng / Kỷ luật ──
    const renderHistorySection = () => {
        if (historyLoading && !loadedTabs.history) return <div className="pf-loading"><Spin tip="Đang tải..." /></div>;
        return (
            <div className="pf-section">
                <div className="pf-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <TrophyOutlined className="pf-section-icon" />
                        <span>Khen thưởng & Kỷ luật</span>
                    </div>
                    {isAdminOrHR && (
                        <Button 
                            type="primary" 
                            size="small" 
                            icon={<PlusOutlined />}
                            style={{ background: '#722ed1', borderColor: '#722ed1' }}
                            onClick={() => {
                                rewardForm.resetFields();
                                setAddRewardOpen(true);
                            }}
                        >
                            Thêm KT/KL
                        </Button>
                    )}
                </div>
                {rewardDisciplines.length === 0 ? (
                    <Empty description="Chưa có thông tin khen thưởng / kỷ luật" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <div className="pf-card-list">
                        {rewardDisciplines.map(rec => (
                            <div key={rec.id} className={`pf-card pf-card--${rec.record_type === 'REWARD' ? 'reward' : 'discipline'}`}>
                                <div className="pf-card-top">
                                    <span style={{ fontWeight: 600 }}>{rec.record_type === 'REWARD' ? '🏆 Thưởng' : '⚠️ Kỷ luật'}: {rec.decision_number}</span>
                                    <span className="pf-card-date">Hiệu lực: {dayjs(rec.effective_date).format('DD/MM/YYYY')}</span>
                                </div>
                                <div className="pf-card-sub" style={{ marginTop: 6 }}>{rec.content}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ── SECTION 6: Phép năm ──
    const renderLeavesSection = () => {
        if (historyLoading && !loadedTabs.leaves) return <div className="pf-loading"><Spin tip="Đang tải..." /></div>;
        const currentYearLeaves = annualLeaves.filter(l => l.year === dayjs().year());
        return (
            <div className="pf-section">
                <div className="pf-section-header">
                    <CalendarOutlined className="pf-section-icon" />
                    <span>Phép năm {dayjs().year()}</span>
                </div>
                {currentYearLeaves.length === 0 ? (
                    <Empty description="Chưa có thông tin phép năm" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <div className="pf-card-list">
                        {currentYearLeaves.map(rec => {
                            const total = rec.leave_balance_n2 + rec.leave_balance_n1 + rec.current_year_leave;
                            const taken = rec.m1_taken + rec.m2_taken + rec.m3_taken + rec.m4_taken + rec.m5_taken + rec.m6_taken + rec.m7_taken + rec.m8_taken + rec.m9_taken + rec.m10_taken + rec.m11_taken + rec.m12_taken;
                            const remain = total - taken;
                            return (
                                <div key={rec.id} className="pf-card">
                                    <div className="pf-card-top">
                                        <span style={{ fontWeight: 600, color: '#1890ff' }}>Năm {rec.year}</span>
                                        <Tag color={remain < 0 ? 'red' : remain === 0 ? 'orange' : 'green'}>Còn lại: {remain} ngày</Tag>
                                    </div>
                                    <div className="pf-leave-stats">
                                        <div className="pf-leave-stat">
                                            <span className="pf-leave-stat-label">Tổng quỹ phép</span>
                                            <span className="pf-leave-stat-value" style={{ color: '#1890ff' }}>{total}</span>
                                        </div>
                                        <div className="pf-leave-stat">
                                            <span className="pf-leave-stat-label">Đã sử dụng</span>
                                            <span className="pf-leave-stat-value" style={{ color: '#ff4d4f' }}>{taken}</span>
                                        </div>
                                        <div className="pf-leave-stat">
                                            <span className="pf-leave-stat-label">Còn lại</span>
                                            <span className="pf-leave-stat-value" style={{ color: remain < 0 ? '#ff4d4f' : '#52c41a' }}>{remain}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="pf-subsection" style={{ marginTop: 24 }}>
                    <div className="pf-subsection-title">Lịch sử nghỉ phép ({leaveHistories.length})</div>
                    {leaveHistories.length === 0 ? (
                        <Empty description="Chưa có lịch sử nghỉ phép" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                    ) : (
                        <Table 
                            dataSource={leaveHistories} 
                            rowKey="id" 
                            pagination={{ pageSize: 5 }} 
                            size="small" 
                            bordered 
                            scroll={{ x: 800 }}
                            columns={[
                                {
                                    title: 'Thời gian',
                                    render: (_: any, r: any) => (
                                        <span>{dayjs(r.from_date).format('DD/MM/YYYY')} - {dayjs(r.to_date).format('DD/MM/YYYY')}</span>
                                    )
                                },
                                {
                                    title: 'Số ngày',
                                    dataIndex: 'days_taken',
                                    render: (val: number) => <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{val}</span>
                                },
                                {
                                    title: 'Lý do',
                                    dataIndex: 'reason',
                                    ellipsis: true,
                                },
                                {
                                    title: 'Đính kèm',
                                    dataIndex: 'attachments',
                                    render: (attachments: string[]) => {
                                        if (!attachments || attachments.length === 0) return <span style={{ color: '#999' }}>Không có</span>;
                                        return (
                                            <Space direction="vertical" size="small">
                                                {attachments.map((url, i) => (
                                                    <a key={i} href={`${process.env.REACT_APP_BASE_URL?.replace('/api', '')}${url}`} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                                                        <FileTextOutlined /> Xem file {i + 1}
                                                    </a>
                                                ))}
                                            </Space>
                                        );
                                    }
                                },
                                {
                                    title: 'Ngày duyệt',
                                    dataIndex: 'created_at',
                                    render: (d: string) => <span style={{ color: '#8c8c8c' }}>{dayjs(d).format('DD/MM/YYYY')}</span>
                                }
                            ]} 
                        />
                    )}
                </div>
            </div>
        );
    };

    // ── SECTION 7: My Requests ──
    const renderMyRequestsSection = () => {
        if (historyLoading && !loadedTabs.my_requests) return <div className="pf-loading"><Spin tip="Đang tải..." /></div>;
        return (
            <div className="pf-section">
                <div className="pf-section-header">
                    <IdcardOutlined className="pf-section-icon" />
                    <span>Lịch sử yêu cầu thay đổi</span>
                </div>
                {myRequests.length === 0 ? (
                    <Empty description="Bạn chưa có yêu cầu nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                    <div className="pf-card-list">
                        {myRequests.map(req => (
                            <div key={req.id} className={`pf-card pf-card--${req.status === 'PENDING' ? 'warning' : req.status === 'REJECTED' ? 'expired' : 'reward'}`}>
                                <div className="pf-card-top">
                                    <span style={{ fontWeight: 600 }}>{req.request_type === 'UPDATE_INFO' ? 'Cập nhật TT' : 'Tải lên Bằng cấp'}</span>
                                    <Tag color={req.status === 'PENDING' ? 'orange' : req.status === 'APPROVED' ? 'green' : 'red'}>
                                        {req.status === 'PENDING' ? '⏳ Chờ duyệt' : req.status === 'APPROVED' ? '✅ Đã duyệt' : '❌ Від chối'}
                                    </Tag>
                                </div>
                                <div className="pf-card-date" style={{ marginTop: 6 }}>Gửi ngày: {dayjs(req.created_at).format('DD/MM/YYYY HH:mm')}</div>
                                {req.status === 'REJECTED' && req.notes && (
                                    <div style={{ marginTop: 8, padding: 8, background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 6 }}>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#cf1322' }}>Lý do từ chối:</div>
                                        <div style={{ fontSize: 13, color: '#cf1322' }}>{req.notes}</div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // ── Section Router ──
    const renderActiveSection = () => {
        switch (activeSection) {
            case 'info': return renderInfoSection();
            case 'certificates': return renderCertificatesSection();
            case 'cccm': return renderCccmSection();
            case 'contracts': return renderContractsSection();
            case 'history': return renderHistorySection();
            case 'leaves': return renderLeavesSection();
            case 'my_requests': return renderMyRequestsSection();
            default: return null;
        }
    };

    // ══════════════════════════ RENDER ══════════════════════════
    return (
        <>
            <Drawer
                closable={false}
                title={null}
                placement="right"
                open={open}
                onClose={onCancel}
                width={'min(960px, 95vw)'}
                styles={{ body: { padding: 0 } }}
                destroyOnClose
            >
                <div className="pf-layout">
                    {/* ── Sidebar ── */}
                    <aside className="pf-sidebar">
                        {/* User card */}
                        <div className="pf-user-card">
                            {(isOwnProfile || isAdminOrHR) ? (
                                <Upload
                                    showUploadList={false}
                                    accept="image/*"
                                    customRequest={async (options) => {
                                        try {
                                            const token = getToken();
                                            const optimizedFile = await optimizeImageBeforeUpload(options.file as File, 800, 0.8);
                                            const res = await uploadAvatar(user.user_id, optimizedFile, token);
                                            message.success('Cập nhật ảnh đại diện thành công');
                                            options.onSuccess?.(res);
                                            onUpdateSuccess({ ...user, avatar: res.avatar });
                                        } catch (err: any) {
                                            message.error(err.message || 'Tải lên thất bại');
                                            options.onError?.(err);
                                        }
                                    }}
                                >
                                    <Badge
                                        count={<div style={{ width: 24, height: 24, background: '#1890ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid #001529' }}><EditOutlined style={{ color: '#fff', fontSize: 12 }} /></div>}
                                        offset={[-10, 60]}
                                    >
                                        <Avatar size={72} src={user.avatar ? getBackendImageUrl(user.avatar) : undefined} icon={<UserOutlined />} className="pf-avatar" style={{ cursor: 'pointer' }} />
                                    </Badge>
                                </Upload>
                            ) : (
                                <Avatar size={72} src={user.avatar ? getBackendImageUrl(user.avatar) : undefined} icon={<UserOutlined />} className="pf-avatar" />
                            )}
                            <div className="pf-user-name">{user.name}</div>
                            <Tag color={getRoleColor(user.role)} className="pf-user-role">{user.position || getRoleLabel(user.role)}</Tag>
                        </div>

                        {/* Quick info */}
                        <div className="pf-quick-info">
                            {[
                                { icon: <IdcardOutlined />, label: 'MSNV', value: user.employee_code || '-' },
                                { icon: <MailOutlined />, label: 'Email', value: user.email },
                                { icon: <PhoneOutlined />, label: 'SĐT', value: user.phone_number || '-' },
                            ].map((item, i) => (
                                <Tooltip key={i} title={`${item.label}: ${item.value}`} placement="right">
                                    <div className="pf-quick-row">
                                        <span className="pf-quick-icon">{item.icon}</span>
                                        <span className="pf-quick-label">{item.label}:</span>
                                        <span className="pf-quick-value">{item.value}</span>
                                    </div>
                                </Tooltip>
                            ))}
                        </div>

                        {/* Đơn vị tổ chức */}
                        {user.user_departments && user.user_departments.length > 0 && (
                            <div className="pf-dept-section">
                                <div className="pf-dept-title">
                                    <TeamOutlined style={{ fontSize: 12 }} />
                                    <span>Đơn vị tổ chức</span>
                                </div>
                                <div className="pf-dept-tags">
                                    {user.user_departments
                                        .sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
                                        .map((ud, idx) => {
                                            const roleLabel = ud.role_in_dept === 'LEAD' ? 'Trưởng' : ud.role_in_dept === 'DEPUTY_LEAD' ? 'Phó' : '';
                                            const tagColor = ud.role_in_dept === 'LEAD' ? 'gold' : ud.role_in_dept === 'DEPUTY_LEAD' ? 'blue' : 'default';
                                            const deptName = ud.department?.name || `Dept#${ud.dept_id}`;
                                            return (
                                                <Tooltip key={idx} title={`${deptName}${roleLabel ? ' - ' + roleLabel : ''}${ud.is_primary ? ' (Chính)' : ''}`}>
                                                    <Tag color={tagColor} className="pf-dept-tag">
                                                        {ud.is_primary && <span style={{ marginRight: 2 }}>★</span>}
                                                        {deptName}
                                                        {roleLabel && <span style={{ opacity: 0.7, marginLeft: 3, fontSize: 10 }}>({roleLabel})</span>}
                                                    </Tag>
                                                </Tooltip>
                                            );
                                        })}
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <nav className="pf-nav">
                            {visibleNav.map(item => (
                                <button
                                    key={item.key}
                                    className={`pf-nav-item ${activeSection === item.key ? 'pf-nav-item--active' : ''}`}
                                    onClick={() => setActiveSection(item.key)}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                    {item.key === 'certificates' && expiringCount > 0 && <Badge count={expiringCount} size="small" style={{ backgroundColor: '#faad14' }} />}
                                    {item.key === 'cccm' && cccmExpiringCount > 0 && <Badge count={cccmExpiringCount} size="small" style={{ backgroundColor: '#ff4d4f' }} />}
                                </button>
                            ))}
                        </nav>

                        {/* Footer actions */}
                        <div className="pf-sidebar-footer">
                            {/* Chữ ký */}
                            <div className="pf-sig-block">
                                <span className="pf-sig-label">Chữ ký số</span>
                                {signatureUrl ? (
                                    <div className="pf-sig-img"><img src={getBackendImageUrl(signatureUrl)} alt="sig" /></div>
                                ) : (
                                    <div className="pf-sig-empty">Chưa có</div>
                                )}
                                {(isOwnProfile || isAdminOrHR) && (
                                    <Upload showUploadList={false} customRequest={async (options) => {
                                        try {
                                            const token = getToken();
                                            const res = await uploadSignature(user.user_id, options.file as File, token);
                                            setSignatureUrl(res.signature_url);
                                            message.success('Tải lên chữ ký thành công');
                                            options.onSuccess?.(res);
                                            onUpdateSuccess({ ...user, signature_url: res.signature_url });
                                        } catch (err: any) { message.error(err.message || 'Tải lên thất bại'); options.onError?.(err); }
                                    }}>
                                        <Button size="small" type="text" icon={<UploadOutlined />} className="pf-sig-upload">Tải lên</Button>
                                    </Upload>
                                )}
                            </div>
                            {(isOwnProfile || currentUser?.role === 'ADMIN') && (
                                <Button danger size="small" icon={<LockOutlined />} onClick={() => setPasswordModalOpen(true)} className="pf-pass-btn">
                                    Đổi mật khẩu
                                </Button>
                            )}
                        </div>
                    </aside>

                    {/* ── Content ── */}
                    <main className="pf-content">
                        <Button type="text" icon={<CloseOutlined />} onClick={onCancel} className="pf-close-btn" />

                        {/* Mobile nav */}
                        <div className="pf-mobile-nav">
                            {visibleNav.map(item => (
                                <button
                                    key={item.key}
                                    className={`pf-mobile-nav-item ${activeSection === item.key ? 'pf-mobile-nav-item--active' : ''}`}
                                    onClick={() => setActiveSection(item.key)}
                                >
                                    {item.icon}
                                    <span>{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {renderActiveSection()}
                    </main>
                </div>

                {/* Modals */}
                <QualificationModal
                    open={qualModalOpen}
                    onCancel={() => setQualModalOpen(false)}
                    onOk={handleQualModalOk}
                    initialValues={selectedQual}
                    loading={qualModalLoading}
                    user={user}
                    okText={isAdminOrHR ? undefined : "Gửi yêu cầu phê duyệt"}
                />
                <CertificateModal
                    open={isCertModalOpen}
                    onCancel={() => setIsCertModalOpen(false)}
                    onOk={handleCertModalOk}
                    initialValues={selectedCert}
                    loading={modalLoading}
                    trainingPrograms={trainingPrograms}
                    certificateType="CCCM"
                    user={user}
                />

                {/* ── Styles ── */}
                <style>{`
                    .pf-layout { display: flex; height: 100%; min-height: 0; }

                    /* ──── Sidebar ──── */
                    .pf-sidebar {
                        width: 260px; min-width: 260px; background: linear-gradient(180deg, #001529 0%, #002952 100%);
                        display: flex; flex-direction: column; color: #fff; overflow-y: auto;
                    }
                    .pf-user-card { padding: 28px 20px 16px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.08); }
                    .pf-avatar { border: 3px solid rgba(255,255,255,0.2) !important; }
                    .pf-user-name { font-size: 17px; font-weight: 700; margin-top: 10px; }
                    .pf-user-role { margin-top: 6px; font-size: 11px; }

                    .pf-quick-info { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }

                    .pf-dept-section { padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,0.08); }
                    .pf-dept-title {
                        display: flex; align-items: center; gap: 6px; font-size: 11px;
                        color: rgba(255,255,255,0.4); margin-bottom: 8px; text-transform: uppercase;
                        letter-spacing: 0.5px; font-weight: 600;
                    }
                    .pf-dept-tags { display: flex; flex-wrap: wrap; gap: 4px; }
                    .pf-dept-tag {
                        font-size: 11px !important; border-radius: 4px !important;
                        margin: 0 !important; line-height: 20px !important; cursor: default;
                    }
                    .pf-quick-row {
                        display: flex; align-items: center; gap: 8px; padding: 5px 0;
                        font-size: 12px; color: rgba(255,255,255,0.75);
                    }
                    .pf-quick-icon { color: rgba(255,255,255,0.4); font-size: 13px; flex-shrink: 0; width: 16px; text-align: center; }
                    .pf-quick-label { width: 65px; flex-shrink: 0; }
                    .pf-quick-value { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; color: #fff; flex: 1; }

                    .pf-nav { padding: 8px 8px; flex: 1; }
                    .pf-nav-item {
                        display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
                        border: none; background: transparent; color: rgba(255,255,255,0.65); cursor: pointer;
                        border-radius: 8px; font-size: 13px; text-align: left; transition: all 0.2s;
                    }
                    .pf-nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
                    .pf-nav-item--active {
                        background: rgba(24,144,255,0.2) !important; color: #fff !important;
                        border-left: 3px solid #1890ff; font-weight: 600;
                    }

                    .pf-sidebar-footer { padding: 12px 16px; border-top: 1px solid rgba(255,255,255,0.08); margin-top: auto; }
                    .pf-sig-block { margin-bottom: 10px; }
                    .pf-sig-label { font-size: 11px; color: rgba(255,255,255,0.4); }
                    .pf-sig-img { background: #fff; border-radius: 6px; padding: 4px; text-align: center; margin-top: 4px; }
                    .pf-sig-img img { max-height: 40px; max-width: 100%; }
                    .pf-sig-empty { background: rgba(255,255,255,0.08); border-radius: 6px; padding: 8px; text-align: center; color: rgba(255,255,255,0.25); font-size: 11px; margin-top: 4px; }
                    .pf-sig-upload { color: rgba(255,255,255,0.5) !important; font-size: 11px !important; width: 100%; margin-top: 4px; }
                    .pf-pass-btn { width: 100%; background: rgba(255,77,79,0.1) !important; border-color: rgba(255,77,79,0.3) !important; color: #ff4d4f !important; }

                    /* ──── Content ──── */
                    .pf-content { flex: 1; overflow-y: auto; padding: 24px 28px; background: #f7f8fa; position: relative; }
                    .pf-close-btn { position: absolute; top: 16px; right: 16px; font-size: 18px; color: #999; z-index: 10; }

                    .pf-section { }
                    .pf-section-header {
                        display: flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 700; color: #001529;
                        margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #e8e8e8;
                        padding-right: 30px;
                    }
                    .pf-section-icon { font-size: 20px; color: #1890ff; }

                    .pf-subsection { margin-bottom: 24px; }
                    .pf-subsection-title { font-size: 14px; font-weight: 600; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }

                    .pf-card-list { display: flex; flex-direction: column; gap: 10px; }
                    .pf-card { border: 1px solid #e8e8e8; border-radius: 10px; padding: 12px 16px; background: #fff; transition: box-shadow 0.2s; }
                    .pf-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
                    .pf-card--warning { border-color: #faad14; border-left: 3px solid #faad14; background: #fffbe6; }
                    .pf-card--expired { border-color: #ff4d4f; border-left: 3px solid #ff4d4f; background: #fff2f0; }
                    .pf-card--reward { border-left: 4px solid #52c41a; background: #f6ffed; }
                    .pf-card--discipline { border-left: 4px solid #ff4d4f; background: #fff1f0; }
                    .pf-card-top { display: flex; justify-content: space-between; align-items: center; }
                    .pf-card-title { font-weight: 600; font-size: 14px; margin-top: 4px; }
                    .pf-card-sub { font-size: 12px; color: #666; }
                    .pf-card-date { font-size: 12px; color: #999; }
                    .pf-card-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; color: #fff; margin-bottom: 6px; }
                    .pf-card-badge--warning { background: #faad14; }
                    .pf-card-badge--expired { background: #ff4d4f; }

                    .pf-leave-stats { display: flex; gap: 16px; margin-top: 10px; }
                    .pf-leave-stat { display: flex; flex-direction: column; align-items: center; flex: 1; padding: 8px; background: #f5f5f5; border-radius: 8px; }
                    .pf-leave-stat-label { font-size: 11px; color: #999; }
                    .pf-leave-stat-value { font-size: 20px; font-weight: 700; }

                    .pf-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
                    .pf-submit-btn { margin-top: 8px; }
                    .pf-loading { text-align: center; padding: 60px 0; }

                    /* ──── Mobile Nav (hidden on desktop) ──── */
                    .pf-mobile-nav { display: none; }

                    /* ──── Responsive ──── */
                    @media (max-width: 768px) {
                        .pf-layout { flex-direction: column; }
                        .pf-sidebar { display: none; }
                        .pf-content { padding: 16px; }
                        .pf-form-grid { grid-template-columns: 1fr; }
                        .pf-leave-stats { flex-direction: row; gap: 8px; }
                        .pf-mobile-nav {
                            display: flex; overflow-x: auto; gap: 4px; padding: 8px 0 12px;
                            border-bottom: 1px solid #e8e8e8; margin-bottom: 16px;
                            -webkit-overflow-scrolling: touch;
                        }
                        .pf-mobile-nav-item {
                            display: flex; align-items: center; gap: 6px; padding: 8px 14px;
                            border: 1px solid #d9d9d9; background: #fff; border-radius: 20px;
                            font-size: 12px; white-space: nowrap; cursor: pointer; color: #666;
                            transition: all 0.2s;
                        }
                        .pf-mobile-nav-item--active { background: #1890ff; color: #fff; border-color: #1890ff; font-weight: 600; }
                    }
                `}</style>
            </Drawer>

            {/* Password Modal */}
            <Modal
                title="Thay đổi mật khẩu"
                open={passwordModalOpen}
                onCancel={() => { setPasswordModalOpen(false); passForm.resetFields(); }}
                footer={null}
                width={400}
            >
                <Form form={passForm} layout="vertical" onFinish={handleChangePassword} style={{ marginTop: 24 }}>
                    <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, message: 'Vui lòng nhập mật khẩu mới' }, { min: 6, message: 'Tối thiểu 6 ký tự' }]}>
                        <Input.Password prefix={<LockOutlined />} size="large" />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label="Xác nhận mật khẩu" dependencies={['newPassword']}
                        rules={[{ required: true, message: 'Xác nhận mật khẩu' }, ({ getFieldValue }) => ({
                            validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                return Promise.reject(new Error('Mật khẩu không khớp!'));
                            },
                        })]}>
                        <Input.Password prefix={<LockOutlined />} size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" loading={loading} block danger style={{ marginTop: 12 }}>Đổi mật khẩu</Button>
                </Form>
            </Modal>

            {/* Add Contract Modal */}
            <Modal
                title="➕ Thêm hợp đồng lao động"
                open={addContractOpen}
                onCancel={() => { setAddContractOpen(false); contractForm.resetFields(); }}
                onOk={() => contractForm.submit()}
                confirmLoading={addModalLoading}
                okText="Lưu hợp đồng"
                cancelText="Hủy"
                width={520}
                destroyOnClose
            >
                <Form form={contractForm} layout="vertical" onFinish={handleAddContract} style={{ marginTop: 16 }}>
                    <Form.Item name="contract_number" label="Số hợp đồng" rules={[{ required: true, message: 'Nhập số hợp đồng' }]}>
                        <Input placeholder="VD: HĐ-2026-001" />
                    </Form.Item>
                    <Form.Item name="contract_type" label="Loại hợp đồng" rules={[{ required: true, message: 'Chọn loại hợp đồng' }]}>
                        <Select placeholder="Chọn loại hợp đồng">
                            <Select.Option value="1_MONTH">1 Tháng</Select.Option>
                            <Select.Option value="APPRENTICESHIP">Học việc</Select.Option>
                            <Select.Option value="PROBATION">Thử việc</Select.Option>
                            <Select.Option value="12_MONTHS">12 Tháng</Select.Option>
                            <Select.Option value="24_MONTHS">24 Tháng</Select.Option>
                            <Select.Option value="36_MONTHS">36 Tháng</Select.Option>
                            <Select.Option value="INDEFINITE">Không xác định</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="job_title" label="Chức danh">
                        <Input placeholder="VD: Nhân viên kỹ thuật" />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Form.Item name="start_date" label="Ngày bắt đầu" rules={[{ required: true, message: 'Chọn ngày' }]}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="end_date" label="Ngày kết thúc">
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                    </div>
                    <Form.Item name="status" label="Trạng thái" initialValue="ACTIVE">
                        <Select>
                            <Select.Option value="ACTIVE">Còn hiệu lực</Select.Option>
                            <Select.Option value="EXPIRED">Hết hạn</Select.Option>
                            <Select.Option value="TERMINATED">Chấm dứt</Select.Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Reward/Discipline Modal */}
            <Modal
                title="➕ Thêm Khen thưởng / Kỷ luật"
                open={addRewardOpen}
                onCancel={() => { setAddRewardOpen(false); rewardForm.resetFields(); }}
                onOk={() => rewardForm.submit()}
                confirmLoading={addModalLoading}
                okText="Lưu quyết định"
                cancelText="Hủy"
                width={520}
                destroyOnClose
            >
                <Form form={rewardForm} layout="vertical" onFinish={handleAddReward} style={{ marginTop: 16 }}>
                    <Form.Item name="record_type" label="Loại" rules={[{ required: true, message: 'Chọn loại' }]}>
                        <Select placeholder="Chọn loại">
                            <Select.Option value="REWARD">🏆 Khen thưởng</Select.Option>
                            <Select.Option value="DISCIPLINE">⚠️ Kỷ luật</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="decision_number" label="Số quyết định" rules={[{ required: true, message: 'Nhập số quyết định' }]}>
                        <Input placeholder="VD: QĐ-2026-001" />
                    </Form.Item>
                    <Form.Item name="content" label="Nội dung" rules={[{ required: true, message: 'Nhập nội dung' }]}>
                        <Input.TextArea rows={3} placeholder="Mô tả nội dung khen thưởng / kỷ luật" />
                    </Form.Item>
                    <Form.Item name="effective_date" label="Ngày hiệu lực" rules={[{ required: true, message: 'Chọn ngày' }]}>
                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default ProfileModal;
