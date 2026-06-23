import { IUser } from '../types/user.types';
import { IEmployeeCertificate } from '../types/certificates.types';
import { ILaborContract } from '../apis/laborContracts';
import { IRewardDiscipline } from '../apis/rewardDisciplines';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import dayjs from 'dayjs';

/**
 * Mapping giữa header Excel tiếng Việt ↔ field trong hệ thống
 * Khớp với file Excel mẫu của HR
 */
const EXCEL_HEADERS: { header: string; field: keyof IUser | string; width: number }[] = [
    { header: 'STT', field: '__stt__', width: 5 },
    { header: 'HỌ TÊN', field: 'name', width: 25 },
    { header: 'MSNV', field: 'employee_code', width: 10 },
    { header: 'CHỨC VỤ', field: 'position', width: 20 },
    { header: 'Bộ phận', field: '__department__', width: 20 },
    { header: 'GIỚI TÍNH', field: 'gender', width: 10 },
    { header: 'DÂN TỘC', field: 'ethnicity', width: 12 },
    { header: 'NGÀY SINH', field: 'date_of_birth', width: 15 },
    { header: 'NƠI SINH', field: 'place_of_birth', width: 15 },
    { header: 'EMAIL', field: 'email', width: 30 },
    { header: 'SĐT', field: 'phone_number', width: 15 },
    { header: 'CCCD', field: 'citizen_identification_card', width: 15 },
    { header: 'NGÀY CẤP', field: 'cccd_issue_date', width: 15 },
    { header: 'NƠI THƯỜNG TRÚ', field: 'permanent_address', width: 40 },
    { header: 'NƠI TẠM TRÚ', field: 'temporary_address', width: 40 },
    { header: 'QUÊ QUÁN', field: 'hometown', width: 20 },
];

/**
 * Chuẩn hóa ngày từ nhiều format khác nhau về DD/MM/YYYY (hiển thị) hoặc YYYY-MM-DD (lưu DB)
 */
const parseDate = (value: string | number | null | undefined): string | null => {
    if (!value) return null;
    // Excel serial date number
    if (typeof value === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        const date = new Date(excelEpoch.getTime() + value * 86400000);
        return dayjs(date).format('YYYY-MM-DD');
    }
    const str = String(value).trim();
    // DD/MM/YYYY
    const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyy) {
        return `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
    }
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    // Try dayjs parse
    const parsed = dayjs(str);
    if (parsed.isValid()) return parsed.format('YYYY-MM-DD');
    return null;
};

const formatDateForExcel = (value: string | null | undefined): string => {
    if (!value) return '';
    const d = dayjs(value);
    return d.isValid() ? d.format('DD/MM/YYYY') : '';
};

/**
 * Save workbook to .xlsx file
 * Ưu tiên showSaveFilePicker (Save As dialog) → fallback saveAs
 */
const saveWorkbook = async (wb: XLSX.WorkBook, filename: string): Promise<void> => {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    // Chrome 86+: mở hộp thoại Save As native
    if ('showSaveFilePicker' in window) {
        try {
            const handle = await (window as any).showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: 'Excel Workbook',
                    accept: {
                        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    },
                }],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            console.log('[ExcelExport] Saved via File System Access API:', filename);
            return;
        } catch (err: any) {
            // User bấm Cancel → dừng, không fallback
            if (err.name === 'AbortError') return;
            console.warn('[ExcelExport] showSaveFilePicker failed, fallback to saveAs:', err);
        }
    }

    // Fallback: file-saver
    saveAs(blob, filename);
};

/**
 * EXPORT: Xuất danh sách users ra file Excel
 */
export const exportUsersToExcel = async (users: IUser[]): Promise<void> => {

    const rows = users.map((user, index) => {
        const row: Record<string, string | number> = {};
        EXCEL_HEADERS.forEach(h => {
            if (h.field === '__stt__') {
                row[h.header] = index + 1;
            } else if (h.field === '__department__') {
                row[h.header] = user.department?.name || '';
            } else if (h.field === 'date_of_birth' || h.field === 'cccd_issue_date') {
                row[h.header] = formatDateForExcel((user as unknown as Record<string, string | undefined>)[h.field]);
            } else {
                row[h.header] = (user as unknown as Record<string, string | undefined>)[h.field] || '';
            }
        });
        return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    // Set column widths
    ws['!cols'] = EXCEL_HEADERS.map(h => ({ wch: h.width }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Danh sách nhân viên');
    await saveWorkbook(wb, `Danh_sach_nhan_vien_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
};

