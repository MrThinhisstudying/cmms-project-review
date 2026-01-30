import {MaintenanceTicket} from '../entities/maintenance-ticket.entity';
import dayjs from 'dayjs';

export const buildPdfTemplate = (ticket: MaintenanceTicket, exportType: 'full' | 'ticket' | 'content' = 'full') => {
    const formatDate = (d: any) => (d ? dayjs(d).format('DD/MM/YYYY') : '.../.../......');
    const dateObj = ticket.execution_date ? dayjs(ticket.execution_date) : dayjs();
    const day = dateObj.format('DD');
    const month = dateObj.format('MM');
    const year = dateObj.format('YYYY');

    // --- MAPPING CẤP ĐỘ ---
    const levelMap: Record<string, string> = {
        '1M': '01 Tháng',
        '3M': '03 Tháng',
        '6M': '06 Tháng',
        '9M': '09 Tháng',
        '1Y': '01 Năm',
        '2Y': '02 Năm',
    };
    const displayLevel = levelMap[ticket.maintenance_level] || ticket.maintenance_level;

    // Ký tự đặc biệt
    const tickSymbol = '<span style="font-family: DejaVu Sans, sans-serif; font-size: 13px; font-weight: bold; color: black;">✓</span>';
    const checkedBox = '<span style="font-family: DejaVu Sans, sans-serif; font-size: 14px;">☑</span>';
    const unCheckedBox = '<span style="font-family: DejaVu Sans, sans-serif; font-size: 14px;">☐</span>';

    const renderOk = (status: string) => '';
    const renderNg = (status: string) => '';

    // Hàm làm sạch văn bản
    const cleanText = (text: any) => {
        if (text === null || text === undefined) return '';
        const s = String(text).trim();
        if (s === '-') return '';
        return s.replace(/-/g, ' ');
    };

    // --- LOGIC 1: LẤY MÃ YÊU CẦU (Cột Trái) ---
    const getReqChar = (item: any, colLevel: string) => {
        let reqChar: any = '';
        if (item.requirements && item.requirements[colLevel]) reqChar = item.requirements[colLevel];
        else if (item.req && ticket.maintenance_level === colLevel) reqChar = item.req;
        return cleanText(reqChar);
    };

    // --- LOGIC 2: LẤY KẾT QUẢ (Cột Phải) ---
    const getResultMark = (item: any, colLevel: string) => {
        const isCurrentLevel = ticket.maintenance_level === colLevel;
        if (isCurrentLevel) {
            if (item.type === 'input_number' && item.value) return `<b>${cleanText(item.value)}</b>`;
            if (item.status === 'pass') return ''; // Removed tickSymbol
            if (item.status === 'fail') return ''; // Removed fail mark
        }
        return '';
    };

    // --- LOGIC GOM NHÓM & TẠO HTML BẢNG CHECKLIST ---
    let checklistHtml = '';
    if (Array.isArray(ticket.checklist_result) && ticket.checklist_result.length > 0) {
        const grouped: Record<string, any[]> = {};
        ticket.checklist_result.forEach((item: any) => {
            const cat = item.category || 'KHÁC';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        // Check if current level is Weekly
        const isWeeklyLevel = ['Tuần', 'Weekly', 'Week'].includes(ticket.maintenance_level);

        let categoryIndex = 1;
        for (const [categoryName, items] of Object.entries(grouped)) {
            // FILTER: Ẩn mục "Bảo dưỡng tuần" nếu đang ở cấp độ Tháng/Năm (theo yêu cầu user)
            if (!isWeeklyLevel && (categoryName.toUpperCase().includes('TUẦN') || categoryName.toUpperCase().includes('WEEKLY'))) {
                continue;
            }

            checklistHtml += `
                <tr>
                    <td class="text-center bold" style="padding: 3px;">${categoryIndex}</td>
                    <td colspan="9" class="bold uppercase" style="text-align: left; padding: 3px 5px;">${cleanText(categoryName)}</td>
                </tr>
            `;
            items.forEach((item: any, idx: number) => {
                const stt = `${categoryIndex}.${idx + 1}`;
                checklistHtml += `
                    <tr>
                        <td class="text-center" style="padding: 3px;">${stt}</td>
                        <td style="padding-left: 5px; padding-right: 2px;">
                            ${cleanText(item.task)}
                            ${item.type === 'input_number' ? '<br><i>(Đo thông số/Measure)</i>' : ''}
                            ${item.note ? `<br><i>Ghi chú: ${cleanText(item.note)}</i>` : ''}
                        </td>
                        <td class="text-center">${getReqChar(item, '1M')}</td><td class="text-center">${getResultMark(item, '1M')}</td>
                        <td class="text-center">${getReqChar(item, '6M')}</td><td class="text-center">${getResultMark(item, '6M')}</td>
                        <td class="text-center">${getReqChar(item, '1Y')}</td><td class="text-center">${getResultMark(item, '1Y')}</td>
                        <td class="text-center">${getReqChar(item, '2Y')}</td><td class="text-center">${getResultMark(item, '2Y')}</td>
                    </tr>
                `;
            });
            categoryIndex++;
        }
    } else {
        checklistHtml = '<tr><td colspan="10" class="text-center italic">Không có dữ liệu checklist</td></tr>';
    }

    // --- PHẦN CHÚ THÍCH MỚI THÊM ---
    const notesHtml = `
    <div style="margin-top: 15px; font-size: 10pt; page-break-inside: avoid;">
        <div><strong><u>Chú thích/ Note:</u></strong></div>
        <div style="margin-left: 10px; margin-top: 5px;">
            <div>- <b>I</b> (Inspection): Kiểm tra nếu phát hiện hư hỏng thì sửa chữa hoặc thay thế (repair or replace if found damage)</div>
            <div>- <b>I*</b> (Release for inspection): Tháo, kiểm tra nếu phát hiện hư hỏng thì sửa chữa hoặc thay thế (repair or replace if found damaged)</div>
            <div>- <b>T</b> (Tighten): Siết chặt</div>
            <div>- <b>D</b> (Drain): Xả cặn</div>
            <div>- <b>R</b> (Replace): Thay mới</div>
            <div>- <b>A</b> (Adjust): Kiểm tra, hiệu chỉnh theo thông số</div>
            <div>- <b>L</b> (Lubrication): Kiểm tra, bôi trơn hoặc bơm mỡ</div>
            <div>- <b>C</b> (Clean): Kiểm tra, làm sạch nếu phát hiện hư hỏng thì sửa chữa hoặc thay thế</div>
        </div>
        
        <div style="margin-top: 8px;"><strong>• Ghi nhận kết quả kiểm tra (Recording checked results):</strong></div>
        <div style="margin-left: 10px; margin-top: 5px;">
            <div>- <b>M</b> (Measure): Đo hoặc kiểm tra thông số và ghi kết quả kiểm tra (Measuring and recording into the form).</div>
            <div>- Các hạng mục khác (other items): Đánh đấu ${tickSymbol} nếu đạt (Mark “${tickSymbol}” if the Item has been checked)</div>
            <div>- Tất cả các thông số kiểm tra sau hiệu chỉnh do kiểm tra không đạt sẽ ghi vào phần ghi chú (all checked parameter after adjustment will be recorded into NOTE section).</div>
            <div>- Ghi <b>NA</b> (Không thực hiện/ Not applicable) nếu kiểm tra nhận thấy tình trạng hoạt động tốt/ Not applicable if the item in good operation.</div>
        </div>

        <div style="margin-top: 15px;">
            <strong>Ghi chú/ Remark:</strong> ........................................................................................................................................................................
        </div>
    </div>
    `;

    // --- PART 1: WORK TICKET (Phiếu công tác) ---
    const workTicketHtml = `
        <div class="text-center" style="margin-bottom: 10px;">
            <div style="font-size: 14pt; font-weight: bold; margin-bottom: 2px;">PHIẾU CÔNG TÁC BẢO DƯỠNG</div>
            <div style="font-size: 12pt; font-weight: bold;">MAINTENANCE CHECKLIST</div>
        </div>

        <div class="section-title">1. TRANG THIẾT BỊ BẢO DƯỠNG / EQUIPMENT:</div>
        <table class="no-border" style="margin-left: 10px; font-size: 10.5pt;">
            <tr>
                <td colspan="2">1.1. Chủng loại / Type: ${ticket.device?.name || ''}</td>
            </tr>
            <tr>
                <td width="60%">1.2. Số đăng ký / Registration No.: ${ticket.device?.reg_number || ticket.device?.serial_number || ''}</td>
                <td width="40%">Số GHĐ / Working hours: ${ticket.working_hours ? ticket.working_hours.toLocaleString() : '............'}</td>
            </tr>
            <tr>
                <td>1.3. Phiếu công tác số / Checklist No:...............</td>
                <td>Ngày / Date: ${formatDate(ticket.execution_date)}</td>
            </tr>
            <tr>
                <td colspan="2">1.4. Cấp bảo dưỡng TTB / Maintenance level: ${displayLevel}</td>
            </tr>
        </table>

        <div class="section-title">2. NGƯỜI THỰC HIỆN / CHECKED BY:</div>
        <div style="margin-left: 20px; margin-bottom: 5px; font-size: 10.5pt;">
            ${
                Array.isArray(ticket.execution_team) && ticket.execution_team.length > 0
                    ? ticket.execution_team
                          .map(
                              (p: any, index: number) =>
                                  `<div>2.${index + 1}. ${
                                      p.name
                                  } ........................................... Ngày nhận công việc: ${formatDate(p.date)}</div>`,
                          )
                          .join('')
                    : '<div>(Chưa cập nhật)</div>'
            }
        </div>

        <div class="section-title">3. NỘI DUNG BẢO DƯỠNG (ĐÍNH KÈM) / MAINTENANCE TASKS:</div>

        <div class="section-title">4. PHÁT SINH KHÁC / ARISING PROBLEM:</div>
        <table class="compact-td">
            <thead>
                <tr><th width="10%">STT</th><th width="60%">Nội dung phát sinh / Content</th><th width="30%">Ghi chú / Remark</th></tr>
            </thead>
            <tbody>
                ${
                    ticket.arising_issues
                        ? `<tr><td class="text-center">1</td><td>${cleanText(ticket.arising_issues)}</td><td></td></tr>`
                        : `
                            <tr><td class="text-center" style="height: 20px;"></td><td></td><td></td></tr>
                            <tr><td class="text-center" style="height: 20px;"></td><td></td><td></td></tr>
                          `
                }
            </tbody>
        </table>

        <div class="section-title">5. NGHIỆM THU / CHECK AND TAKE OVER:</div>
        
     <div style="margin-bottom: 5px;">
            <strong>5.1. Người thực hiện / Checked by (Ký/ Signature): </strong> 
        </div>

        <table style="width: 100%; border: none; margin-bottom: 10px;">
            <tr>
                <td style="border: none; width: 33%; text-align: center; vertical-align: bottom; padding: 0 5px;">
                    <div class="sign-space"></div> <div class="bold">${ticket.execution_team?.[0]?.name || ''}</div>
                </td>
                <td style="border: none; width: 33%; text-align: center; vertical-align: bottom; padding: 0 5px;">
                    <div class="sign-space"></div> <div class="bold">${ticket.execution_team?.[1]?.name || ''}</div>
                </td>
                <td style="border: none; width: 33%; text-align: center; vertical-align: bottom; padding: 0 5px;">
                    <div class="sign-space"></div> <div class="bold">${ticket.execution_team?.[2]?.name || ''}</div>
                </td>
            </tr>
        </table>

        <div style="margin-bottom: 3px;">
            <strong>5.2. Xác nhận của đơn vị sử dụng / Approved by using unit:</strong>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; border: 1px solid black; font-size: 10.5pt; table-layout: fixed;">
            <thead>
                <tr style="background-color: #ffffff;">
                    <th style="width: 6%; border: 1px solid black; text-align: center; font-weight: bold;">STT/ No.</th>
                    <th style="border: 1px solid black; text-align: center; font-weight: bold;">Nội dung/ Content</th>
                    <th style="width: 8%; border: 1px solid black; text-align: center; font-weight: bold;">Đạt/ OK</th>
                    <th style="width: 10%; border: 1px solid black; text-align: center; font-weight: bold;">Không đạt/ Not good</th>
                    <th style="width: 20%; border: 1px solid black; text-align: center; font-weight: bold;">Ghi chú/ Note</th>
                </tr>
            </thead>
            <tbody>
                ${
                    Array.isArray(ticket.acceptance_result) && ticket.acceptance_result.length > 0
                        ? ticket.acceptance_result
                              .map((acc: any, idx: number) => {
                                  const idStr = String(acc.id);
                                  const isSubItem = idStr.includes('.') || !Number.isInteger(Number(idStr));
                                  
                                  const sttDisplay = isSubItem ? '' : `${idStr}.`;
                                  
                                  const cleanContent = cleanText(acc.item).replace(/^[0-9.-]+\s*/, '');
                                  const contentDisplay = isSubItem 
                                      ? `<div style="padding-left: 20px;">○ ${cleanContent.replace(/^[-\s]+/, '')}</div>`
                                      : `${cleanContent}`;

                                  const okMark = ''; 
                                  const ngMark = '';

                                  return `
                        <tr>
                            <td style="border: 1px solid black; text-align: center; vertical-align: top; padding: 5px;">${sttDisplay}</td>
                            <td style="border: 1px solid black; padding: 5px; vertical-align: top; text-align: left;">
                                ${contentDisplay}
                            </td>
                            <td style="border: 1px solid black; text-align: center; vertical-align: middle;">${okMark}</td>
                            <td style="border: 1px solid black; text-align: center; vertical-align: middle;">${ngMark}</td>
                            <td style="border: 1px solid black; padding: 5px; vertical-align: middle;">${cleanText(acc.note)}</td>
                        </tr>`;
                              })
                              .join('')
                        : '<tr><td colspan="5" style="border: 1px solid black;"></td></tr>'
                }
                <tr>
                    <td colspan="5" style="border: 1px solid black; padding: 8px 10px;">
                        <div style="display: flex; align-items: flex-start;">
                            <div style="font-weight: bold; width: 160px;">Kết luận: <br><i>Conclusion:</i></div>
                            <div style="flex: 1; display: flex; justify-content: space-around;">
                                <div style="display: flex; align-items: center;">
                                    <span style="font-weight: bold; margin-right: 5px;">- Đạt YCKT, đưa TTB vào khai thác</span>
                                    ${unCheckedBox}
                                </div>
                                <div style="display: flex; align-items: center;">
                                    <span style="font-weight: bold; margin-right: 5px;">- Không đạt</span>
                                    ${unCheckedBox}
                                </div>
                            </div>
                        </div>
                         <div style="display: flex; align-items: flex-start; margin-left: 160px; margin-top: -15px;">
                             <div style="flex: 1; display: flex; justify-content: space-around;">
                                 <div style="font-style: italic; font-size: 10pt; width: 250px;">- Equipment is ready for operation</div>
                                 <div style="font-style: italic; font-size: 10pt;">- Not good</div>
                             </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <table class="sign-table" style="margin-top: 20px;">
            <tr><td width="50%"></td><td width="50%" class="italic">Côn Đảo, ngày ${day} tháng ${month} năm ${year}</td></tr>
            <tr>
                <td>
                    <div class="bold">ĐỘI-KT / DIVISION/TEAM</div>
                    <div class="italic">(ký tên/ signature)</div>
                    <div class="sign-space"></div>
                    <div class="bold">${ticket.leader_user?.name || ''}</div>
                </td>
                <td>
                    <div class="bold">TỔ VHTTBMĐ / GSE OP. TEAM</div>
                    <div class="italic">(ký tên/ signature)</div>
                    <div class="sign-space"></div>
                    <div class="bold">${ticket.operator_user?.name || ''}</div>
                </td>
            </tr>
        </table>`;

    // --- PART 2: MAINTENANCE CONTENT (Nội dung) ---
    const maintenanceContentHtml = `
            <table style="width: 100%;">
            ${
                ['Tuần', 'Weekly', 'Week'].includes(ticket.maintenance_level)
                    ? `
                <col style="width: 5%"> <col style="width: 65%"> <col style="width: 15%"> <col style="width: 15%">
                <thead>
                    <tr class="bg-header">
                        <th>STT<br>No.</th>
                        <th>NỘI DUNG BẢO DƯỠNG<br>MAINTENANCE TASKS</th>
                        <th colspan="2">WEEKLY MAINTENANCE</th>
                    </tr>
                </thead>
                <tbody>
                    ${(() => {
                        let html = '';
                        if (Array.isArray(ticket.checklist_result) && ticket.checklist_result.length > 0) {
                            // 1. Flatten and Filter: Collect all valid Weekly items across all categories
                            const allWeeklyItems: any[] = [];
                            ticket.checklist_result.forEach((item: any) => {
                                 const reqChar = getReqChar(item, ticket.maintenance_level) || getReqChar(item, 'Tuần') || getReqChar(item, 'Weekly');
                                 if (reqChar) {
                                     allWeeklyItems.push(item);
                                 }
                            });

                            // 2. Render flat list with continuous numbering
                            if (allWeeklyItems.length > 0) {
                                allWeeklyItems.forEach((item: any, idx: number) => {
                                    const stt = idx + 1; // Continuous numbering: 1, 2, 3...
                                    const reqChar = getReqChar(item, ticket.maintenance_level) || getReqChar(item, 'Tuần') || getReqChar(item, 'Weekly');
                                    
                                    html += `
                                        <tr>
                                            <td class="text-center" style="padding: 3px;">${stt}</td>
                                            <td style="padding-left: 5px; padding-right: 2px;">
                                                ${cleanText(item.task)}
                                                ${item.type === 'input_number' ? '<br><i>(Đo thông số/Measure)</i>' : ''}
                                                ${item.note ? `<br><i>Ghi chú: ${cleanText(item.note)}</i>` : ''}
                                            </td>
                                            <td class="text-center">${reqChar}</td>
                                            <td class="text-center"></td>
                                        </tr>
                                    `;
                                });
                            } else {
                                html = '<tr><td colspan="4" class="text-center italic">Không có dữ liệu checklist tuần</td></tr>';
                            }
                        } else {
                             html = '<tr><td colspan="4" class="text-center italic">Không có dữ liệu checklist</td></tr>';
                        }
                        return html;
                    })()}
                </tbody>
                `
                    : `
                <col style="width: 5%">  <col style="width: 35%"> <col style="width: 7.5%"><col style="width: 7.5%"> <col style="width: 7.5%"><col style="width: 7.5%"> <col style="width: 7.5%"><col style="width: 7.5%"> <col style="width: 7.5%"><col style="width: 7.5%"> 
                <thead>
                    <tr class="bg-header">
                        <th rowspan="2">STT<br>No.</th>
                        <th rowspan="2">NỘI DUNG BẢO DƯỠNG<br>MAINTENANCE TASKS</th>
                        <th colspan="8" style="padding: 5px;">CHU KỲ BẢO DƯỠNG ĐỊNH KỲ / PERIODIC MAINTENANCE CYCLE</th>
                    </tr>
                    
                    <tr class="bg-header">
                        <th colspan="2">1T/250G<br>1M/250G</th>
                        <th colspan="2">6T/500G<br>6M/500G</th>
                        <th colspan="2">1Y/1000G<br>1Y/1000H</th>
                        <th colspan="2">2Y/2000H<br>2Y/2000H</th>
                    </tr>
                </thead>
                <tbody>${checklistHtml}</tbody>
                `
            }
        </table>
        ${notesHtml}
    `;

    // --- BUILD BODY BASED ON EXPORT TYPE ---
    let bodyContent = '';
    if (exportType === 'ticket') {
        bodyContent = workTicketHtml;
    } else if (exportType === 'content') {
        bodyContent = maintenanceContentHtml;
    } else {
        // Full (Default)
        bodyContent = workTicketHtml + '<div class="page-break"></div>' + maintenanceContentHtml;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            /* --- STYLE COMPACT ĐỂ VỪA 1 TRANG --- */
            @page { margin: 1cm 1.5cm 1cm 2cm; } /* Lề nhỏ hơn */
            
            body { 
                font-family: 'Times New Roman', serif; 
                font-size: 10.5pt; /* Cỡ chữ nhỏ hơn (10.5pt) */
                line-height: 1.2;
                color: #000;
            }
            .page-break { page-break-before: always; }
            
            /* Bảng biểu */
            table { width: 100%; border-collapse: collapse; margin-bottom: 5px; table-layout: fixed; }
            th, td { border: 1px solid black; vertical-align: middle; word-wrap: break-word; overflow-wrap: break-word; }
            
            /* Padding nhỏ cho bảng */
            .compact-td td, .compact-td th { padding: 3px 4px; }

            .bg-header { text-align: center; font-weight: bold; }
            .no-border, .no-border td { border: none !important; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .italic { font-style: italic; }
            .uppercase { text-transform: uppercase; }
            
            /* Khoảng cách tiêu đề nhỏ hơn */
            .section-title { 
                font-weight: bold; 
                text-transform: uppercase; 
                margin-top: 10px; 
                margin-bottom: 3px; 
                font-size: 10.5pt;
            }
            
            .sign-table td { border: none; text-align: center; vertical-align: top; }
            .sign-space { height: 60px; } /* Khoảng ký tên nhỏ hơn */
        </style>
    </head>
    <body>
        ${bodyContent}
    </body>
    </html>
    `;
};
