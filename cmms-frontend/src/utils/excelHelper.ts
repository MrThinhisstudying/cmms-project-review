import { IUser } from '../types/user.types';
import { IEmployeeCertificate, ITrainingProgram } from '../types/certificates.types';
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
 * Xử lý chính xác:
 * - Đối tượng Date (từ Excel cellDates)
 * - Số serial Excel dạng number hoặc string (vd: 46023 = 01/01/2026)
 * - Chuỗi ngày 2 chữ số năm (vd: 1/1/26 -> 2026-01-01)
 * - Chuỗi chuẩn DD/MM/YYYY hoặc YYYY-MM-DD
 */
const parseDate = (value: any): string | null => {
    if (value === null || value === undefined || value === '') return null;

    // 1. Nếu là đối tượng Date (khi XLSX parse với cellDates: true)
    if (value instanceof Date && !isNaN(value.getTime())) {
        const compensated = new Date(value.getTime() + 10 * 60 * 1000);
        return dayjs(compensated).format('YYYY-MM-DD');
    }

    // 2. Nếu là số hoặc chuỗi số nguyên thuần (Excel serial date: 46023 = 01/01/2026)
    const strRaw = String(value).trim();
    const num = Number(strRaw);
    if (!isNaN(num) && typeof value !== 'boolean' && !strRaw.includes('/') && !strRaw.includes('-') && !strRaw.includes('.')) {
        if (num > 1000 && num < 100000) {
            // Excel epoch tính từ 30/12/1899 UTC
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const date = new Date(excelEpoch.getTime() + num * 86400000);
            return dayjs(date).format('YYYY-MM-DD');
        }
    }

    const str = strRaw;

    // 3. Định dạng DD/MM/YYYY, D/M/YYYY, DD/MM/YY, D/M/YY (hoặc dấu -)
    const dmyMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (dmyMatch) {
        const d = dmyMatch[1].padStart(2, '0');
        const m = dmyMatch[2].padStart(2, '0');
        let y = dmyMatch[3];
        if (y.length === 2) {
            y = parseInt(y, 10) < 50 ? '20' + y : '19' + y;
        }
        return `${y}-${m}-${d}`;
    }

    // 4. Định dạng YYYY-MM-DD hoặc YYYY/MM/DD
    const ymdMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymdMatch) {
        const y = ymdMatch[1];
        const m = ymdMatch[2].padStart(2, '0');
        const d = ymdMatch[3].padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    // 5. Fallback dayjs parse (chỉ nhận năm hợp lệ 1950 - 2099 để tránh bug serial number)
    const parsed = dayjs(str);
    if (parsed.isValid() && parsed.year() >= 1950 && parsed.year() <= 2099) {
        return parsed.format('YYYY-MM-DD');
    }

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
 * EXPORT: Tải file Excel mẫu để import danh sách tài khoản / nhân sự
 */
export const exportUserTemplate = async (): Promise<void> => {
    const sampleRows = [
        {
            'STT': 1,
            'HỌ TÊN': 'Nguyễn Văn An',
            'MSNV': 'NV001',
            'CHỨC VỤ': 'Nhân viên vận hành',
            'Bộ phận': 'Đội xe sân đỗ',
            'GIỚI TÍNH': 'Nam',
            'DÂN TỘC': 'Kinh',
            'NGÀY SINH': '15/05/1990',
            'NƠI SINH': 'Hà Nội',
            'EMAIL': 'nguyenvanan@vcs.vn',
            'SĐT': '0912345678',
            'CCCD': '001090012345',
            'NGÀY CẤP': '20/08/2021',
            'NƠI THƯỜNG TRÚ': 'Số 123 Đường Giải Phóng, Hà Nội',
            'NƠI TẠM TRÚ': 'Số 123 Đường Giải Phóng, Hà Nội',
            'QUÊ QUÁN': 'Hà Nội',
        },
        {
            'STT': 2,
            'HỌ TÊN': 'Trần Thị Bình',
            'MSNV': 'NV002',
            'CHỨC VỤ': 'Kỹ thuật viên bảo dưỡng',
            'Bộ phận': 'Đội kỹ thuật bảo dưỡng',
            'GIỚI TÍNH': 'Nữ',
            'DÂN TỘC': 'Kinh',
            'NGÀY SINH': '22/10/1993',
            'NƠI SINH': 'TP. Hồ Chí Minh',
            'EMAIL': 'tranthibinh@vcs.vn',
            'SĐT': '0987654321',
            'CCCD': '079193005678',
            'NGÀY CẤP': '10/04/2022',
            'NƠI THƯỜNG TRÚ': 'Số 456 Đường Nguyễn Văn Linh, Q.7, TP.HCM',
            'NƠI TẠM TRÚ': 'Số 456 Đường Nguyễn Văn Linh, Q.7, TP.HCM',
            'QUÊ QUÁN': 'Long An',
        }
    ];

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = EXCEL_HEADERS.map(h => ({ wch: h.width }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Nhap_Nhan_Su');
    await saveWorkbook(wb, 'Mau_Import_Danh_Sach_Nhan_Su_VCS.xlsx');
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

/**
 * Interface cho dòng hợp đồng sau khi parse từ file Excel
 */
export interface ParsedContractRow {
    rawRow: number;
    user_id?: number;
    userName: string;
    employee_code?: string;
    avatar?: string;
    contract_number: string;
    contract_type: '1_MONTH' | 'APPRENTICESHIP' | 'PROBATION' | '12_MONTHS' | '24_MONTHS' | '36_MONTHS' | 'INDEFINITE';
    contractTypeLabel: string;
    job_title?: string;
    start_date: string;
    end_date?: string;
    status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
    isValid: boolean;
    error?: string;
}

/**
 * Tải file Excel mẫu để nhập hợp đồng lao động
 */
export const exportContractTemplate = async (sampleUsers: IUser[] = []): Promise<void> => {
    const wb = XLSX.utils.book_new();

    const sampleRows = sampleUsers.slice(0, 5).map((u, idx) => ({
        'STT': idx + 1,
        'MÃ NHÂN VIÊN (*)': u.employee_code || `NV-${u.user_id}`,
        'HỌ TÊN NHÂN VIÊN': u.name || '',
        'SỐ HỢP ĐỒNG (*)': `${String(idx + 1).padStart(2, '0')}/${dayjs().format('YY')}/HĐLĐ`,
        'LOẠI HỢP ĐỒNG (*)': idx === 0 ? '12 Tháng' : idx === 1 ? '36 Tháng' : idx === 2 ? 'Vô thời hạn' : 'Thử việc',
        'CHỨC DANH / VỊ TRÍ': u.position || 'Nhân viên',
        'NGÀY BẮT ĐẦU (*)': dayjs().format('01/MM/YYYY'),
        'NGÀY KẾT THÚC': idx === 2 ? '' : dayjs().add(1, 'year').format('01/MM/YYYY'),
        'TRẠNG THÁI': 'Còn hiệu lực',
    }));

    if (sampleRows.length === 0) {
        sampleRows.push({
            'STT': 1,
            'MÃ NHÂN VIÊN (*)': '019558',
            'HỌ TÊN NHÂN VIÊN': 'Trần Ngọc Linh Nhi',
            'SỐ HỢP ĐỒNG (*)': '01/26/HĐLĐ',
            'LOẠI HỢP ĐỒNG (*)': '12 Tháng',
            'CHỨC DANH / VỊ TRÍ': 'Nhân viên hành chính',
            'NGÀY BẮT ĐẦU (*)': '01/01/2026',
            'NGÀY KẾT THÚC': '31/12/2026',
            'TRẠNG THÁI': 'Còn hiệu lực',
        });
    }

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    ws['!cols'] = [
        { wch: 6 },  // STT
        { wch: 18 }, // MÃ NHÂN VIÊN
        { wch: 25 }, // HỌ TÊN NHÂN VIÊN
        { wch: 20 }, // SỐ HỢP ĐỒNG
        { wch: 20 }, // LOẠI HỢP ĐỒNG
        { wch: 24 }, // CHỨC DANH
        { wch: 18 }, // NGÀY BẮT ĐẦU
        { wch: 18 }, // NGÀY KẾT THÚC
        { wch: 16 }, // TRẠNG THÁI
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Mau_Hop_Dong_Lao_Dong');

    // Sheet hướng dẫn
    const instructions = [
        { 'HƯỚNG DẪN NHẬP HỢP ĐỒNG LAO ĐỘNG': '1. Cột có dấu (*) là thông tin bắt buộc phải có.' },
        { 'HƯỚNG DẪN NHẬP HỢP ĐỒNG LAO ĐỘNG': '2. MÃ NHÂN VIÊN: Phải trùng với Mã số nhân viên (hoặc tên) đã có trong hệ thống.' },
        { 'HƯỚNG DẪN NHẬP HỢP ĐỒNG LAO ĐỘNG': '3. LOẠI HỢP ĐỒNG chấp nhận các giá trị: "Học việc", "Thử việc", "12 Tháng", "24 Tháng", "36 Tháng", "Vô thời hạn".' },
        { 'HƯỚNG DẪN NHẬP HỢP ĐỒNG LAO ĐỘNG': '4. NGÀY BẮT ĐẦU và NGÀY KẾT THÚC: Định dạng chuẩn DD/MM/YYYY (ví dụ: 01/01/2026). Nếu hợp đồng Vô thời hạn thì để trống Ngày kết thúc.' },
        { 'HƯỚNG DẪN NHẬP HỢP ĐỒNG LAO ĐỘNG': '5. TRẠNG THÁI: "Còn hiệu lực", "Hết hiệu lực", hoặc "Đã thanh lý" (mặc định: Còn hiệu lực).' },
        { 'HƯỚNG DẪN NHẬP HỢP ĐỒNG LAO ĐỘNG': '6. Nếu số hợp đồng đã tồn tại trên hệ thống, dữ liệu mới sẽ tự động cập nhật đè lên hợp đồng cũ.' },
    ];
    const wsHelp = XLSX.utils.json_to_sheet(instructions);
    wsHelp['!cols'] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, wsHelp, 'Huong_Dan');

    await saveWorkbook(wb, `Mau_nhap_hop_dong_lao_dong.xlsx`);
};

/**
 * Phân tích và kiểm tra file Excel hợp đồng lao động
 */
export const parseContractExcel = async (
    file: File,
    users: IUser[]
): Promise<ParsedContractRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                // Map users for fast lookup
                const userByCode = new Map<string, IUser>();
                const userByName = new Map<string, IUser>();
                users.forEach(u => {
                    if (u.employee_code) {
                        const rawCode = u.employee_code.trim().toLowerCase();
                        userByCode.set(rawCode, u);
                        // Hỗ trợ trường hợp Excel bỏ số 0 ở đầu (vd: 001965 -> 1965)
                        const noLeadingZero = rawCode.replace(/^0+/, '');
                        if (noLeadingZero) userByCode.set(noLeadingZero, u);
                    }
                    userByCode.set(String(u.user_id), u);
                    userByCode.set(`nv-${u.user_id}`.toLowerCase(), u);
                    if (u.name) userByName.set(u.name.trim().toLowerCase(), u);
                });

                const parsedList: ParsedContractRow[] = [];

                rawRows.forEach((row, index) => {
                    const getVal = (keys: string[]): any => {
                        for (const k of keys) {
                            for (const rowKey of Object.keys(row)) {
                                if (rowKey.trim().toLowerCase().includes(k.toLowerCase())) {
                                    const val = row[rowKey];
                                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                                        return val;
                                    }
                                }
                            }
                        }
                        return '';
                    };

                    const codeRaw = String(getVal(['mã nhân viên', 'ma nhan vien', 'msnv', 'mã nv'])).trim();
                    const nameRaw = String(getVal(['họ tên', 'ho ten', 'tên nhân viên', 'ten nhan vien', 'nhân viên'])).trim();
                    const contractNumRaw = String(getVal(['số hợp đồng', 'so hop dong', 'số hđ', 'so hd'])).trim();
                    const contractTypeRaw = String(getVal(['loại hợp đồng', 'loai hop dong', 'loại hđ', 'loai hd'])).trim();
                    const jobTitleRaw = String(getVal(['chức danh', 'chuc danh', 'vị trí', 'vi tri', 'chức vụ'])).trim();
                    const startDateRaw = getVal(['ngày bắt đầu', 'ngay bat dau', 'bắt đầu', 'bat dau']);
                    const endDateRaw = getVal(['ngày kết thúc', 'ngay ket thuc', 'kết thúc', 'ket thuc', 'ngày hết hạn']);
                    const statusRaw = String(getVal(['trạng thái', 'trang thai'])).trim();

                    // Bỏ qua dòng hoàn toàn trống
                    if (!codeRaw && !nameRaw && !contractNumRaw) return;

                    // Tìm user tương ứng
                    let matchedUser: IUser | undefined = undefined;
                    if (codeRaw) {
                        const cleanCode = codeRaw.toLowerCase();
                        matchedUser = userByCode.get(cleanCode) || userByCode.get(cleanCode.replace(/^0+/, ''));
                    }
                    if (!matchedUser && nameRaw) {
                        matchedUser = userByName.get(nameRaw.toLowerCase());
                    }

                    // Chuẩn hóa loại hợp đồng
                    let cType: ParsedContractRow['contract_type'] = '12_MONTHS';
                    let cTypeLabel = '12 Tháng';
                    const cTypeLower = contractTypeRaw.toLowerCase();
                    if (cTypeLower.includes('vô thời hạn') || cTypeLower.includes('vo thoi han') || cTypeLower.includes('kxd') || cTypeLower === 'indefinite') {
                        cType = 'INDEFINITE';
                        cTypeLabel = 'Vô thời hạn';
                    } else if (cTypeLower.includes('thử việc') || cTypeLower.includes('thu viec') || cTypeLower === 'probation') {
                        cType = 'PROBATION';
                        cTypeLabel = 'Thử việc';
                    } else if (cTypeLower.includes('học việc') || cTypeLower.includes('hoc viec') || cTypeLower === 'apprenticeship') {
                        cType = 'APPRENTICESHIP';
                        cTypeLabel = 'Học việc';
                    } else if (cTypeLower.includes('1 tháng') || cTypeLower.includes('1t') || cTypeLower === '1_month') {
                        cType = '1_MONTH';
                        cTypeLabel = 'Học việc 1T';
                    } else if (cTypeLower.includes('36 tháng') || cTypeLower.includes('36t') || cTypeLower.includes('3 năm') || cTypeLower === '36_months') {
                        cType = '36_MONTHS';
                        cTypeLabel = '36 Tháng';
                    } else if (cTypeLower.includes('24 tháng') || cTypeLower.includes('24t') || cTypeLower.includes('2 năm') || cTypeLower === '24_months') {
                        cType = '24_MONTHS';
                        cTypeLabel = '24 Tháng';
                    } else {
                        cType = '12_MONTHS';
                        cTypeLabel = '12 Tháng';
                    }

                    // Parse ngày
                    const parsedStart = parseDate(startDateRaw);
                    let parsedEnd = parseDate(endDateRaw);

                    // Tự động tính end_date nếu để trống và loại HĐ có thời hạn
                    if (parsedStart && !parsedEnd && cType !== 'INDEFINITE') {
                        if (cType === '1_MONTH') parsedEnd = dayjs(parsedStart).add(1, 'month').subtract(1, 'day').format('YYYY-MM-DD');
                        else if (cType === '12_MONTHS') parsedEnd = dayjs(parsedStart).add(12, 'month').subtract(1, 'day').format('YYYY-MM-DD');
                        else if (cType === '24_MONTHS') parsedEnd = dayjs(parsedStart).add(24, 'month').subtract(1, 'day').format('YYYY-MM-DD');
                        else if (cType === '36_MONTHS') parsedEnd = dayjs(parsedStart).add(36, 'month').subtract(1, 'day').format('YYYY-MM-DD');
                    }

                    // Chuẩn hóa trạng thái
                    let status: ParsedContractRow['status'] = 'ACTIVE';
                    const statusLower = statusRaw.toLowerCase();
                    if (statusLower.includes('hết') || statusLower === 'expired') {
                        status = 'EXPIRED';
                    } else if (statusLower.includes('thanh lý') || statusLower.includes('chấm dứt') || statusLower === 'terminated') {
                        status = 'TERMINATED';
                    }

                    // Validation
                    const errors: string[] = [];
                    if (!matchedUser) {
                        errors.push(`Không tìm thấy nhân viên "${codeRaw || nameRaw}" trong hệ thống`);
                    }
                    if (!contractNumRaw) {
                        errors.push('Thiếu số hợp đồng');
                    }
                    if (!parsedStart) {
                        errors.push(`Ngày bắt đầu "${startDateRaw}" không hợp lệ`);
                    }

                    parsedList.push({
                        rawRow: index + 2, // header là dòng 1
                        user_id: matchedUser?.user_id,
                        userName: matchedUser?.name || nameRaw || 'Không xác định',
                        employee_code: matchedUser?.employee_code || codeRaw,
                        avatar: matchedUser?.avatar,
                        contract_number: contractNumRaw,
                        contract_type: cType,
                        contractTypeLabel: cTypeLabel,
                        job_title: jobTitleRaw || matchedUser?.position || 'Nhân viên',
                        start_date: parsedStart || '',
                        end_date: parsedEnd || undefined,
                        status,
                        isValid: errors.length === 0,
                        error: errors.join('; '),
                    });
                });

                resolve(parsedList);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * -------------------------------------------------------------
 * QUẢN LÝ BẰNG CẤP & CHỨNG CHỈ (CCCM / ĐÀO TẠO, BẰNG CẤP, GPLX)
 * -------------------------------------------------------------
 */

export type CertCategoryGroup = 'CCCM' | 'BANG_CAP' | 'GPLX';

/**
 * Hàm phân loại chuẩn 3 nhóm cho mọi chứng chỉ trong hệ thống:
 * 1. CCCM / Đào tạo (CCCM, QDCN, NANG_DINH, hoặc có liên kết chương trình đào tạo)
 * 2. Bằng cấp (Đại học/Cao đẳng/Trung cấp/THPT, Ngoại ngữ TOEIC/IELTS, Tin học MOS/IC3/CNTT)
 * 3. GPLX (Giấy phép lái xe đường bộ, GPLX sân đỗ, các hạng A1-FE)
 */
export const getCertificateCategory = (c: IEmployeeCertificate): CertCategoryGroup => {
    // 1. GPLX: có hạng bằng lái xe hoặc type / qualification_type là giấy phép lái xe
    if (c.type === 'GIAY_PHEP' || c.qualification_type === 'GIAY_PHEP_LAI_XE' || !!c.license_class) {
        return 'GPLX';
    }
    // 2. CCCM / Đào tạo: type thuộc nhóm đào tạo chuyên môn hoặc có program
    if (c.type === 'CCCM' || c.type === 'QDCN' || c.type === 'NANG_DINH' || !!c.program || !!(c as any).program_id) {
        return 'CCCM';
    }
    // 3. Mặc định là Bằng cấp (Đại học, Cao đẳng, Ngoại ngữ, Tin học...)
    return 'BANG_CAP';
};

export interface ParsedCertificateRow {
    rawRow: number;
    user_id?: number;
    userName: string;
    employee_code?: string;
    avatar?: string;
    // Phân loại 3 nhóm
    category: CertCategoryGroup;
    categoryLabel: string;
    // Thông tin kỹ thuật lưu trữ DB
    type: 'CCCM' | 'QDCN' | 'GIAY_PHEP' | 'NANG_DINH' | 'BANG_CAP';
    qualification_type?: string;
    name: string;
    program_id?: number;
    degree_type?: string;
    major?: string;
    license_class?: string;
    certificate_number?: string;
    issuing_authority?: string;
    issue_date: string;
    expiry_date?: string;
    is_permanent?: boolean;
    grading?: string;
    isValid: boolean;
    error?: string;
}

/**
 * XUẤT FILE EXCEL MẪU: Nhập Chứng chỉ / Bằng cấp / GPLX
 */
export const exportCertificateTemplate = async (
    users: IUser[],
    programs: ITrainingProgram[] = []
): Promise<void> => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Dữ liệu mẫu minh họa đầy đủ 3 nhóm
    const sampleData = [
        {
            'STT': 1,
            'MÃ NHÂN VIÊN (*)': users[0]?.employee_code || '019558',
            'HỌ VÀ TÊN': users[0]?.name || 'Trần Ngọc Linh Nhi',
            'PHÂN LOẠI (*)': 'CCCM / Đào tạo',
            'TÊN CHỨNG CHỈ / BẰNG CẤP / HẠNG BẰNG (*)': programs[0]?.name || 'Ô tô thông thường',
            'SỐ HIỆU / SỐ BẰNG': 'CCCM-2026/01',
            'CƠ QUAN / ĐƠN VỊ CẤP': 'Cục Hàng Không Việt Nam',
            'NGÀY CẤP (*)': '01/01/2026',
            'NGÀY HẾT HẠN': '01/01/2028',
            'XẾP LOẠI / ĐIỂM SỐ': 'Giỏi',
            'CHUYÊN NGÀNH': '',
            'GHI CHÚ': 'Chứng chỉ chuyên môn định kỳ',
        },
        {
            'STT': 2,
            'MÃ NHÂN VIÊN (*)': users[1]?.employee_code || '789789',
            'HỌ VÀ TÊN': users[1]?.name || 'Trần Anh Tuấn',
            'PHÂN LOẠI (*)': 'Bằng cấp',
            'TÊN CHỨNG CHỈ / BẰNG CẤP / HẠNG BẰNG (*)': 'TOEIC',
            'SỐ HIỆU / SỐ BẰNG': 'LR-2026-99',
            'CƠ QUAN / ĐƠN VỊ CẤP': 'IIG Việt Nam',
            'NGÀY CẤP (*)': '20/04/2026',
            'NGÀY HẾT HẠN': '20/04/2028',
            'XẾP LOẠI / ĐIỂM SỐ': '850',
            'CHUYÊN NGÀNH': '',
            'GHI CHÚ': 'Chứng chỉ ngoại ngữ quốc tế',
        },
        {
            'STT': 3,
            'MÃ NHÂN VIÊN (*)': users[2]?.employee_code || '001965',
            'HỌ VÀ TÊN': users[2]?.name || 'Lê Trung Dũng',
            'PHÂN LOẠI (*)': 'GPLX',
            'TÊN CHỨNG CHỈ / BẰNG CẤP / HẠNG BẰNG (*)': 'C',
            'SỐ HIỆU / SỐ BẰNG': '123456789',
            'CƠ QUAN / ĐƠN VỊ CẤP': 'Sở GTVT TP.HCM',
            'NGÀY CẤP (*)': '20/04/2026',
            'NGÀY HẾT HẠN': '20/04/2029',
            'XẾP LOẠI / ĐIỂM SỐ': '',
            'CHUYÊN NGÀNH': '',
            'GHI CHÚ': 'Giấy phép lái xe ô tô hạng C',
        },
        {
            'STT': 4,
            'MÃ NHÂN VIÊN (*)': users[3]?.employee_code || '202020',
            'HỌ VÀ TÊN': users[3]?.name || 'Phan Anh Tuấn',
            'PHÂN LOẠI (*)': 'Bằng cấp',
            'TÊN CHỨNG CHỈ / BẰNG CẤP / HẠNG BẰNG (*)': 'Cử nhân Công nghệ thông tin',
            'SỐ HIỆU / SỐ BẰNG': 'DH-2020-045',
            'CƠ QUAN / ĐƠN VỊ CẤP': 'Đại học Bách Khoa',
            'NGÀY CẤP (*)': '15/07/2020',
            'NGÀY HẾT HẠN': '',
            'XẾP LOẠI / ĐIỂM SỐ': 'Khá',
            'CHUYÊN NGÀNH': 'Hệ thống thông tin',
            'GHI CHÚ': 'Bằng đại học chính quy (Vô thời hạn)',
        },
    ];

    const wsData = XLSX.utils.json_to_sheet(sampleData);
    wsData['!cols'] = [
        { wch: 6 },  // STT
        { wch: 18 }, // Mã NV
        { wch: 25 }, // Họ tên
        { wch: 18 }, // Phân loại
        { wch: 32 }, // Tên chứng chỉ / Bằng cấp / Hạng
        { wch: 18 }, // Số hiệu
        { wch: 26 }, // Đơn vị cấp
        { wch: 15 }, // Ngày cấp
        { wch: 15 }, // Ngày hết hạn
        { wch: 18 }, // Xếp loại
        { wch: 22 }, // Chuyên ngành
        { wch: 30 }, // Ghi chú
    ];
    XLSX.utils.book_append_sheet(wb, wsData, 'Du_Lieu');

    // Sheet 2: Hướng dẫn chi tiết
    const instructions = [
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '1. Cột có dấu (*) là thông tin bắt buộc phải điền.' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '2. MÃ NHÂN VIÊN: Phải trùng với Mã số nhân viên (hoặc Họ tên) đã tồn tại trên hệ thống.' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '3. PHÂN LOẠI gồm 3 nhóm chính: "CCCM / Đào tạo", "Bằng cấp", hoặc "GPLX".' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '   - "CCCM / Đào tạo": Chứng chỉ chuyên môn, đào tạo an toàn sân đỗ, nội bộ ACV...' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '   - "Bằng cấp": Bằng ĐH, Cao đẳng, Trung cấp, THPT, Ngoại ngữ (TOEIC, IELTS...), Tin học (MOS, IC3, CNTT cơ bản...)' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '   - "GPLX": Giấy phép lái xe đường bộ hoặc sân đỗ (Ghi hạng: A1, A2, B1, B2, C, D, E, FC...)' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '4. NGÀY CẤP & NGÀY HẾT HẠN: Định dạng chuẩn DD/MM/YYYY (ví dụ: 20/04/2026). Nếu bằng cấp hoặc chứng chỉ VÔ THỜI HẠN thì để trống ô Ngày hết hạn.' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU BẰNG CẤP / CHỨNG CHỈ / GPLX': '5. Nếu số chứng chỉ / bằng cấp đã tồn tại với nhân viên này, hệ thống sẽ tự động cập nhật đè thông tin mới.' },
    ];
    const wsHelp = XLSX.utils.json_to_sheet(instructions);
    wsHelp['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, wsHelp, 'Huong_Dan');

    // Sheet 3: Danh sách nhân viên để tra cứu
    const empLookup = users.slice(0, 500).map((u, i) => ({
        'STT': i + 1,
        'MÃ NHÂN VIÊN': u.employee_code || u.user_id,
        'HỌ VÀ TÊN': u.name,
        'PHÒNG BAN': u.department?.name || '',
        'CHỨC VỤ': u.position || '',
    }));
    const wsEmp = XLSX.utils.json_to_sheet(empLookup);
    wsEmp['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 25 }, { wch: 22 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsEmp, 'DS_Nhan_Vien');

    // Sheet 4: Danh mục chương trình đào tạo hiện có (nếu có)
    if (programs.length > 0) {
        const progLookup = programs.map((p, i) => ({
            'STT': i + 1,
            'MÃ KHÓA HỌC': p.code,
            'TÊN CHƯƠNG TRÌNH / CHỨNG CHỈ CCCM': p.name,
            'NHÓM': p.group_name || '',
            'THỜI HẠN (THÁNG)': p.validity_months || 'Không thời hạn',
        }));
        const wsProg = XLSX.utils.json_to_sheet(progLookup);
        wsProg['!cols'] = [{ wch: 6 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 18 }];
        XLSX.utils.book_append_sheet(wb, wsProg, 'DS_Khoa_Dao_Tao');
    }

    await saveWorkbook(wb, 'Mau_nhap_chung_chi_bang_cap.xlsx');
};

/**
 * PHÂN TÍCH VÀ KIỂM TRA FILE EXCEL CHỨNG CHỈ / BẰNG CẤP / GPLX
 */
export const parseCertificateExcel = async (
    file: File,
    users: IUser[],
    programs: ITrainingProgram[] = []
): Promise<ParsedCertificateRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                // Map users for fast lookup
                const userByCode = new Map<string, IUser>();
                const userByName = new Map<string, IUser>();
                users.forEach(u => {
                    if (u.employee_code) {
                        const rawCode = u.employee_code.trim().toLowerCase();
                        userByCode.set(rawCode, u);
                        const noLeadingZero = rawCode.replace(/^0+/, '');
                        if (noLeadingZero) userByCode.set(noLeadingZero, u);
                    }
                    userByCode.set(String(u.user_id), u);
                    userByCode.set(`nv-${u.user_id}`.toLowerCase(), u);
                    if (u.name) userByName.set(u.name.trim().toLowerCase(), u);
                });

                // Map training programs for quick matching
                const progByName = new Map<string, ITrainingProgram>();
                programs.forEach(p => {
                    if (p.name) progByName.set(p.name.trim().toLowerCase(), p);
                    if (p.code) progByName.set(p.code.trim().toLowerCase(), p);
                });

                const parsedList: ParsedCertificateRow[] = [];

                rawRows.forEach((row, index) => {
                    const getVal = (keys: string[]): any => {
                        for (const k of keys) {
                            for (const rowKey of Object.keys(row)) {
                                if (rowKey.trim().toLowerCase().includes(k.toLowerCase())) {
                                    const val = row[rowKey];
                                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                                        return val;
                                    }
                                }
                            }
                        }
                        return '';
                    };

                    const codeRaw = String(getVal(['mã nhân viên', 'ma nhan vien', 'msnv', 'mã nv'])).trim();
                    const nameRaw = String(getVal(['họ tên', 'ho ten', 'tên nhân viên', 'ten nhan vien', 'nhân viên'])).trim();
                    const categoryRaw = String(getVal(['phân loại', 'phan loai', 'nhóm', 'loại chứng chỉ', 'loai chung chi'])).trim();
                    const certNameRaw = String(getVal(['tên chứng chỉ', 'ten chung chi', 'tên bằng', 'hạng bằng', 'bằng cấp', 'khóa học'])).trim();
                    const certNumberRaw = String(getVal(['số hiệu', 'so hieu', 'số chứng chỉ', 'số bằng', 'số gplx'])).trim();
                    const authorityRaw = String(getVal(['cơ quan', 'co quan', 'đơn vị cấp', 'don vi cap', 'nơi cấp', 'trường'])).trim();
                    const issueDateRaw = getVal(['ngày cấp', 'ngay cap', 'cấp ngày']);
                    const expiryDateRaw = getVal(['ngày hết hạn', 'ngay het han', 'hết hạn', 'het han', 'thời hạn']);
                    const gradingRaw = String(getVal(['xếp loại', 'xep loai', 'điểm', 'diem'])).trim();
                    const majorRaw = String(getVal(['chuyên ngành', 'chuyen nganh', 'ngành'])).trim();

                    // Bỏ qua dòng trống
                    if (!codeRaw && !nameRaw && !certNameRaw) return;

                    // 1. Tìm user
                    let matchedUser: IUser | undefined = undefined;
                    if (codeRaw) {
                        const cleanCode = codeRaw.toLowerCase();
                        matchedUser = userByCode.get(cleanCode) || userByCode.get(cleanCode.replace(/^0+/, ''));
                    }
                    if (!matchedUser && nameRaw) {
                        matchedUser = userByName.get(nameRaw.toLowerCase());
                    }

                    // 2. Xác định Phân loại (Category Group)
                    const catLower = categoryRaw.toLowerCase();
                    const certLower = certNameRaw.toLowerCase();

                    let category: CertCategoryGroup = 'BANG_CAP';
                    let categoryLabel = 'Bằng cấp';
                    let dbType: ParsedCertificateRow['type'] = 'BANG_CAP';
                    let qualificationType: string | undefined = 'BANG_CAP';
                    let licenseClass: string | undefined = undefined;
                    let matchedProg: ITrainingProgram | undefined = undefined;

                    // Nhận diện GPLX
                    if (
                        catLower.includes('gplx') ||
                        catLower.includes('lái xe') ||
                        catLower.includes('lai xe') ||
                        catLower.includes('bằng lái') ||
                        /^(a1|a2|a3|a4|b1|b2|c|d|e|fb2|fc|fd|fe)$/i.test(certNameRaw.trim()) ||
                        /hạng\s*(a1|a2|a3|a4|b1|b2|c|d|e|fb2|fc|fd|fe)/i.test(certNameRaw)
                    ) {
                        category = 'GPLX';
                        categoryLabel = 'GPLX';
                        dbType = 'GIAY_PHEP';
                        qualificationType = 'GIAY_PHEP_LAI_XE';

                        // Bóc tách hạng bằng lái
                        const classMatch = certNameRaw.match(/(?:hạng\s*)?([A-E]|FC|FB2|FD|FE|A1|A2|A3|A4|B1|B2)\b/i);
                        licenseClass = classMatch ? classMatch[1].toUpperCase() : certNameRaw.trim().toUpperCase();
                    }
                    // Nhận diện CCCM / Đào tạo
                    else if (
                        catLower.includes('cccm') ||
                        catLower.includes('đào tạo') ||
                        catLower.includes('dao tao') ||
                        catLower.includes('chuyên môn') ||
                        catLower.includes('chuyen mon') ||
                        progByName.has(certLower)
                    ) {
                        category = 'CCCM';
                        categoryLabel = 'CCCM / Đào tạo';
                        dbType = 'CCCM';
                        qualificationType = undefined;
                        matchedProg = progByName.get(certLower);
                    }
                    // Mặc định là Bằng cấp (Đại học, Ngoại ngữ, Tin học)
                    else {
                        category = 'BANG_CAP';
                        categoryLabel = 'Bằng cấp';
                        dbType = 'BANG_CAP';

                        if (
                            certLower.includes('toeic') ||
                            certLower.includes('ielts') ||
                            certLower.includes('toefl') ||
                            certLower.includes('tiếng anh') ||
                            certLower.includes('ngoại ngữ')
                        ) {
                            qualificationType = 'CHUNG_CHI_NGOAI_NGU';
                        } else if (
                            certLower.includes('tin học') ||
                            certLower.includes('mos') ||
                            certLower.includes('ic3') ||
                            certLower.includes('cntt') ||
                            certLower.includes('công nghệ thông tin cơ bản')
                        ) {
                            qualificationType = 'CHUNG_CHI_TIN_HOC';
                        } else {
                            qualificationType = 'BANG_CAP';
                        }
                    }

                    // 3. Parse ngày tháng
                    const parsedIssue = parseDate(issueDateRaw);
                    const parsedExpiry = parseDate(expiryDateRaw);
                    const isPermanent = !parsedExpiry;

                    // 4. Validation
                    const errors: string[] = [];
                    if (!matchedUser) {
                        errors.push(`Không tìm thấy nhân viên "${codeRaw || nameRaw}"`);
                    }
                    if (!certNameRaw) {
                        errors.push('Thiếu tên chứng chỉ / bằng cấp / hạng GPLX');
                    }
                    if (!parsedIssue) {
                        errors.push(`Ngày cấp "${issueDateRaw}" không hợp lệ (định dạng DD/MM/YYYY)`);
                    }
                    if (parsedIssue && parsedExpiry && dayjs(parsedExpiry).isBefore(dayjs(parsedIssue))) {
                        errors.push('Ngày hết hạn không được trước ngày cấp');
                    }

                    parsedList.push({
                        rawRow: index + 2,
                        user_id: matchedUser?.user_id,
                        userName: matchedUser?.name || nameRaw || 'Không xác định',
                        employee_code: matchedUser?.employee_code || codeRaw,
                        avatar: matchedUser?.avatar,
                        category,
                        categoryLabel,
                        type: dbType,
                        qualification_type: qualificationType,
                        name: certNameRaw,
                        program_id: matchedProg?.id,
                        degree_type: category === 'BANG_CAP' || category === 'CCCM' ? certNameRaw : undefined,
                        major: majorRaw || undefined,
                        license_class: licenseClass,
                        certificate_number: certNumberRaw || undefined,
                        issuing_authority: authorityRaw || undefined,
                        issue_date: parsedIssue || '',
                        expiry_date: parsedExpiry || undefined,
                        is_permanent: isPermanent,
                        grading: gradingRaw || undefined,
                        isValid: errors.length === 0,
                        error: errors.join('; '),
                    });
                });

                resolve(parsedList);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * -------------------------------------------------------------
 * 1. PHÉP NĂM & NGHỈ (ANNUAL LEAVES)
 * -------------------------------------------------------------
 */

export interface ParsedAnnualLeaveRow {
    rawRow: number;
    user_id?: number;
    userName: string;
    employee_code?: string;
    avatar?: string;
    department_name?: string;
    start_work_year?: string;
    year: number;
    leave_balance_n2: number;
    leave_balance_n1: number;
    current_year_leave: number;
    total_entitlement: number;
    total_taken: number;
    remaining: number;
    m1_taken: number;
    m2_taken: number;
    m3_taken: number;
    m4_taken: number;
    m5_taken: number;
    m6_taken: number;
    m7_taken: number;
    m8_taken: number;
    m9_taken: number;
    m10_taken: number;
    m11_taken: number;
    m12_taken: number;
    isValid: boolean;
    error?: string;
}

export const exportAnnualLeaveTemplate = async (
    users: IUser[],
    year: number = dayjs().year()
): Promise<void> => {
    const wb = XLSX.utils.book_new();

    const sampleData = users.slice(0, 10).map((u, i) => ({
        'STT': i + 1,
        'HỌ VÀ TÊN': u.name,
        'MÃ NHÂN VIÊN (*)': u.employee_code || u.user_id,
        'NĂM VÀO LÀM': '2018',
        [`TỒN PHÉP ${year - 2}`]: i === 0 ? 8 : (i === 1 ? 14 : 10),
        [`PHÉP ${year - 1}`]: 15,
        [`PHÉP ${year} (*)`]: 15,
        'THÁNG 1': 0,
        'THÁNG 2': 0,
        'THÁNG 3': i === 0 ? 1 : 0,
        'THÁNG 4': i === 1 ? 4 : 0,
        'THÁNG 5': 0,
        'THÁNG 6': 0,
        'THÁNG 7': 0,
        'THÁNG 8': 0,
        'THÁNG 9': 0,
        'THÁNG 10': 0,
        'THÁNG 11': 0,
        'THÁNG 12': 0,
        'GHI CHÚ': '',
    }));

    const wsData = XLSX.utils.json_to_sheet(sampleData);
    wsData['!cols'] = [
        { wch: 6 },  // STT
        { wch: 24 }, // Họ tên
        { wch: 18 }, // Mã NV
        { wch: 14 }, // Năm vào làm
        { wch: 16 }, // Tồn N-2
        { wch: 14 }, // Phép N-1
        { wch: 16 }, // Phép năm nay
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
        { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, wsData, `Phep_Nam_${year}`);

    // Sheet Hướng dẫn
    const instructions = [
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU PHÉP NĂM': '1. Cột có dấu (*) là thông tin bắt buộc.' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU PHÉP NĂM': '2. MÃ NHÂN VIÊN: Phải trùng với Mã số nhân viên trên hệ thống.' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU PHÉP NĂM': `3. Các cột TỒN PHÉP ${year - 2}, PHÉP ${year - 1}, PHÉP ${year}: Nhập số ngày (dạng số nguyên hoặc số thập phân như 0.5, 1, 12).` },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU PHÉP NĂM': '4. Các cột THÁNG 1 -> THÁNG 12: Nhập số ngày nghỉ thực tế trong từng tháng.' },
        { 'HƯỚNG DẪN NHẬP DỮ LIỆU PHÉP NĂM': '5. Nếu nhân viên đã có dữ liệu phép của năm này, hệ thống sẽ tự động cập nhật đè số liệu mới.' },
    ];
    const wsHelp = XLSX.utils.json_to_sheet(instructions);
    wsHelp['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, wsHelp, 'Huong_Dan');

    await saveWorkbook(wb, `Mau_nhap_phep_nam_${year}.xlsx`);
};

export const parseAnnualLeaveExcel = async (
    file: File,
    users: IUser[],
    year: number = dayjs().year()
): Promise<ParsedAnnualLeaveRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const userByCode = new Map<string, IUser>();
                const userByName = new Map<string, IUser>();
                users.forEach(u => {
                    if (u.employee_code) {
                        const rawCode = u.employee_code.trim().toLowerCase();
                        userByCode.set(rawCode, u);
                        const noLeadingZero = rawCode.replace(/^0+/, '');
                        if (noLeadingZero) userByCode.set(noLeadingZero, u);
                    }
                    userByCode.set(String(u.user_id), u);
                    if (u.name) userByName.set(u.name.trim().toLowerCase(), u);
                });

                const parsedList: ParsedAnnualLeaveRow[] = [];

                rawRows.forEach((row, index) => {
                    const getVal = (keys: string[]): any => {
                        for (const k of keys) {
                            for (const rowKey of Object.keys(row)) {
                                if (rowKey.trim().toLowerCase().includes(k.toLowerCase())) {
                                    const val = row[rowKey];
                                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                                        return val;
                                    }
                                }
                            }
                        }
                        return '';
                    };

                    const codeRaw = String(getVal(['mã nhân viên', 'ma nhan vien', 'msnv', 'mã nv', 'họ và tên (mã nv)'])).trim();
                    const nameRaw = String(getVal(['họ và tên', 'ho va ten', 'họ tên', 'ho ten', 'tên nhân viên'])).trim();
                    const startYearRaw = String(getVal(['năm vào làm', 'nam vao lam', 'ngày vào', 'ngay vao'])).trim();

                    // Bỏ qua dòng tiêu đề phụ hoặc dòng trống
                    if (!codeRaw && !nameRaw) return;
                    if (nameRaw.toLowerCase().includes('đội an ninh') || nameRaw.toLowerCase().includes('đội kỹ thuật')) return;

                    let matchedUser: IUser | undefined = undefined;
                    if (codeRaw) {
                        const cleanCode = codeRaw.toLowerCase();
                        matchedUser = userByCode.get(cleanCode) || userByCode.get(cleanCode.replace(/^0+/, ''));
                    }
                    if (!matchedUser && nameRaw) {
                        matchedUser = userByName.get(nameRaw.toLowerCase());
                    }

                    // Đọc các giá trị phép
                    const n2Raw = Number(getVal([`tồn phép ${year - 2}`, `tồn ${year - 2}`, 'tồn phép 2024', 'tồn 2024', 'tồn n-2'])) || 0;
                    const n1Raw = Number(getVal([`phép ${year - 1}`, `tồn ${year - 1}`, 'phép 2025', 'tồn 2025', 'phép n-1'])) || 0;
                    const curRaw = Number(getVal([`phép ${year}`, 'phép 2026', 'phép năm nay', 'phép chuẩn', 'tiêu chuẩn'])) || 0;

                    // Đọc số ngày nghỉ từng tháng (1 -> 12)
                    const mTaken: number[] = [];
                    for (let m = 1; m <= 12; m++) {
                        const mVal = Number(getVal([`tháng ${m}`, `thang ${m}`, `t${m}`])) || 0;
                        mTaken.push(mVal);
                    }

                    const totalEntitlement = n2Raw + n1Raw + curRaw;
                    const totalTaken = mTaken.reduce((sum, v) => sum + v, 0);
                    const remaining = totalEntitlement - totalTaken;

                    const errors: string[] = [];
                    if (!matchedUser) {
                        errors.push(`Không tìm thấy nhân viên "${codeRaw || nameRaw}"`);
                    }

                    parsedList.push({
                        rawRow: index + 2,
                        user_id: matchedUser?.user_id,
                        userName: matchedUser?.name || nameRaw || 'Không xác định',
                        employee_code: matchedUser?.employee_code || codeRaw,
                        avatar: matchedUser?.avatar,
                        department_name: matchedUser?.department?.name,
                        start_work_year: startYearRaw || undefined,
                        year,
                        leave_balance_n2: n2Raw,
                        leave_balance_n1: n1Raw,
                        current_year_leave: curRaw,
                        total_entitlement: totalEntitlement,
                        total_taken: totalTaken,
                        remaining: remaining,
                        m1_taken: mTaken[0],
                        m2_taken: mTaken[1],
                        m3_taken: mTaken[2],
                        m4_taken: mTaken[3],
                        m5_taken: mTaken[4],
                        m6_taken: mTaken[5],
                        m7_taken: mTaken[6],
                        m8_taken: mTaken[7],
                        m9_taken: mTaken[8],
                        m10_taken: mTaken[9],
                        m11_taken: mTaken[10],
                        m12_taken: mTaken[11],
                        isValid: errors.length === 0,
                        error: errors.join('; '),
                    });
                });

                resolve(parsedList);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file Excel'));
        reader.readAsArrayBuffer(file);
    });
};