/**
 * Kết quả parse 1 dòng từ Excel
 */
export interface ParsedRow {
    rowIndex: number;
    name: string;
    employee_code: string;
    position: string;
    department_name: string;
    gender: string;
    ethnicity: string;
    date_of_birth: string | null;
    place_of_birth: string;
    email: string;
    phone_number: string;
    citizen_identification_card: string;
    cccd_issue_date: string | null;
    permanent_address: string;
    temporary_address: string;
    hometown: string;
    /** MSNV đã tồn tại trong hệ thống → sẽ cập nhật thay vì tạo mới */
    isExisting: boolean;
    existingUserId?: number;
}

/**
 * IMPORT: Đọc file Excel và trả về danh sách parsed rows để preview
 */
export const parseExcelFile = async (
    file: File,
    existingUsers: IUser[]
): Promise<ParsedRow[]> => {

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData: Record<string, string | number>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                // Map employee codes for quick lookup
                const codeMap = new Map<string, IUser>();
                existingUsers.forEach(u => {
                    if (u.employee_code) codeMap.set(u.employee_code.trim(), u);
                });

                const rows: ParsedRow[] = jsonData.map((row, idx) => {
                    // Try to find header by common variants, ignoring spaces, case and unicode (NFC/NFD)
                    const getVal = (keys: string[]): string => {
                        for (const k of keys) {
                            const normalizedK = k.normalize('NFC').replace(/[\s\-_]/g, '').toUpperCase();
                            const found = Object.keys(row).find(rk => {
                                const normalizedRK = rk.normalize('NFC').replace(/[\s\-_]/g, '').toUpperCase();
                                return normalizedRK === normalizedK || normalizedRK.includes(normalizedK);
                            });
                            if (found && row[found] !== undefined && row[found] !== '') {
                                return String(row[found]).trim();
                            }
                        }
                        return '';
                    };

                    const employeeCode = getVal(['MSNV', 'MÃNHÂNVIÊN', 'MÃSỐNV', 'MÃNV']);
                    const existing = employeeCode ? codeMap.get(employeeCode) : undefined;
                    
                    let phone = getVal(['SĐT', 'SỐĐIỆNTHOẠI', 'PHONE', 'SDT', 'ĐIỆNTHOẠI']);
                    // Lọc chỉ lấy đúng các kí tự số (Bỏ dấu cách, dấu chấm nếu bị lẫn vào)
                    phone = phone.replace(/[^\d]/g, '');
                    // Xử lý lỗi phổ biến ở Excel: mất số 0 ở đầu do định dạng Number
                    if (phone && phone.length === 9 && !phone.startsWith('0')) {
                        phone = '0' + phone;
                    }

                    return {
                        rowIndex: idx + 2, // Excel row (1-based + header)
                        name: getVal(['HỌ TÊN', 'HỌ VÀ TÊN', 'TÊN', 'NAME']),
                        employee_code: employeeCode,
                        position: getVal(['CHỨC VỤ', 'VỊ TRÍ', 'POSITION']),
                        department_name: getVal(['BỘ PHẬN', 'PHÒNG BAN', 'DEPARTMENT']),
                        gender: getVal(['GIỚI TÍNH', 'GIỚITÍNH', 'GENDER']),
                        ethnicity: getVal(['DÂN TỘC', 'DÂNTỘC', 'ETHNICITY']),
                        date_of_birth: parseDate(row[Object.keys(row).find(k => k.trim().toUpperCase().includes('SINH') && k.trim().toUpperCase().includes('NGÀY')) || 'NGÀY SINH'] as string),
                        place_of_birth: getVal(['NƠI SINH', 'PLACE OF BIRTH']),
                        email: getVal(['EMAIL', 'E-MAIL']),
                        phone_number: phone,
                        citizen_identification_card: getVal(['CCCD', 'CĂN CƯỚC', 'CMND', 'SỐ CCCD']),
                        cccd_issue_date: parseDate(row[Object.keys(row).find(k => k.trim().toUpperCase().includes('CẤP') && k.trim().toUpperCase().includes('NGÀY')) || 'NGÀY CẤP'] as string),
                        permanent_address: getVal(['NƠI THƯỜNG TRÚ', 'ĐỊA CHỈ THƯỜNG TRÚ', 'THƯỜNG TRÚ']),
                        temporary_address: getVal(['NƠI TẠM TRÚ', 'ĐỊA CHỈ TẠM TRÚ', 'TẠM TRÚ']),
                        hometown: getVal(['QUÊ QUÁN', 'QUÊ', 'HOMETOWN']),
                        isExisting: !!existing,
                        existingUserId: existing?.user_id,
                    };
                }).filter(r => r.name); // Bỏ dòng trống

                resolve(rows);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file'));
        reader.readAsArrayBuffer(file);
    });
};

