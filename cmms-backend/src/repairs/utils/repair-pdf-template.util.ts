import { Repair } from '../entities/repair.entity';
import dayjs from 'dayjs';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';

// Helper to clean text
const cleanText = (text: any) => {
    if (text === null || text === undefined) return '';
    return String(text).trim();
};

// Helper for committee titles
const getCommitteeTitle = (role: string) => {
    const map: any = {
        'TECHNICIAN': 'Nhân viên kỹ thuật',
        'TEAM_LEAD': 'Tổ trưởng',
        'UNIT_HEAD': 'Đội trưởng',
        'DIRECTOR': 'Ban Giám đốc',
        'OPERATOR': 'Nhân viên vận hành',
        'ADMIN': 'Quản lý'
    };
    return map[role] || role;
};

// Shared Styles
const styles = `
    @page { 
        size: A4; 
        margin: 2cm 2cm 2cm 2cm; 
    }
    body { 
        font-family: 'Times New Roman', serif; 
        font-size: 13pt; 
        line-height: 1.4; 
        color: #000;
        margin: 0;
        padding: 0;
    }
    
    .page {
        width: 100%;
        page-break-after: always;
        position: relative;
        min-height: 250mm; /* Ensure footer sits at bottom of content area (A4 297mm - 40mm margins) */
    }
    .page:last-child {
        page-break-after: auto;
    }

    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 4px; vertical-align: top; }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .text-justify { text-align: justify; }
    
    .bold { font-weight: bold; }
    .italic { font-style: italic; }
    .uppercase { text-transform: uppercase; }
    .underline { text-decoration: underline; }
    
    .header-table { 
        table-layout: fixed; 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 20px;
    }
    .header-table td { padding: 0; vertical-align: top; }
    .form-code { font-size: 11pt; text-align: right; margin-bottom: 5px; }
    
    .title { 
        font-size: 14pt; 
        margin-top: 30px; 
        margin-bottom: 25px; 
        font-weight: bold; 
        text-align: center; 
    }
    
    .section-label { font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
    .content-block { margin-top: 5px; margin-bottom: 10px; text-align: justify; }
    .indent-level-1 { margin-left: 20px; }
    
    .sign-table { margin-top: 20px; page-break-inside: avoid; }
    .sign-table td { text-align: center; vertical-align: bottom; padding: 0; }
    .sign-title { font-weight: bold; font-size: 13pt; margin-bottom: 15px; } 

    /* Signature Image Style */
    .signature-img {
        max-width: 120px;
        max-height: 80px;
        display: block;
        margin: 0 auto;
    }
    .signature-placeholder {
        height: 60px;
        display: block;
        margin: 0 auto; /* Centered */
    }
    
    /* Ensure sign block centers content */
    .sign-block {
         display: flex;
         flex-direction: column;
         align-items: center;
         justify-content: flex-end;
         height: 100%; 
    }

    .footer { 
        position: absolute; 
        bottom: 0; 
        left: 0;
        right: 0;
        width: 100%; 
        font-size: 10pt; 
        padding-top: 5px;
        background: white;
    }
    
    .bordered-table { width: 100%; border-collapse: collapse; table-layout: auto; }
    .bordered-table th, .bordered-table td { border: 1px solid black; padding: 8px 5px; vertical-align: middle; }
    .bordered-table th { font-weight: normal; text-align: center; }

    /* Section Titles B04/B05 */
    .section-title { margin-top: 15px; font-weight: bold; text-transform: uppercase; }
    .subsection-title { margin-top: 10px; font-weight: bold; }
    .content-indent { margin-left: 20px; }
    .list-item { margin-bottom: 5px; }
`;