/**
 * -------------------------------------------------------------
 * 2. CÔNG NỢ CA / THEO DÕI NỢ - TRẢ CA (SHIFT DEBTS)
 * -------------------------------------------------------------
 */

export interface ParsedShiftDebtRow {
    rawRow: number;
    user_id?: number;
    userName: string;
    employee_code?: string;
    avatar?: string;
    department_name?: string;
    year: number;
    month: number;
    opening_debt: number; // (4) Nợ ca/lễ tồn tháng trước
    taken_days: number;   // (5) Nghỉ bù ca/lễ phát sinh trong tháng
    accrued_days: number; // (6) Nợ ca/lễ phát sinh trong tháng
    closing_debt: number; // (7) = (4) - (5) + (6) Nợ ca/lễ tồn tính đến hết tháng
    reason?: string;      // (8) Ghi chú lý do nợ ca/lễ trong tháng
    isValid: boolean;
    error?: string;
}

export const exportShiftDebtTemplate = async (
    users: IUser[],
    year: number = dayjs().year(),
    month: number = dayjs().month() + 1
): Promise<void> => {
    const wb = XLSX.utils.book_new();

    const sampleData = users.slice(0, 15).map((u, i) => {
        const opening = i === 0 ? 12 : (i === 1 ? 18 : (i === 2 ? 6 : (i === 3 ? 7.5 : 10)));
        const taken = i === 3 ? 5 : (i === 4 ? 1 : 0);
        const accrued = i === 0 ? 2 : (i === 1 ? 3 : (i === 2 ? 1 : 0.5));
        const closing = opening - taken + accrued;
        const reasons = [
            'lễ giỗ tổ và 30/4',
            'Tăng cường 14/4, lễ giỗ tổ và 30/4',
            'Tăng cường 6/4 thay băng tải máy soi',
            'Nghỉ bù ca',
            'Tăng cường ngày 5,6,19 thiếu nhân sự xe khách',
            'Tăng cường xua đuổi chim 0.5 ngày (2 buổi)',
        ];
        return {
            'STT': i + 1,
            'HỌ TÊN': u.name,
            'MÃ SỐ NV (*)': u.employee_code || u.user_id,
            'NỢ CA/LỄ TỒN THÁNG TRƯỚC (SỐ NGÀY)': opening,
            'NGHỈ BÙ CA/LỄ PHÁT SINH TRONG THÁNG (SỐ NGÀY)': taken,
            'NỢ CA/LỄ PHÁT SINH TRONG THÁNG (SỐ NGÀY)': accrued,
            'NỢ CA/LỄ TỒN TÍNH ĐẾN HẾT THÁNG BÁO CÁO (SỐ NGÀY)': closing,
            'GHI CHÚ LÝ DO NỢ CA/LỄ TRONG THÁNG': reasons[i % reasons.length],
        };
    });

    const wsData = XLSX.utils.json_to_sheet(sampleData);
    wsData['!cols'] = [
        { wch: 6 },  // STT
        { wch: 25 }, // Họ tên
        { wch: 18 }, // Mã số NV
        { wch: 32 }, // Nợ ca tồn tháng trước
        { wch: 36 }, // Nghỉ bù phát sinh trong tháng
        { wch: 34 }, // Nợ ca phát sinh trong tháng
        { wch: 36 }, // Nợ ca tồn tính đến hết tháng
        { wch: 45 }, // Ghi chú lý do
    ];
    XLSX.utils.book_append_sheet(wb, wsData, `No_Tra_Ca_T${month}_${year}`);

    // Sheet Hướng dẫn
    const instructions = [
        { 'HƯỚNG DẪN BẢNG THEO DÕI NỢ/TRẢ CA': '1. Biểu mẫu chuẩn theo dõi nợ ca / làm bù ca kíp của Cảng hàng không Côn Đảo.' },
        { 'HƯỚNG DẪN BẢNG THEO DÕI NỢ/TRẢ CA': '2. MÃ SỐ NV (*): Bắt buộc, khớp với mã nhân viên trên hệ thống.' },
        { 'HƯỚNG DẪN BẢNG THEO DÕI NỢ/TRẢ CA': '3. CÔNG THỨC: Tồn đến hết tháng = (Tồn tháng trước) - (Nghỉ bù trong tháng) + (Nợ phát sinh trong tháng).' },
        { 'HƯỚNG DẪN BẢNG THEO DÕI NỢ/TRẢ CA': '4. Số ngày có thể nhập số thập phân (ví dụ: 0.5 = nửa ngày/1 buổi, 1.5, 7.5).' },
        { 'HƯỚNG DẪN BẢNG THEO DÕI NỢ/TRẢ CA': '5. GHI CHÚ: Ghi rõ lý do (ví dụ: Trực lễ 30/4, Tăng cường máy soi, Xua đuổi chim...).' },
    ];
    const wsHelp = XLSX.utils.json_to_sheet(instructions);
    wsHelp['!cols'] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, wsHelp, 'Huong_Dan');

    await saveWorkbook(wb, `Bang_theo_doi_no_tra_ca_thang_${month}_${year}.xlsx`);
};

