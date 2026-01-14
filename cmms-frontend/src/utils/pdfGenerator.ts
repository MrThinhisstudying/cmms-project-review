import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IRepair } from '../types/repairs.types';
import { 
    vntimeFontNormal, 
    vntimeFontBold, 
    vntimeFontItalic, 
    vntimeFontBoldItalic 
} from './vntime';

// Cấu hình mở rộng cho jsPDF Table
interface jsPDFWithAutoTable extends jsPDF {
    lastAutoTable: { finalY: number };
}

// Chuẩn hóa tiếng Việt (NFC) để hiển thị tốt nhất trên PDF
const toUtf8 = (str: string | undefined | null): string => {
    if (!str) return '';
    return str.normalize('NFC');
};

// Đăng ký 4 loại phông chữ vào hệ thống file ảo của jsPDF
const setupDoc = (doc: jsPDF) => {
    const fontName = 'TimesNewRoman';
    try {
        if (vntimeFontNormal) {
            doc.addFileToVFS(`${fontName}-Normal.ttf`, vntimeFontNormal);
            doc.addFont(`${fontName}-Normal.ttf`, fontName, 'normal');
        }
        if (vntimeFontBold) {
            doc.addFileToVFS(`${fontName}-Bold.ttf`, vntimeFontBold);
            doc.addFont(`${fontName}-Bold.ttf`, fontName, 'bold');
        }
        if (vntimeFontItalic) {
            doc.addFileToVFS(`${fontName}-Italic.ttf`, vntimeFontItalic);
            doc.addFont(`${fontName}-Italic.ttf`, fontName, 'italic');
        }
        if (vntimeFontBoldItalic) {
            doc.addFileToVFS(`${fontName}-BoldItalic.ttf`, vntimeFontBoldItalic);
            doc.addFont(`${fontName}-BoldItalic.ttf`, fontName, 'bolditalic');
        }
        doc.setFont(fontName, 'normal');
        return fontName;
    } catch (e) {
        console.error("Lỗi đăng ký phông chữ:", e);
        return 'times';
    }
};

// Hàm hỗ trợ tải ảnh chữ ký từ URL
const loadImage = (url: string): Promise<string | null> => {
    if (!url) return Promise.resolve(null);
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = url;
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (ctx) { ctx.drawImage(img, 0, 0); resolve(canvas.toDataURL("image/png")); }
            else resolve(null);
        };
        img.onerror = () => resolve(null);
    });
};