// ═══════════════════════════════════════════════
// EXPORT TÙY CHỌN (Custom Export)
// ═══════════════════════════════════════════════

export interface ExportConfig {
    users: IUser[];
    selectedFields: string[];
    certificates?: Map<number, IEmployeeCertificate[]>;
    contracts?: Map<number, ILaborContract[]>;
    rewards?: Map<number, IRewardDiscipline[]>;
    certFilter?: 'expiring' | 'expired' | null;
}

/** Mapping field key → header tiếng Việt + width */
const CUSTOM_FIELD_MAP: Record<string, { header: string; width: number }> = {
    // Thông tin cá nhân
    name: { header: 'HỌ TÊN', width: 25 },
    employee_code: { header: 'MSNV', width: 10 },
    position: { header: 'CHỨC VỤ', width: 20 },
    email: { header: 'EMAIL', width: 30 },
    phone_number: { header: 'SĐT', width: 15 },
    gender: { header: 'GIỚI TÍNH', width: 10 },
    ethnicity: { header: 'DÂN TỘC', width: 12 },
    date_of_birth: { header: 'NGÀY SINH', width: 15 },
    place_of_birth: { header: 'NƠI SINH', width: 15 },
    citizen_identification_card: { header: 'CCCD', width: 15 },
    cccd_issue_date: { header: 'NGÀY CẤP CCCD', width: 15 },
    permanent_address: { header: 'NƠI THƯỜNG TRÚ', width: 40 },
    temporary_address: { header: 'NƠI TẠM TRÚ', width: 40 },
    hometown: { header: 'QUÊ QUÁN', width: 20 },
    // Bằng cấp & GPLX (deg_*)
    deg_type: { header: 'LOẠI BẰNG', width: 12 },
    deg_program: { header: 'TÊN BẰNG', width: 30 },
    deg_number: { header: 'SỐ HIỆU', width: 15 },
    deg_school: { header: 'TRƯỜNG', width: 25 },
    deg_major: { header: 'CHUYÊN NGÀNH', width: 20 },
    deg_graduation_year: { header: 'NĂM TỐT NGHIỆP', width: 15 },
    deg_grading: { header: 'XẾP LOẠI', width: 12 },
    deg_study_mode: { header: 'HÌNH THỨC ĐÀO TẠO', width: 18 },
    deg_license_class: { header: 'HẠNG GPLX', width: 12 },
    deg_status: { header: 'TRẠNG THÁI', width: 12 },
    // CCCM & Đào tạo (cccm_*)
    cccm_type: { header: 'LOẠI CC', width: 12 },
    cccm_program: { header: 'CHƯƠNG TRÌNH', width: 30 },
    cccm_number: { header: 'SỐ HIỆU CC', width: 15 },
    cccm_issue_date: { header: 'NGÀY CẤP CC', width: 15 },
    cccm_expiry_date: { header: 'NGÀY HẾT HẠN CC', width: 15 },
    cccm_grading: { header: 'XẾP LOẠI CC', width: 12 },
    cccm_next_training: { header: 'NGÀY ĐÀO TẠO LẠI', width: 18 },
    cccm_status: { header: 'TRẠNG THÁI CC', width: 12 },
    // HĐ Lao động
    contract_number: { header: 'SỐ HĐ', width: 15 },
    contract_type: { header: 'LOẠI HĐ', width: 15 },
    contract_start: { header: 'NGÀY BĐ HĐ', width: 15 },
    contract_end: { header: 'NGÀY KT HĐ', width: 15 },
    contract_status: { header: 'TRẠNG THÁI HĐ', width: 12 },
    // Khen thưởng
    rd_type: { header: 'LOẠI (KT/KL)', width: 12 },
    rd_decision: { header: 'SỐ QĐ', width: 15 },
    rd_content: { header: 'NỘI DUNG', width: 35 },
    rd_date: { header: 'NGÀY HIỆU LỰC', width: 15 },
    // Đơn vị
    dept_name: { header: 'BỘ PHẬN', width: 20 },
    dept_role: { header: 'VAI TRÒ', width: 15 },
};