// Helper: Signature Block
const signBlock = (title: string, user?: any, isDirector: boolean = false, showImage: boolean = false, hideName: boolean = false) => {
    let signatureHtml = '<div class="signature-placeholder" style="height: 60px;"></div>';
    
    // Only show signature if user exists, has a signature URL, and showImage is true, AND not hiding name
    if (!hideName && showImage && user && user.signature_url) {
        try {
            let src = user.signature_url;
            let filePath = '';

            // Handle relative paths (e.g., /uploads/...)
            if (src.startsWith('/')) {
                // If it starts with /uploads, assume it's in project root/uploads
                // Otherwise it might be relative to public or something, but usually it's /uploads
                // We'll normalize to project root
                filePath = join(process.cwd(), src);
            } 
            
            // Validate and read file
            if (filePath && existsSync(filePath)) {
                const fileBuffer = readFileSync(filePath);
                // Determine mime type roughly (mostly png or jpg)
                const ext = src.split('.').pop()?.toLowerCase();
                const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
                const base64 = fileBuffer.toString('base64');
                
                signatureHtml = `<img src="data:${mimeType};base64,${base64}" class="signature-img" alt="signature" />`;
            } else {
                // Determine if it's a full URL (http/https) - simplistic check
                if (src.startsWith('http')) {
                     // For remote URLs, we can keep the src, but puppeteer might need network access
                     // Better stick to src if we can't read local
                     signatureHtml = `<img src="${src}" class="signature-img" alt="signature" />`;
                }
            }
        } catch (e) {
            console.error('Error embedding signature:', e);
            // Fallback to placeholder on error
        }
    }

    const displayName = hideName ? '' : cleanText(user?.name);

    return `
        <div class="sign-block" style="margin-bottom: 20px;">
            <div class="sign-title ${isDirector ? 'director-sign-space' : ''}">${title}</div>
            ${signatureHtml}
            <div class="bold" style="white-space: nowrap; margin-top: 5px;">${displayName}</div>
        </div>
    `;
};


// Helper: Footer
const getFooter = (formCode: string, pageIndex: number, totalPages?: number) => {
    const pageInfo = totalPages ? `${pageIndex}/${totalPages}` : `${pageIndex}`;
    return `
        <div class="footer" style="padding-left: 2cm; padding-right: 2cm; box-sizing: border-box;">
            <div style="border-top: 1px solid black; padding-top: 5px; display: flex; justify-content: space-between; font-size: 10pt; font-style: italic;">
                <div>${formCode}</div>
                <div>Lần ban hành/sửa đổi: 01/00</div>
                <div>${pageInfo}</div>
            </div>
        </div>
    `;
};

// Helper to format date
const getFormattedDate = (date: Date | string | null | undefined, fallbackToToday: boolean = false) => {
    if (!date && !fallbackToToday) return { day: '....', month: '....', year: '....' , full: '.....................................................................' };
    
    // If no date provided but fallback is true, use current date
    const d = date ? dayjs(date) : dayjs();
    
    return {
        day: d.format('DD'),
        month: d.format('MM'),
        year: d.format('YYYY'),
        full: d.format('HH:mm [ngày] DD/MM/YYYY')
    };
};