// Hàm vẽ tiêu đề hành chính 2 cột (Dùng chung cho B03, B04, B05)
const drawAdminHeader = (doc: jsPDF, fontName: string, formCode: string, repairCode: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const xLeft = 55;
    const xRight = 150;

    // Biểu mẫu (Góc trên bên phải)
    doc.setFontSize(10);
    doc.setFont(fontName, "normal");
    const formIdText = `Biểu mẫu: ${formCode}`;
    const formIdWidth = doc.getTextWidth(formIdText);
    doc.text(formIdText, pageWidth - margin, 12, { align: 'right' });
    doc.setLineWidth(0.1);
    doc.line(pageWidth - margin - formIdWidth, 12.5, pageWidth - margin, 12.5);

    // Header 2 cột
    doc.setFontSize(11);
    doc.setFont(fontName, "bold");
    doc.text(toUtf8("CẢNG HÀNG KHÔNG CÔN ĐẢO"), xLeft, 25, { align: 'center' });
    doc.text(toUtf8("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), xRight, 25, { align: 'center' });
    
    doc.text(toUtf8("ĐỘI KỸ THUẬT"), xLeft, 31, { align: 'center' });
    doc.setFont(fontName, "bolditalic");
    doc.setFontSize(12);
    const motto = "Độc lập – Tự do – Hạnh phúc";
    const mottoWidth = doc.getTextWidth(toUtf8(motto));
    doc.text(toUtf8(motto), xRight, 31, { align: 'center' });

    // Các đường kẻ trang trí chuẩn hành chính
    doc.setLineWidth(0.5);
    doc.line(xLeft - 12, 33, xLeft + 12, 33);
    doc.line(xRight - (mottoWidth / 2), 33, xRight + (mottoWidth / 2), 33);

    doc.setFont(fontName, "normal");
    doc.setFontSize(11);
    doc.text(toUtf8(`Số: ${repairCode || '.....'}/PYC-ĐKT`), xLeft, 39, { align: 'center' });

    doc.setFont(fontName, "italic");
    doc.setFontSize(12);
    doc.text(toUtf8(`Côn Đảo, ngày ..... tháng ..... năm 2026`), pageWidth - margin, 46, { align: 'right' });
};

// --- PHIẾU B03: YÊU CẦU SỬA CHỮA ---
const generateB03 = async (doc: jsPDF, repair: IRepair, showSignature: boolean) => {
    const fontName = setupDoc(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    drawAdminHeader(doc, fontName, "B03.QT08/VCS-KT", repair.repair_id ? String(repair.repair_id) : '');

    let y = 65;
    doc.setFont(fontName, "bold");
    doc.setFontSize(14);
    doc.text(toUtf8("PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG - SỬA CHỮA"), pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.text(toUtf8("Lý lịch thiết bị/ :"), pageWidth / 2, y, { align: 'center' });

    y += 12;
    doc.setFont(fontName, "normal");
    const device = repair.device;
    doc.text(toUtf8(`-  Tên thiết bị: ${device?.name || '..........................................................'}`), margin + 5, y); y += 8;
    doc.text(toUtf8(`-  Số đăng ký: ${device?.reg_number || '..........................................................'}`), margin + 5, y); y += 8;
    doc.text(toUtf8(`-  Đơn vị quản lý tài sản: ${repair.created_department?.name || '.......................................'}`), margin + 5, y);

    y += 12;
    doc.setFont(fontName, "bold");
    doc.text(toUtf8("1. Mô tả sự cố hỏng hóc:"), margin, y); y += 8;
    doc.setFont(fontName, "normal");
    const desc = repair.failure_description || '';
    const splitDesc = doc.splitTextToSize(toUtf8(desc), pageWidth - 2 * margin - 10);
    doc.text(splitDesc, margin + 5, y);
    y += Math.max(25, splitDesc.length * 7 + 10);

    doc.setFont(fontName, "bold");
    doc.text(toUtf8("2. Kiến nghị, biện pháp khắc phục:"), margin, y); y += 8;
    doc.setFont(fontName, "normal");
    const rec = repair.recommendation || '';
    const splitRec = doc.splitTextToSize(toUtf8(rec), pageWidth - 2 * margin - 10);
    doc.text(splitRec, margin + 5, y);

    // Chữ ký B03 (3 cột + 1 cột Ban Giám Đốc)
    y = 210;
    const colWidth = (pageWidth - 2 * margin) / 3;
    const users = [repair.created_by, repair.approved_by_manager_request, repair.approved_by_admin_request];
    const sigUrls = await Promise.all(users.map(u => u?.signature_url && showSignature ? loadImage(u.signature_url) : Promise.resolve(null)));

    doc.setFont(fontName, "bold");
    doc.text(toUtf8("TỔ KỸ THUẬT"), margin + colWidth / 2, y, { align: 'center' });
    doc.text(toUtf8("TỔ VHTTBMĐ"), margin + 1.5 * colWidth, y, { align: 'center' });
    doc.text(toUtf8("CÁN BỘ ĐỘI"), margin + 2.5 * colWidth, y, { align: 'center' });

    for (let i = 0; i < 3; i++) {
        const cx = margin + (i === 0 ? 0.5 : i === 1 ? 1.5 : 2.5) * colWidth;
        if (sigUrls[i]) doc.addImage(sigUrls[i]!, 'PNG', cx - 15, y + 5, 30, 20);
        if (users[i]?.name) {
            doc.setFont(fontName, "normal");
            doc.text(toUtf8(users[i]!.name), cx, y + 38, { align: 'center' });
        }
    }
    y += 50;
    doc.setFont(fontName, "bold");
    doc.text(toUtf8("BAN GIÁM ĐỐC"), pageWidth / 2, y, { align: 'center' });
    
    drawFooter(doc, fontName, "B03.QT08/VCS-KT");
};

// --- PHIẾU B04: BIÊN BẢN KIỂM NGHIỆM ---
const generateB04 = async (doc: jsPDF, repair: IRepair, showSignature: boolean) => {
    const fontName = setupDoc(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    drawAdminHeader(doc, fontName, "B04.QT08/VCS-KT", repair.repair_id ? String(repair.repair_id) : '');

    let y = 65;
    doc.setFont(fontName, "bold");
    doc.setFontSize(14);
    doc.text(toUtf8("BIÊN BẢN KIỂM NGHIỆM KỸ THUẬT VÀ ĐỀ NGHỊ VẬT TƯ"), pageWidth / 2, y, { align: 'center' });
    
    y += 12;
    doc.setFont(fontName, "bold");
    doc.text(toUtf8("PHẦN TỔNG QUÁT:"), margin, y); y += 8;
    doc.setFont(fontName, "normal");
    doc.text(toUtf8(`- Tên thiết bị: ${repair.device?.name}`), margin + 5, y); y += 8;
    doc.text(toUtf8(`- Thành phần kiểm nghiệm:`), margin + 5, y); y += 8;
    (repair.inspection_committee || []).forEach((mem, i) => {
        doc.text(toUtf8(`${i+1}. Ông (Bà): ${mem.name} - Chức vụ: ${mem.position}`), margin + 15, y);
        y += 7;
    });

    autoTable(doc, {
        startY: y + 5,
        head: [[toUtf8('Stt'), toUtf8('Mô tả hư hỏng'), toUtf8('Nguyên nhân'), toUtf8('Biện pháp sửa chữa'), toUtf8('Ghi chú')]],
        body: (repair.inspection_items || []).map((item, i) => [i + 1, toUtf8(item.description), toUtf8(item.cause), toUtf8(item.solution), toUtf8(item.notes)]),
        styles: { font: fontName, fontSize: 11 },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        theme: 'grid'
    });

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
    doc.setFont(fontName, "bold");
    doc.text(toUtf8("PHẦN ĐỀ NGHỊ CUNG CẤP VẬT TƯ:"), margin, y);
    
    autoTable(doc, {
        startY: y + 5,
        head: [[toUtf8('Stt'), toUtf8('Tên vật tư, phụ tùng'), toUtf8('Quy cách, mã số'), toUtf8('SL'), toUtf8('Ghi chú')]],
        body: (repair.inspection_materials || []).map((m, i) => [i + 1, toUtf8(m.item_name), toUtf8(m.specifications), m.quantity, toUtf8(m.notes)]),
        styles: { font: fontName, fontSize: 11 },
        theme: 'grid'
    });

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 35;
    const users = [repair.inspection_created_by, repair.approved_by_operator_lead_inspection, repair.approved_by_manager_inspection];
    const sigUrls = await Promise.all(users.map(u => u?.signature_url && showSignature ? loadImage(u.signature_url) : Promise.resolve(null)));
    
    doc.setFont(fontName, "bold");
    const colWidth = (pageWidth - 2 * margin) / 3;
    ["TỔ KỸ THUẬT", "TỔ VHTTBMĐ", "CÁN BỘ ĐỘI"].forEach((t, i) => {
        const cx = margin + (i + 0.5) * colWidth;
        doc.text(toUtf8(t), cx, y, { align: 'center' });
        if (sigUrls[i]) doc.addImage(sigUrls[i]!, 'PNG', cx - 15, y + 5, 30, 20);
        if (users[i]?.name) {
            doc.setFont(fontName, "normal");
            doc.text(toUtf8(users[i]!.name), cx, y + 38, { align: 'center' });
            doc.setFont(fontName, "bold");
        }
    });

    drawFooter(doc, fontName, "B04.QT08/VCS-KT");
};

// --- PHIẾU B05: BIÊN BẢN NGHIỆM THU ---
const generateB05 = async (doc: jsPDF, repair: IRepair, showSignature: boolean) => {
    const fontName = setupDoc(doc);
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;

    drawAdminHeader(doc, fontName, "B05.QT08/VCS-KT", repair.repair_id ? String(repair.repair_id) : '');

    let y = 65;
    doc.setFont(fontName, "bold");
    doc.setFontSize(14);
    doc.text(toUtf8("BIÊN BẢN NGHIỆM THU SỬA CHỮA - BẢO DƯỠNG"), pageWidth / 2, y, { align: 'center' });

    y += 12;
    doc.setFont(fontName, "normal");
    doc.text(toUtf8(`Căn cứ: Theo nội dung yêu cầu sửa chữa ${repair.repair_id}`), margin, y); y += 10;
    
    // Bảng vật tư 3 nhóm (Thay thế - Thu hồi - Hủy)
    const replacements = repair.inspection_materials || [];
    const recovered = repair.recovered_materials || [];
    const scrap = repair.materials_to_scrap || [];
    const maxLen = Math.max(replacements.length, recovered.length, scrap.length, 1);
    
    const body = [];
    for (let i = 0; i < maxLen; i++) {
        body.push([
            i + 1,
            toUtf8(replacements[i]?.item_name || ''), replacements[i]?.quantity || '',
            toUtf8(recovered[i]?.name || ''), recovered[i]?.quantity || '',
            toUtf8(scrap[i]?.name || ''), scrap[i]?.quantity || ''
        ]);
    }

    autoTable(doc, {
        startY: y,
        head: [
            [{ content: toUtf8('Stt'), rowSpan: 2 }, { content: toUtf8('Vật tư thay thế'), colSpan: 2 }, { content: toUtf8('Vật tư thu hồi'), colSpan: 2 }, { content: toUtf8('Vật tư xin hủy'), colSpan: 2 }],
            [toUtf8('Tên vật tư'), toUtf8('SL'), toUtf8('Tên vật tư'), toUtf8('SL'), toUtf8('Tên vật tư'), toUtf8('SL')]
        ],
        body: body,
        styles: { font: fontName, fontSize: 10, halign: 'center' },
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        theme: 'grid'
    });

    y = (doc as jsPDFWithAutoTable).lastAutoTable.finalY + 15;
    doc.setFont(fontName, "bold");
    doc.text(toUtf8("KẾT LUẬN:"), margin, y);
    doc.setFont(fontName, "normal");
    doc.text(toUtf8("Sau khi tiến hành sửa chữa, xe hoạt động ổn định và an toàn."), margin + 25, y);

    y += 40;
    const users = [repair.acceptance_created_by, repair.approved_by_operator_lead_acceptance, repair.approved_by_manager_acceptance, repair.approved_by_admin_acceptance];
    const sigUrls = await Promise.all(users.map(u => u?.signature_url && showSignature ? loadImage(u.signature_url) : Promise.resolve(null)));

    const colWidth = (pageWidth - 2 * margin) / 3;
    ["TỔ KỸ THUẬT", "TỔ VHTTBMĐ", "CÁN BỘ ĐỘI"].forEach((t, i) => {
        const cx = margin + (i + 0.5) * colWidth;
        doc.setFont(fontName, "bold");
        doc.text(toUtf8(t), cx, y, { align: 'center' });
        if (sigUrls[i]) doc.addImage(sigUrls[i]!, 'PNG', cx - 15, y + 5, 30, 20);
        if (users[i]?.name) {
            doc.setFont(fontName, "normal");
            doc.text(toUtf8(users[i]!.name), cx, y + 38, { align: 'center' });
        }
    });

    drawFooter(doc, fontName, "B05.QT08/VCS-KT");
};

// Hàm vẽ Footer chuẩn mẫu (Đường kẻ ngang + Mã biểu mẫu + Số trang)
const drawFooter = (doc: jsPDF, fontName: string, formCode: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const footerY = pageHeight - 10;

    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    doc.setFont(fontName, "normal");
    doc.setFontSize(10);
    doc.text(formCode, margin, footerY);
    doc.text(toUtf8("Lần ban hành/sửa đổi: 01/00"), pageWidth / 2, footerY, { align: 'center' });
    doc.text(`${(doc.internal as any).getCurrentPageInfo().pageNumber}/1`, pageWidth - margin, footerY, { align: 'right' });
};

// HÀM CHÍNH ĐỂ GỌI XUẤT PDF
export const generateRepairPDF = async (repair: IRepair, type: 'consolidated' | 'B03' | 'B04' | 'B05') => {
    console.warn("DEPRECATED: Frontend PDF generation is being replaced by Backend-driven generation.");
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    const fontName = setupDoc(doc);
    
    if (type === 'consolidated') {
        await generateB03(doc, repair, true);
        doc.addPage(); doc.setFont(fontName);
        await generateB04(doc, repair, true);
        doc.addPage(); doc.setFont(fontName);
        await generateB05(doc, repair, true);
    } else {
        const showSig = true; // Luôn hiện chữ ký khi đã hoàn thành
        if (type === 'B03') await generateB03(doc, repair, showSig);
        if (type === 'B04') await generateB04(doc, repair, showSig);
        if (type === 'B05') await generateB05(doc, repair, showSig);
    }

    const blob = doc.output('bloburl');
    window.open(blob, '_blank');
};