const CERT_TYPE_MAP: Record<string, string> = {
    CCCM: 'CCCM', QDCN: 'QĐCN', GIAY_PHEP: 'Giấy phép',
    NANG_DINH: 'Năng định', BANG_CAP: 'Bằng cấp',
};

const CONTRACT_TYPE_MAP: Record<string, string> = {
    '1_MONTH': 'Học việc', PROBATION: 'Thử việc', '12_MONTHS': '12 Tháng',
    '24_MONTHS': '24 Tháng', '36_MONTHS': '36 Tháng', INDEFINITE: 'Vô thời hạn',
};

const DEPT_ROLE_MAP: Record<string, string> = {
    LEAD: 'Trưởng', DEPUTY_LEAD: 'Phó', MEMBER: 'Nhân viên',
};

/** Phân loại phụ cho nhóm Bằng cấp & GPLX dựa trên qualification_type, license_class */
function getDegreeSubType(cert: IEmployeeCertificate): string {
    // GPLX: có license_class hoặc qualification_type chứa "GPLX" / "giay_phep"
    if (cert.license_class) return 'Giấy phép lái xe';
    const qt = (cert.qualification_type || '').toUpperCase();
    if (qt.includes('GPLX') || qt.includes('GIAY_PHEP') || qt.includes('LAI_XE')) return 'Giấy phép lái xe';
    if (qt.includes('NGOAI_NGU') || qt.includes('FOREIGN') || qt.includes('LANGUAGE')) return 'CC Ngoại ngữ';
    if (qt.includes('TIN_HOC') || qt.includes('IT') || qt.includes('COMPUTER')) return 'CC Tin học';
    if (cert.type === 'GIAY_PHEP') return 'Giấy phép lái xe';
    return 'Bằng cấp';
}

/** Tính trạng thái real-time từ expiry_date (ưu tiên) hoặc fallback cert.status */
function calcRealTimeStatus(cert: IEmployeeCertificate): string {
    const expiry = cert.expiry_date || cert.end_date;
    if (expiry) {
        const now = new Date();
        const expiryDate = new Date(expiry);
        if (expiryDate < now) return 'Hết hạn';
        // Sắp hết hạn (trong vòng 90 ngày)
        const warningLimit = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
        if (expiryDate <= warningLimit) return 'Sắp hết hạn';
        return 'Còn hạn';
    }
    // Không có ngày hết hạn → dùng status từ DB
    if (cert.status === 'ACTIVE') return 'Còn hạn';
    if (cert.status === 'EXPIRED') return 'Hết hạn';
    return cert.status || '';
}

function getDegreeValue(cert: IEmployeeCertificate, field: string): string {
    switch (field) {
        case 'deg_type': return getDegreeSubType(cert);
        case 'deg_program': return cert.program?.name || '';
        case 'deg_number': return cert.certificate_number || '';
        case 'deg_school': return cert.school_name || '';
        case 'deg_major': return cert.major || '';
        case 'deg_graduation_year': {
            // Chứng chỉ ngoại ngữ: graduation_year là điểm số, không phải năm
            const subType = getDegreeSubType(cert);
            if (subType === 'CC Ngoại ngữ') return ''; // Điểm hiển thị ở cột XẾP LOẠI
            return cert.graduation_year?.toString() || '';
        }
        case 'deg_grading': {
            // Chứng chỉ ngoại ngữ: graduation_year thực chất là điểm → đưa vào XẾP LOẠI
            const subType = getDegreeSubType(cert);
            if (subType === 'CC Ngoại ngữ' && cert.graduation_year) {
                return cert.graduation_year.toString();
            }
            return cert.grading || '';
        }
        case 'deg_study_mode': return cert.study_mode || '';
        case 'deg_license_class': return cert.license_class || '';
        case 'deg_status': return calcRealTimeStatus(cert);
        default: return '';
    }
}