// ----------------------------------------------------
// B03 GENERATOR
// ----------------------------------------------------
// ----------------------------------------------------
// B03 GENERATOR
// ----------------------------------------------------
const generateB03 = (repair: Repair, embedFooter: boolean = false, pageIndex: number = 1, totalPages: number = 1, showSignature: boolean = false, hideName: boolean = false, hideDates: boolean = false) => {
    const d = getFormattedDate(repair.created_at, true); // Fallback to today if missing (required for new requests)
    const dateStr = hideDates
        ? "ngày ..... tháng ..... năm ......"
        : `ngày ${d.day} tháng ${d.month} năm ${d.year}`;
    
    const header = `
        <div class="form-code italic">Biểu mẫu: B03.QT08/VCS-KT</div>
        <table class="header-table">
            <tr>
                <td width="35%" class="text-center">
                    <div class="bold uppercase">CẢNG HÀNG KHÔNG<br>CÔN ĐẢO</div>
                    <div class="bold uppercase underline">ĐỘI KỸ THUẬT</div>
                    <div class="italic" style="margin-top: 5px;">Số: ...../PYC-ĐKT</div>
                </td>
                <td width="65%" class="text-center">
                    <div class="bold uppercase" style="white-space: nowrap;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="bold underline">Độc lập – Tự do – Hạnh phúc</div>
                    <div class="italic text-right" style="margin-top: 15px; margin-right: 0;">
                        Côn Đảo, ${dateStr}
                    </div>
                </td>
            </tr>
        </table>
    `;

    const footer = embedFooter ? getFooter('B03.QT08/VCS-KT', pageIndex, totalPages) : '';

    return `
        ${header}
        <div class="title uppercase">PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG – SỬA CHỮA</div>
        
        <div class="bold text-left" style="margin-bottom: 5px;">Lý lịch thiết bị:</div>
        <div class="indent-level-1">
            <div style="margin-bottom: 5px;">- Tên thiết bị: ${cleanText(repair.device?.name)}</div>
            <div style="margin-bottom: 5px;">- Số đăng ký: ${cleanText(repair.device?.reg_number)}</div>
            <div style="margin-bottom: 5px;">- Đơn vị quản lý tài sản: ${cleanText(repair.created_department?.name || 'Đội kỹ thuật')}</div>
        </div>

        <div class="section-label">1. Mô tả sự cố hỏng hóc:</div>
        <div class="content-block indent-level-1">
            ${cleanText(repair.location_issue) || cleanText(repair.note)}
        </div>

        <div class="section-label">2. Kiến nghị, biện pháp khắc phục:</div>
        <div class="content-block indent-level-1">
            ${cleanText(repair.recommendation) || 'Đội kỹ thuật cho người kiểm tra sửa chữa.'}
        </div>

        <div class="text-right italic" style="margin-top: 30px; margin-right: 0;">
            Côn Đảo, ${dateStr}
        </div>

        <table class="sign-table">
            <tr>
                <td width="33%">${signBlock('TỔ KỸ THUẬT', repair.approved_by_tech_request, false, showSignature, hideName)}</td>
                <td width="33%">${signBlock('TỔ VHTTBMĐ', repair.created_by, false, showSignature, hideName)}</td>
                <td width="33%">${signBlock('CÁN BỘ ĐỘI', repair.approved_by_manager_request, false, showSignature, hideName)}</td>
            </tr>
            <tr>
                <td colspan="3" style="padding-top: 30px;">
                    <div style="width: 40%; margin: 0 auto;">
                        ${signBlock('BAN GIÁM ĐỐC', repair.approved_by_admin_request || repair.approved_by_manager_request, true, showSignature, hideName)}
                    </div>
                </td>
            </tr>
        </table>
        ${footer}
    `;
};


