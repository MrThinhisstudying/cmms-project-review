import { Repair } from '../entities/repair.entity';
import dayjs from 'dayjs';

export const buildRepairPdfTemplate = (repair: Repair, type: 'B03' | 'B04' | 'B05') => {
    const formatDate = (d: any) => (d ? dayjs(d).format('DD/MM/YYYY') : '.../.../......');
    
    // Choose date based on type
    const dateSource = type === 'B05' ? repair.acceptance_created_at : 
                       type === 'B04' ? repair.inspection_created_at : 
                       repair.created_at;

    const dateObj = dateSource ? dayjs(dateSource) : dayjs();
    const day = dateObj.format('DD'); // Used for '...' placeholders usually
    const month = dateObj.format('MM');
    const year = dateObj.format('YYYY');
    const fullYear = '2026'; // Hardcoded in sample image as 2026, but let's use dynamic year

    // --- MAPPING Helpers ---
    const cleanText = (text: any) => {
        if (text === null || text === undefined) return '';
        return String(text).trim();
    };

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

    // --- STYLES ---
    // Matches Times New Roman, specific font sizes (13-14pt standard, 12pt for details)
    // --- STYLES ---
    const styles = `
        @page { 
            size: A4; 
            margin: 2cm 2cm 2cm 2cm; /* Symmetric Margins */
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
        
        /* Layout Specifics */
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
        
        .indent-level-1 { margin-left: 20px; } /* Tab like indentation */
        
        /* Signature Section */
        .sign-table { margin-top: 40px; page-break-inside: avoid; }
        .sign-table td { text-align: center; vertical-align: top; padding: 0; }
        .sign-title { font-weight: bold; font-size: 13pt; margin-bottom: 80px; } 
        .director-sign-space { margin-bottom: 120px; } /* Extra space for Director */

        /* Footer */
        .footer { 
            position: fixed; 
            bottom: 0; 
            left: 0;
            right: 0;
            width: 100%; 
            font-size: 10pt; 
            padding-top: 5px;
            background: white; /* Ensure no transparent overlay issues */
        }
        .footer-table td { font-size: 10pt; vertical-align: bottom; border: none; padding: 2px 0; }
        
        /* Borders for B04/B05 tables */
        .bordered-table { width: 100%; border-collapse: collapse; table-layout: auto; }
        .bordered-table th, .bordered-table td { border: 1px solid black; padding: 8px 5px; vertical-align: middle; }
        .bordered-table th { font-weight: normal; text-align: center; }
    `;

    // --- HEADER CONTENT ---
    const header = `
        <div class="form-code italic">Biểu mẫu: ${type}.QT08/VCS-KT</div>
        <table class="header-table">
            <tr>
                <td width="35%" class="text-center">
                    <div class="bold uppercase">CẢNG HÀNG KHÔNG<br>CÔN ĐẢO</div>
                    <div class="bold uppercase underline">ĐỘI KỸ THUẬT</div>
                    <div class="italic" style="margin-top: 5px;">Số: ...../${type === 'B03' ? 'PYC' : type === 'B04' ? 'BBKN' : 'BBNT'}-ĐKT</div>
                </td>
                <td width="65%" class="text-center">
                    <div class="bold uppercase" style="white-space: nowrap;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="bold underline">Độc lập – Tự do – Hạnh phúc</div>
                    <div class="italic text-right" style="margin-top: 15px; margin-right: 0;">
                        Côn Đảo, ngày .... tháng .... năm ${year}
                    </div>
                </td>
            </tr>
        </table>
    `;

    // --- CONTENT GENERATION ---
    let content = '';

    // Helper for signature block
    const signBlock = (title: string, name?: string, isDirector: boolean = false) => `
        <div class="sign-title ${isDirector ? 'director-sign-space' : ''}">${title}</div>
        <div class="bold" style="white-space: nowrap;">${cleanText(name)}</div>
    `;

    if (type === 'B03') {
        const formTitle = "PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG – SỬA CHỮA";
        
        content = `
            <div class="title uppercase">${formTitle}</div>
            
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
                Côn Đảo, ngày .... tháng .... năm ....
                <!-- Blank date for handwriting as per request often -->
            </div>

            <table class="sign-table">
                <tr>
                    <td width="33%">${signBlock('TỔ KỸ THUẬT', repair.approved_by_tech_request?.name)}</td>
                    <td width="33%">${signBlock('TỔ VHTTBMĐ', repair.created_by?.name)}</td>
                    <td width="33%">${signBlock('CÁN BỘ ĐỘI', repair.approved_by_manager_request?.name)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding-top: 60px;">
                         <!-- Centered Director Signature with extra top spacing -->
                        <div style="width: 40%; margin: 0 auto;">
                            ${signBlock('BAN GIÁM ĐỐC', repair.approved_by_admin_request?.name || repair.approved_by_manager_request?.name, true)}
                        </div>
                    </td>
                </tr>
            </table>

            
            
        `;
    } 
    else if (type === 'B04') {
        const formTitle = "BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT VÀ ĐỀ NGHỊ VẬT TƯ SỬA CHỮA";
        
        // --- Table 1: Inspection Items ---
        const itemsRows = repair.inspection_items?.map((item, idx) => `
            <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${cleanText(item.description)}</td>
                <td>${cleanText(item.cause)}</td>
                <td>${cleanText(item.solution)}</td>
                <td></td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center italic">Không có dữ liệu</td></tr>';

        // --- Table 2: Materials ---
        const materialRows = repair.inspection_materials?.map((mat: any, idx) => `
            <tr>
                <td class="text-center">${idx + 1}</td>
                <td>${cleanText(mat.item_name)}</td>
                <td>${cleanText(mat.item_code || mat.specifications)}</td>
                <td class="text-center">${mat.quantity} ${cleanText(mat.unit)}</td>
                <td>${cleanText(mat.notes)}</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center italic">Không có phát sinh vật tư</td></tr>';

        content = `
            <div class="title uppercase" style="white-space: nowrap;">${formTitle}</div>
            
            <div class="section-title"><div class="bold">I. PHẦN TỔNG QUÁT:</div></div>
            
            <div class="subsection-title"><div class="bold">1. Lý lịch thiết bị:</div></div>
            <div class="content-indent">
                <div class="list-item">- Tên thiết bị: ${cleanText(repair.device?.name)}</div>
                <div class="list-item">- Số đăng ký: ${cleanText(repair.device?.reg_number)}</div>
                <div class="list-item">- Đơn vị quản lý: Đội kỹ thuật.</div>
                <div class="list-item">- Số giờ/km hoạt động: .....................................................................</div>
            </div>

            <div class="subsection-title" style="margin-top: 15px;"><div class="bold">2. Thành phần kiểm nghiệm:</div></div>
            <table class="" style="margin-left: 40px; width: auto;">
                ${repair.inspection_committee?.map((u, idx) => `
                    <tr>
                        <td style="padding-right: 15px; text-align: left;">${idx + 1}. Ông: ${u.name}</td>
                        <td style="text-align: left;">Chức vụ: ${getCommitteeTitle(u.role)}</td>
                    </tr>
                `).join('') || '<tr><td>(Chưa cập nhật thành phần)</td></tr>'}
            </table>

            <div class="subsection-title" style="margin-top: 15px;"><div class="bold">3. Thời gian nghiệm thu: .....................................................................</div></div>

            <div class="section-title"><div class="bold">II. NỘI DUNG KIỂM NGHIỆM:</div></div>
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

            <div class="section-title" style="margin-top: 25px;"><div class="bold">III. PHẦN ĐỀ NGHỊ CUNG CẤP VẬT TƯ</div></div>
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

            <div class="section-title" style="margin-top: 25px;"><div class="bold">IV. CÁC Ý KIẾN KHÁC (nếu có):</div></div>
            <div class="content-indent" style="margin-top: 5px; min-height: 40px;">
                ${cleanText(repair.inspection_other_opinions)}
            </div>

            <div class="text-right italic" style="margin-top: 40px; margin-right: 20px;">
                Côn Đảo, ngày .... tháng .... năm ....
            </div>

            <table class="sign-table">
                <tr>
                    <td width="33%">${signBlock('TỔ KỸ THUẬT', repair.inspection_created_by?.name)}</td>
                    <td width="33%">${signBlock('TỔ VHTTBMĐ', repair.approved_by_operator_lead_inspection?.name)}</td>
                    <td width="33%">${signBlock('CÁN BỘ ĐỘI', repair.approved_by_manager_inspection?.name)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding-top: 80px;">${signBlock('BAN GIÁM ĐỐC', repair.approved_by_admin_inspection?.name || repair.approved_by_manager_inspection?.name)}</td>
                </tr>
            </table>
        `;
    }
    else if (type === 'B05') {
          const title = "BIÊN BẢN NGHIỆM THU SỬA CHỮA - BẢO DƯỠNG";
          
          // Helper to group materials by name for unified row display
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

          content = `
            <div class="title uppercase" style="margin-bottom: 5px;">${title}</div>
            
            <div class="text-left italic" style="margin-bottom: 20px;">
                Căn cứ: Theo nội dung yêu cầu sửa chữa ....................................
            </div>

            <div class="section-label">I. PHẦN TỔNG QUÁT:</div>
            
            <div class="bold" style="margin-top: 5px;">1. Lý lịch thiết bị:</div>
            <div class="indent-level-1">
                <div style="margin-bottom: 5px;">- Tên thiết bị: ${cleanText(repair.device?.name)}</div>
                <div style="margin-bottom: 5px;">- Biển số đăng ký: ${cleanText(repair.device?.reg_number)}</div>
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

            <div class="bold" style="margin-top: 5px;">3. Thời gian nghiệm thu: ................................................................</div>


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
                Côn Đảo, ngày .... tháng .... năm ${year}
            </div>

            <table class="sign-table">
                <tr>
                    <td width="33%">${signBlock('TỔ KỸ THUẬT', repair.acceptance_created_by?.name || repair.inspection_created_by?.name)}</td>
                    <td width="33%">${signBlock('TỔ VHTTBMĐ', repair.approved_by_operator_lead_acceptance?.name)}</td>
                    <td width="33%">${signBlock('CÁN BỘ ĐỘI', repair.approved_by_manager_acceptance?.name)}</td>
                </tr>
                <tr>
                    <td colspan="3" style="padding-top: 60px;">
                        <div style="width: 40%; margin: 0 auto;">
                            ${signBlock('BAN GIÁM ĐỐC', repair.approved_by_admin_acceptance?.name, true)}
                        </div>
                    </td>
                </tr>
            </table>

           
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
        <div class="page">
            ${header}
            ${content}
        </div>
    </body>
    </html>
    `;
};