export const parseShiftDebtExcel = async (
    file: File,
    users: IUser[],
    year: number = dayjs().year(),
    month: number = dayjs().month() + 1
): Promise<ParsedShiftDebtRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                const userByCode = new Map<string, IUser>();
                const userByName = new Map<string, IUser>();
                users.forEach(u => {
                    if (u.employee_code) {
                        const rawCode = u.employee_code.trim().toLowerCase();
                        userByCode.set(rawCode, u);
                        const noLeadingZero = rawCode.replace(/^0+/, '');
                        if (noLeadingZero) userByCode.set(noLeadingZero, u);
                    }
                    userByCode.set(String(u.user_id), u);
                    if (u.name) userByName.set(u.name.trim().toLowerCase(), u);
                });

                const parsedList: ParsedShiftDebtRow[] = [];

                rawRows.forEach((row, index) => {
                    const getVal = (keys: string[]): any => {
                        for (const k of keys) {
                            for (const rowKey of Object.keys(row)) {
                                if (rowKey.trim().toLowerCase().includes(k.toLowerCase())) {
                                    const val = row[rowKey];
                                    if (val !== undefined && val !== null && String(val).trim() !== '') {
                                        return val;
                                    }
                                }
                            }
                        }
                        return '';
                    };

                    const codeRaw = String(getVal(['mã số nv', 'ma so nv', 'msnv', 'mã nv', 'mã'])).trim();
                    const nameRaw = String(getVal(['họ tên', 'ho ten', 'họ và tên', 'ho va ten', 'tên nhân viên'])).trim();
                    const openingRaw = getVal(['nợ ca/lễ tồn tháng trước', 'tồn tháng trước', 'tồn trước', 'đầu kỳ']);
                    const takenRaw = getVal(['nghỉ bù ca/lễ', 'nghỉ bù', 'trả ca', 'đã nghỉ']);
                    const accruedRaw = getVal(['nợ ca/lễ phát sinh', 'phát sinh trong tháng', 'phát sinh']);
                    const closingRaw = getVal(['tồn tính đến hết tháng', 'tồn cuối', 'cuối kỳ']);
                    const reasonRaw = String(getVal(['ghi chú lý do', 'lý do', 'ghi chú', 'ly do'])).trim();

                    // Bỏ qua dòng trống
                    if (!codeRaw && !nameRaw) return;

                    let matchedUser: IUser | undefined = undefined;
                    if (codeRaw) {
                        const cleanCode = codeRaw.toLowerCase();
                        matchedUser = userByCode.get(cleanCode) || userByCode.get(cleanCode.replace(/^0+/, ''));
                    }
                    if (!matchedUser && nameRaw) {
                        matchedUser = userByName.get(nameRaw.toLowerCase());
                    }

                    const opening = Number(String(openingRaw).replace(',', '.')) || 0;
                    const taken = Number(String(takenRaw).replace(',', '.')) || 0;
                    const accrued = Number(String(accruedRaw).replace(',', '.')) || 0;
                    const calculatedClosing = opening - taken + accrued;
                    const closing = closingRaw !== '' ? (Number(String(closingRaw).replace(',', '.')) || calculatedClosing) : calculatedClosing;

                    const errors: string[] = [];
                    if (!matchedUser) {
                        errors.push(`Không tìm thấy nhân viên "${codeRaw || nameRaw}"`);
                    }

                    parsedList.push({
                        rawRow: index + 2,
                        user_id: matchedUser?.user_id,
                        userName: matchedUser?.name || nameRaw || 'Không xác định',
                        employee_code: matchedUser?.employee_code || codeRaw,
                        avatar: matchedUser?.avatar,
                        department_name: matchedUser?.department?.name,
                        year,
                        month,
                        opening_debt: opening,
                        taken_days: taken,
                        accrued_days: accrued,
                        closing_debt: closing,
                        reason: reasonRaw || undefined,
                        isValid: errors.length === 0,
                        error: errors.join('; '),
                    });
                });

                resolve(parsedList);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = () => reject(new Error('Lỗi đọc file Excel'));
        reader.readAsArrayBuffer(file);
    });
};