// ----------------------------------------------------
// B04 GENERATOR
// ----------------------------------------------------
const generateB04 = (repair: Repair, embedFooter: boolean = false, pageIndex: number = 1, totalPages: number = 1, showSignature: boolean = false, hideName: boolean = false, hideDates: boolean = false) => {
    // For B04, if no inspection date, leave blank (dots) unless user wants otherwise. 
    // Assuming "Căn cứ vào thông tin phiếu" means if data exists, fill it.
    const d = getFormattedDate(repair.inspection_created_at || repair.created_at, true);
    const dateStr = hideDates
        ? "ngày ..... tháng ..... năm ......"
        : `ngày ${d.day} tháng ${d.month} năm ${d.year}`; 
    
    const header = `
        <div class="form-code italic">Biểu mẫu: B04.QT08/VCS-KT</div>
        <table class="header-table">
            <tr>
                <td width="35%" class="text-center">
                    <div class="bold uppercase">CẢNG HÀNG KHÔNG<br>CÔN ĐẢO</div>
                    <div class="bold uppercase underline">ĐỘI KỸ THUẬT</div>
                    <div class="italic" style="margin-top: 5px;">Số: ...../BBKN-ĐKT</div>
                </td>
                <td width="65%" class="text-center">
                    <div class="bold uppercase" style="white-space: nowrap;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="bold underline">Độc lập – Tự do – Hạnh phúc</div>
                    <div class="italic text-right" style="margin-top: 15px; margin-right: 0;">
                        Côn Đảo, ${dateStr}
                    </div>
                </td>
            </tr>
        </table>
    `;

    const itemsRows = repair.inspection_items?.map((item, idx) => `
        <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${cleanText(item.description)}</td>
            <td>${cleanText(item.cause)}</td>
            <td>${cleanText(item.solution)}</td>
            <td></td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center italic">Không có dữ liệu</td></tr>';

    const materialRows = repair.inspection_materials?.map((mat: any, idx) => `
        <tr>
            <td class="text-center">${idx + 1}</td>
            <td>${cleanText(mat.item_name)}</td>
            <td>${cleanText(mat.item_code || mat.specifications)}</td>
            <td class="text-center">${mat.quantity} ${cleanText(mat.unit)}</td>
            <td>${cleanText(mat.notes)}</td>
        </tr>
    `).join('') || '<tr><td colspan="5" class="text-center italic">Không có phát sinh vật tư</td></tr>';

    const footer = embedFooter ? getFooter('B04.QT08/VCS-KT', pageIndex, totalPages) : '';

    // Calculate inspection time for Section 3 if available
    let inspectionTime = '.....................................................................';
    if (!hideDates && repair.inspection_created_at) {
        inspectionTime = dayjs(repair.inspection_created_at).format('[ngày] DD/MM/YYYY');
    }

    return `
        ${header}
        <div class="title uppercase" style="white-space: nowrap;">BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT VÀ ĐỀ NGHỊ VẬT TƯ SỬA CHỮA</div>
        
        <div class="section-title">I. PHẦN TỔNG QUÁT:</div>
        
        <div class="subsection-title">1. Lý lịch thiết bị:</div>
        <div class="content-indent">
            <div class="list-item">- Tên thiết bị: ${cleanText(repair.device?.name)}</div>
            <div class="list-item">- Số đăng ký: ${cleanText(repair.device?.reg_number)}</div>
            <div class="list-item">- Đơn vị quản lý: Đội kỹ thuật.</div>
            <div class="list-item">- Số giờ/km hoạt động: .....................................................................</div>
        </div>

        <div class="subsection-title" style="margin-top: 15px;">2. Thành phần kiểm nghiệm:</div>
        <table class="" style="margin-left: 40px; width: auto;">
            ${repair.inspection_committee?.map((u, idx) => `
                <tr>
                    <td style="padding-right: 15px; text-align: left;">${idx + 1}. Ông: ${u.name}</td>
                    <td style="text-align: left;">Chức vụ: ${getCommitteeTitle(u.role)}</td>
                </tr>
            `).join('') || '<tr><td>(Chưa cập nhật thành phần)</td></tr>'}
        </table>

        <div class="subsection-title" style="margin-top: 15px;">3. Thời gian kiểm nghiệm: <span style="font-weight: normal;">${inspectionTime}</span></div>

        <div class="section-title">II. NỘI DUNG KIỂM NGHIỆM:</div>
        <table class="bordered-table text-center" style="margin-top: 10px;">
            <thead>
                <tr>
                    <th width="5%"><div class="bold">STT</div></th>
                    <th width="35%"><div class="bold">Mô tả hư hỏng</div></th>
                    <th width="25%"><div class="bold">Nguyên nhân hư hỏng</div></th>
                    <th width="25%"><div class="bold">Biện pháp sửa chữa</div></th>
                    <th width="10%"><div class="bold">Ghi chú</div></th>
                </tr>
            </thead>
            <tbody>${itemsRows}</tbody>
        </table>

        <div class="section-title" style="margin-top: 25px;">III. PHẦN ĐỀ NGHỊ CUNG CẤP VẬT TƯ</div>
        <table class="bordered-table text-center" style="margin-top: 10px;">
                <thead>
                <tr>
                    <th width="5%"><div class="bold">STT</div></th>
                    <th width="40%"><div class="bold">Tên vật tư, phụ tùng cần thay thế</div></th>
                    <th width="25%"><div class="bold">Quy cách, mã số</div></th>
                    <th width="15%"><div class="bold">Số lượng</div></th>
                    <th width="15%"><div class="bold">Ghi chú</div></th>
                </tr>
            </thead>
            <tbody>${materialRows}</tbody>
        </table>

        <div class="section-title" style="margin-top: 25px;">IV. CÁC Ý KIẾN KHÁC (nếu có):</div>
        <div class="content-indent" style="margin-top: 5px; min-height: 40px;">
            ${cleanText(repair.inspection_other_opinions)}
        </div>

        <div class="text-right italic" style="margin-top: 40px; margin-right: 20px;">
            Côn Đảo, ${dateStr}
        </div>

        <table class="sign-table">
            <tr>
                <td width="33%">${signBlock('TỔ KỸ THUẬT', repair.inspection_created_by, false, showSignature, hideName)}</td>
                <td width="33%">${signBlock('TỔ VHTTBMĐ', repair.approved_by_operator_lead_inspection, false, showSignature, hideName)}</td>
                <td width="33%">${signBlock('CÁN BỘ ĐỘI', repair.approved_by_manager_inspection, false, showSignature, hideName)}</td>
            </tr>
            <tr>
                <td colspan="3" style="padding-top: 30px;">${signBlock('BAN GIÁM ĐỐC', repair.approved_by_admin_inspection || repair.approved_by_manager_inspection, true, showSignature, hideName)}</td>
            </tr>
        </table>
        ${footer}
    `;
};


// ----------------------------------------------------
// B05 GENERATOR
// ----------------------------------------------------
const generateB05 = (repair: Repair, embedFooter: boolean = false, pageIndex: number = 1, totalPages: number = 1, showSignature: boolean = false, hideName: boolean = false, hideDates: boolean = false) => {
    const d = getFormattedDate(repair.acceptance_created_at || repair.inspection_created_at || repair.created_at, true);
    
    const dateStr = hideDates
        ? "ngày ..... tháng ..... năm ......"
        : `ngày ${d.day} tháng ${d.month} năm ${d.year}`;

    // For "3. Thời gian nghiệm thu"
    // Use acceptance_created_at if available, otherwise blank dots
    const acceptanceTime = (repair.acceptance_created_at && !hideDates) ? dayjs(repair.acceptance_created_at).format('[ngày] DD/MM/YYYY') : '................................................................';

    const header = `
        <div class="form-code italic">Biểu mẫu: B05.QT08/VCS-KT</div>
        <table class="header-table">
            <tr>
                <td width="35%" class="text-center">
                    <div class="bold uppercase">CẢNG HÀNG KHÔNG<br>CÔN ĐẢO</div>
                    <div class="bold uppercase underline">ĐỘI KỸ THUẬT</div>
                    <div class="italic" style="margin-top: 5px;">Số: ...../BBNT-ĐKT</div>
                </td>
                <td width="65%" class="text-center">
                    <div class="bold uppercase" style="white-space: nowrap;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="bold underline">Độc lập – Tự do – Hạnh phúc</div>
                    <div class="italic text-right" style="margin-top: 15px; margin-right: 0;">
                        Côn Đảo, ${dateStr}
                    </div>
                </td>
            </tr>
        </table>
    `;

    // Calculate Materials
    const itemsMap = new Map<string, {
        unit: string;
        replaceQty: string;
        recoverQty: string;
        recoverPerc: string;
        scrapQty: string;
        scrapPerc: string;
    }>();

    const normalize = (n: string) => n?.trim() || '';

    // 1. Inspection Materials (Replace)
    repair.inspection_materials?.forEach((m: any) => {
        const name = normalize(m.item_name);
        if (!name) return;
        if (!itemsMap.has(name)) itemsMap.set(name, { unit: m.unit || '', replaceQty: '', recoverQty: '', recoverPerc: '', scrapQty: '', scrapPerc: '' });
        const item = itemsMap.get(name)!;
        item.unit = m.unit || item.unit;
        item.replaceQty = String(m.quantity || '');
    });

    // 2. Recovered Materials
    repair.recovered_materials?.forEach((m: any) => {
        const name = normalize(m.name);
        if (!name) return;
        if (!itemsMap.has(name)) itemsMap.set(name, { unit: m.unit || '', replaceQty: '', recoverQty: '', recoverPerc: '', scrapQty: '', scrapPerc: '' });
        const item = itemsMap.get(name)!;
        item.unit = m.unit || item.unit;
        item.recoverQty = String(m.quantity || '');
        item.recoverPerc = String(m.damage_percentage || '');
    });

    // 3. Scrap Materials
    repair.materials_to_scrap?.forEach((m: any) => {
        const name = normalize(m.name);
        if (!name) return;
        if (!itemsMap.has(name)) itemsMap.set(name, { unit: m.unit || '', replaceQty: '', recoverQty: '', recoverPerc: '', scrapQty: '', scrapPerc: '' });
        const item = itemsMap.get(name)!;
        item.unit = m.unit || item.unit;
        item.scrapQty = String(m.quantity || '');
        item.scrapPerc = String(m.damage_percentage || '');
    });

    let matIndex = 1;
    let materialRows = '';
    
    if (itemsMap.size > 0) {
        itemsMap.forEach((val, name) => {
            materialRows += `
            <tr>
                <td class="text-center">${matIndex++}</td>
                <td>${name}</td>
                <td class="text-center">${val.unit}</td>
                <td class="text-center">${val.replaceQty}</td>
                <td class="text-center">${val.recoverQty}</td>
                <td class="text-center">${val.recoverPerc ? val.recoverPerc + '%' : ''}</td>
                <td class="text-center">${val.scrapQty}</td>
                <td class="text-center">${val.scrapPerc ? val.scrapPerc + '%' : ''}</td>
            </tr>
            `;
        });
    } else {
        materialRows = '<tr><td colspan="8" class="text-center italic">Không có dữ liệu</td></tr>';
    }

    const footer = embedFooter ? getFooter('B05.QT08/VCS-KT', pageIndex, totalPages) : '';

    return `
        ${header}
        <div class="title uppercase" style="margin-bottom: 5px;">BIÊN BẢN NGHIỆM THU SỬA CHỮA - BẢO DƯỠNG</div>
        
        <div class="text-left italic" style="margin-bottom: 20px;">
            Căn cứ: Theo nội dung yêu cầu sửa chữa ....................................
        </div>

        <div class="section-label">I. PHẦN TỔNG QUÁT:</div>
        
        <div class="bold" style="margin-top: 5px;">1. Lý lịch thiết bị:</div>
        <div class="indent-level-1">
            <div style="margin-bottom: 5px;">- Tên thiết bị: ${cleanText(repair.device?.name)}</div>
            <div style="margin-bottom: 5px;">- Biển số đăng ký: ${cleanText(repair.device?.reg_number || "................................................................")}</div>
            <div style="margin-bottom: 5px;">- Nơi đặt: ${cleanText(repair.device?.location_coordinates || "................................................................")}</div>
            <div style="margin-bottom: 5px;">- Đơn vị quản lý: ${cleanText(repair.created_department?.name || 'Đội kỹ thuật')}</div>
        </div>

        <div class="bold" style="margin-top: 10px;">2. Thành phần kiểm tra:</div>
        <table class="" style="margin-left: 20px; width: auto; margin-bottom: 5px;">
                ${repair.acceptance_committee?.map((u, idx) => `
                <tr>
                    <td style="padding-right: 15px; padding-bottom: 5px;">${idx + 1}. Ông/Bà: ${u.name}</td>
                    <td style="padding-bottom: 5px;">Chức vụ: ${getCommitteeTitle(u.role)}</td>
                </tr>
            `).join('') || '<tr><td>(Chưa cập nhật thành phần)</td></tr>'}
        </table>

        <div class="bold" style="margin-top: 5px;">3. Thời gian nghiệm thu: <span style="font-weight: normal;">${acceptanceTime}</span></div>


        <div class="section-label uppercase" style="margin-top: 20px;">II. NỘI DUNG NGHIỆM THU:</div>

        <div class="bold" style="margin-top: 5px;">1. Mô tả sự cố hỏng hóc:</div>
        <div class="content-block indent-level-1">
            ${cleanText(repair.failure_description) || cleanText(repair.location_issue) || '(Không có mô tả)'}
        </div>

        <div class="bold" style="margin-top: 5px;">2. Xác định nguyên nhân hỏng hóc:</div>
        <div class="content-block indent-level-1">
            ${cleanText(repair.failure_cause) || '(Chưa xác định)'}
        </div>

        <div class="bold" style="margin-top: 5px;">3. Vật tư cần thay thế: <span style="font-weight: normal;">(Ghi rõ chủng loại, số lượng vật tư, phụ tùng cần thay thế, kèm phiếu đề nghị vật tư)</span></div>
        
        <table class="bordered-table text-center" style="margin-top: 10px;">
            <thead>
                    <tr>
                    <th rowspan="2" width="5%"><div class="bold">Stt</div></th>
                    <th colspan="3" width="35%"><div class="bold">Vật tư thay thế</div></th>
                    <th colspan="2" width="30%"><div class="bold">Vật tư thu hồi<br><i>Recovered Material</i></div></th>
                    <th colspan="2" width="30%"><div class="bold">Vật tư xin hủy<br><i>Material for Disposal</i></div></th>
                </tr>
                    <tr>
                    <th width="20%">Tên</th>
                    <th width="7%">ĐV</th>
                    <th width="8%">SL</th>
                    <th width="10%">SL</th>
                    <th width="20%">% hư hỏng</th>
                    <th width="10%">SL</th>
                    <th width="20%">% hư hỏng</th>
                </tr>
            </thead>
            <tbody>${materialRows}</tbody>
        </table>


        <div class="section-label uppercase" style="margin-top: 20px;">III. KẾT LUẬN:</div>
        <div class="content-block indent-level-1">
            ${cleanText(repair.acceptance_note) || 'Sau khi tiến hành thay thế, xe hoạt động ổn định và an toàn.'}
        </div>

        <div class="section-label uppercase" style="margin-top: 20px;">IV. CÁC Ý KIẾN KHÁC NẾU CÓ:</div>
        <div class="content-block indent-level-1" style="border-bottom: 1px dotted black; min-height: 20px;">
            ${cleanText(repair.acceptance_other_opinions)}
        </div>
        <div class="content-block" style="border-bottom: 1px dotted black; min-height: 20px; margin-top: 5px;"></div>


        <div class="text-right italic" style="margin-top: 30px;">
            Côn Đảo, ${dateStr}
        </div>

        <table class="sign-table">
            <tr>
                <td width="33%">${signBlock('TỔ KỸ THUẬT', repair.acceptance_created_by || repair.inspection_created_by, false, showSignature, hideName)}</td>
                <td width="33%">${signBlock('TỔ VHTTBMĐ', repair.approved_by_operator_lead_acceptance, false, showSignature, hideName)}</td>
                <td width="33%">${signBlock('CÁN BỘ ĐỘI', repair.approved_by_manager_acceptance, false, showSignature, hideName)}</td>
            </tr>
            <tr>
                <td colspan="3" style="padding-top: 30px;">
                    <div style="width: 40%; margin: 0 auto;">
                        ${signBlock('BAN GIÁM ĐỐC', repair.approved_by_admin_acceptance, true, showSignature, hideName)}
                    </div>
                </td>
            </tr>
        </table>
        ${footer}
    `;
};


export const buildRepairPdfTemplate = (repair: Repair, type: 'B03' | 'B04' | 'B05' | 'COMBINED', embedFooter: boolean = false, forceShowSignature: boolean = false, hideName: boolean = false, hideDates: boolean = false) => {
    let content = '';
    const showSignature = type === 'COMBINED' || forceShowSignature;

    if (type === 'B03') {
        content = `<div class="page">${generateB03(repair, embedFooter, 1, 1, showSignature, hideName, hideDates)}</div>`;
    } else if (type === 'B04') {
        content = `<div class="page">${generateB04(repair, embedFooter, 1, 1, showSignature, hideName, hideDates)}</div>`;
    } else if (type === 'B05') {
        content = `<div class="page">${generateB05(repair, embedFooter, 1, 1, showSignature, hideName, hideDates)}</div>`;
    } else if (type === 'COMBINED') {
        content = `
            <div class="page">${generateB03(repair, embedFooter, 1, 3, showSignature, hideName, hideDates)}</div>
            <div class="page">${generateB04(repair, embedFooter, 2, 3, showSignature, hideName, hideDates)}</div>
            <div class="page">${generateB05(repair, embedFooter, 3, 3, showSignature, hideName, hideDates)}</div>
        `;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>${styles}</style>
    </head>
    <body style="margin: 0; padding: 0;">
        ${content}
    </body>
    </html>
    `;
};