function getCccmValue(cert: IEmployeeCertificate, field: string): string {
    switch (field) {
        case 'cccm_type': return CERT_TYPE_MAP[cert.type] || cert.type;
        case 'cccm_program': return cert.program?.name || '';
        case 'cccm_number': return cert.certificate_number || '';
        case 'cccm_issue_date': return formatDateForExcel(cert.issue_date);
        case 'cccm_expiry_date': return formatDateForExcel(cert.expiry_date);
        case 'cccm_grading': return cert.grading || '';
        case 'cccm_next_training': return formatDateForExcel(cert.next_training_date);
        case 'cccm_status': return calcRealTimeStatus(cert);
        default: return '';
    }
}

function getContractValue(c: ILaborContract, field: string): string {
    switch (field) {
        case 'contract_number': return c.contract_number || '';
        case 'contract_type': return CONTRACT_TYPE_MAP[c.contract_type] || c.contract_type;
        case 'contract_start': return formatDateForExcel(c.start_date);
        case 'contract_end': return formatDateForExcel(c.end_date);
        case 'contract_status': return c.status === 'ACTIVE' ? 'Hiệu lực' : c.status === 'EXPIRED' ? 'Hết hạn' : 'Đã huỷ';
        default: return '';
    }
}

function getRewardValue(r: IRewardDiscipline, field: string): string {
    switch (field) {
        case 'rd_type': return r.record_type === 'REWARD' ? 'Khen thưởng' : 'Kỷ luật';
        case 'rd_decision': return r.decision_number || '';
        case 'rd_content': return r.content || '';
        case 'rd_date': return formatDateForExcel(r.effective_date);
        default: return '';
    }
}

function getUserFieldValue(user: IUser, field: string): string {
    const dateFields = ['date_of_birth', 'cccd_issue_date'];
    if (dateFields.includes(field)) {
        return formatDateForExcel((user as any)[field]);
    }
    if (field === 'dept_name') {
        const depts = (user as any).user_departments;
        if (depts?.length > 0) {
            const primary = depts.find((d: any) => d.is_primary) || depts[0];
            return primary.department?.name || '';
        }
        return user.department?.name || '';
    }
    if (field === 'dept_role') {
        const depts = (user as any).user_departments;
        if (depts?.length > 0) {
            const primary = depts.find((d: any) => d.is_primary) || depts[0];
            return DEPT_ROLE_MAP[primary.role_in_dept] || primary.role_in_dept || '';
        }
        return '';
    }
    return (user as any)[field] || '';
}

/**
 * EXPORT TÙY CHỌN: Xuất Excel multi-sheet
 * - Sheet 1: Thông tin cá nhân (luôn có)
 * - Sheet 2: Bằng cấp & GPLX (nếu chọn deg_*)
 * - Sheet 3: CCCM & Đào tạo (nếu chọn cccm_*)
 * - Sheet 4: Hợp đồng lao động (nếu chọn contract_*)
 * - Sheet 5: Khen thưởng / Kỷ luật (nếu chọn rd_*)
 * Mỗi sheet có cột MSNV + Họ tên để liên kết dữ liệu.
 */
