import { IUser } from '../types/user.types';
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
 * EXPORT: Xuất danh sách users ra file Excel
 */
export const exportUsersToExcel = async (users: IUser[]): Promise<void> => {
    const XLSX = await import('xlsx');

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
    XLSX.writeFile(wb, `Danh_sach_nhan_vien_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`);
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
    const XLSX = await import('xlsx');

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