export const exportUsersToExcelCustom = async (config: ExportConfig): Promise<void> => {
    const { users, selectedFields, certificates, contracts, rewards } = config;

    // Phân nhóm fields
    const degreeFields = selectedFields.filter(f => f.startsWith('deg_'));
    const cccmFields = selectedFields.filter(f => f.startsWith('cccm_'));
    const contractFields = selectedFields.filter(f => f.startsWith('contract_'));
    const rewardFields = selectedFields.filter(f => f.startsWith('rd_'));
    const personalFields = selectedFields.filter(f =>
        !f.startsWith('deg_') && !f.startsWith('cccm_') &&
        !f.startsWith('contract_') && !f.startsWith('rd_')
    );

    const DEGREE_TYPES = ['BANG_CAP', 'GIAY_PHEP'];
    const CCCM_TYPES = ['CCCM', 'QDCN', 'NANG_DINH'];

    // Cột tham chiếu — luôn có ở mỗi sheet phụ
    const refHeaders = [
        { header: 'STT', width: 5, field: '__stt__' },
        { header: 'MSNV', width: 10, field: '__ref_msnv__' },
        { header: 'HỌ TÊN', width: 25, field: '__ref_name__' },
    ];

    const wb = XLSX.utils.book_new();

    // ═══════════════════════════════════════
    // SHEET 1: Thông tin cá nhân (luôn tạo)
    // ═══════════════════════════════════════
    if (personalFields.length > 0) {
        const headers = [
            { header: 'STT', width: 5, field: '__stt__' },
            ...personalFields.map(f => ({
                header: CUSTOM_FIELD_MAP[f]?.header || f,
                width: CUSTOM_FIELD_MAP[f]?.width || 15,
                field: f,
            })),
        ];

        const rows = users.map((user, idx) => {
            const row: Record<string, string | number> = {};
            headers.forEach(h => {
                if (h.field === '__stt__') {
                    row[h.header] = idx + 1;
                } else {
                    row[h.header] = getUserFieldValue(user, h.field);
                }
            });
            return row;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = headers.map(h => ({ wch: h.width }));
        XLSX.utils.book_append_sheet(wb, ws, 'Thông tin cá nhân');
    }

    // ═══════════════════════════════════════
    // SHEET 2: Bằng cấp & GPLX
    // ═══════════════════════════════════════
    if (degreeFields.length > 0) {
        const dataHeaders = degreeFields.map(f => ({
            header: CUSTOM_FIELD_MAP[f]?.header || f,
            width: CUSTOM_FIELD_MAP[f]?.width || 15,
            field: f,
        }));
        const allHeaders = [...refHeaders, ...dataHeaders];

        const rows: Record<string, string | number>[] = [];
        let stt = 0;
        users.forEach(user => {
            const allCerts = certificates?.get(user.user_id) || [];
            const degrees = allCerts.filter(c => DEGREE_TYPES.includes(c.type));
            if (degrees.length === 0) {
                // Vẫn tạo 1 dòng trống cho user không có bằng cấp
                stt++;
                const row: Record<string, string | number> = {};
                row['STT'] = stt;
                row['MSNV'] = user.employee_code || '';
                row['HỌ TÊN'] = user.name || '';
                dataHeaders.forEach(h => { row[h.header] = ''; });
                rows.push(row);
            } else {
                stt++;
                degrees.forEach((cert, i) => {
                    const row: Record<string, string | number> = {};
                    row['STT'] = i === 0 ? stt : '';
                    row['MSNV'] = i === 0 ? (user.employee_code || '') : '';
                    row['HỌ TÊN'] = i === 0 ? (user.name || '') : '';
                    dataHeaders.forEach(h => {
                        row[h.header] = getDegreeValue(cert, h.field);
                    });
                    rows.push(row);
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = allHeaders.map(h => ({ wch: h.width }));
        XLSX.utils.book_append_sheet(wb, ws, 'Bằng cấp & GPLX');
    }

    // ═══════════════════════════════════════
    // SHEET 3: CCCM & Đào tạo
    // ═══════════════════════════════════════
    if (cccmFields.length > 0) {
        const dataHeaders = cccmFields.map(f => ({
            header: CUSTOM_FIELD_MAP[f]?.header || f,
            width: CUSTOM_FIELD_MAP[f]?.width || 15,
            field: f,
        }));
        const allHeaders = [...refHeaders, ...dataHeaders];

        const rows: Record<string, string | number>[] = [];
        let stt = 0;
        users.forEach(user => {
            const allCerts = certificates?.get(user.user_id) || [];
            let cccms = allCerts.filter(c => CCCM_TYPES.includes(c.type));

            // Áp dụng bộ lọc chứng chỉ
            if (config.certFilter && cccms.length > 0) {
                const now = new Date();
                if (config.certFilter === 'expiring') {
                    const limit = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
                    cccms = cccms.filter(c =>
                        c.expiry_date && new Date(c.expiry_date) > now && new Date(c.expiry_date) <= limit
                    );
                } else if (config.certFilter === 'expired') {
                    cccms = cccms.filter(c =>
                        c.expiry_date && new Date(c.expiry_date) < now
                    );
                }
            }

            if (cccms.length === 0) {
                stt++;
                const row: Record<string, string | number> = {};
                row['STT'] = stt;
                row['MSNV'] = user.employee_code || '';
                row['HỌ TÊN'] = user.name || '';
                dataHeaders.forEach(h => { row[h.header] = ''; });
                rows.push(row);
            } else {
                stt++;
                cccms.forEach((cert, i) => {
                    const row: Record<string, string | number> = {};
                    row['STT'] = i === 0 ? stt : '';
                    row['MSNV'] = i === 0 ? (user.employee_code || '') : '';
                    row['HỌ TÊN'] = i === 0 ? (user.name || '') : '';
                    dataHeaders.forEach(h => {
                        row[h.header] = getCccmValue(cert, h.field);
                    });
                    rows.push(row);
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = allHeaders.map(h => ({ wch: h.width }));
        XLSX.utils.book_append_sheet(wb, ws, 'CCCM & Đào tạo');
    }

    // ═══════════════════════════════════════
    // SHEET 4: Hợp đồng lao động
    // ═══════════════════════════════════════
    if (contractFields.length > 0) {
        const dataHeaders = contractFields.map(f => ({
            header: CUSTOM_FIELD_MAP[f]?.header || f,
            width: CUSTOM_FIELD_MAP[f]?.width || 15,
            field: f,
        }));
        const allHeaders = [...refHeaders, ...dataHeaders];

        const rows: Record<string, string | number>[] = [];
        let stt = 0;
        users.forEach(user => {
            const cons = contracts?.get(user.user_id) || [];
            stt++;
            if (cons.length === 0) {
                const row: Record<string, string | number> = {};
                row['STT'] = stt;
                row['MSNV'] = user.employee_code || '';
                row['HỌ TÊN'] = user.name || '';
                dataHeaders.forEach(h => { row[h.header] = ''; });
                rows.push(row);
            } else {
                cons.forEach((c, i) => {
                    const row: Record<string, string | number> = {};
                    row['STT'] = i === 0 ? stt : '';
                    row['MSNV'] = i === 0 ? (user.employee_code || '') : '';
                    row['HỌ TÊN'] = i === 0 ? (user.name || '') : '';
                    dataHeaders.forEach(h => {
                        row[h.header] = getContractValue(c, h.field);
                    });
                    rows.push(row);
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = allHeaders.map(h => ({ wch: h.width }));
        XLSX.utils.book_append_sheet(wb, ws, 'Hợp đồng lao động');
    }

    // ═══════════════════════════════════════
    // SHEET 5: Khen thưởng / Kỷ luật
    // ═══════════════════════════════════════
    if (rewardFields.length > 0) {
        const dataHeaders = rewardFields.map(f => ({
            header: CUSTOM_FIELD_MAP[f]?.header || f,
            width: CUSTOM_FIELD_MAP[f]?.width || 15,
            field: f,
        }));
        const allHeaders = [...refHeaders, ...dataHeaders];

        const rows: Record<string, string | number>[] = [];
        let stt = 0;
        users.forEach(user => {
            const rds = rewards?.get(user.user_id) || [];
            stt++;
            if (rds.length === 0) {
                const row: Record<string, string | number> = {};
                row['STT'] = stt;
                row['MSNV'] = user.employee_code || '';
                row['HỌ TÊN'] = user.name || '';
                dataHeaders.forEach(h => { row[h.header] = ''; });
                rows.push(row);
            } else {
                rds.forEach((r, i) => {
                    const row: Record<string, string | number> = {};
                    row['STT'] = i === 0 ? stt : '';
                    row['MSNV'] = i === 0 ? (user.employee_code || '') : '';
                    row['HỌ TÊN'] = i === 0 ? (user.name || '') : '';
                    dataHeaders.forEach(h => {
                        row[h.header] = getRewardValue(r, h.field);
                    });
                    rows.push(row);
                });
            }
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = allHeaders.map(h => ({ wch: h.width }));
        XLSX.utils.book_append_sheet(wb, ws, 'Khen thưởng - Kỷ luật');
    }

    // Fallback: nếu không sheet nào được tạo (chỉ chọn dept mà không chọn personal)
    if (wb.SheetNames.length === 0) {
        const ws = XLSX.utils.json_to_sheet([{ 'Thông báo': 'Không có dữ liệu được chọn' }]);
        XLSX.utils.book_append_sheet(wb, ws, 'Trống');
    }

    await saveWorkbook(wb, `Xuat_NV_tuy_chon_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
};
