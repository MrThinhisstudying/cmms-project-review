
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function generateTemplate() {
    const wb = XLSX.utils.book_new();
    
    // Header
    const headers = ['Code', 'Task', 'Type', '1M', '3M', '6M', '1Y'];
    const data = [
        headers,
        // Group Header
        ['3.1', 'Hệ thống động cơ (Engine)', '', '', '', '', ''],
        // Items with "Problematic" Codes (1.1, 1.2) - entered as Text to show how it SHOULD be
        ['3.1.1', 'Kiểm tra dầu nhớt', 'checkbox', 'I', 'I', 'R', 'R'],
        ['3.1.2', 'Kiểm tra dây đai', 'checkbox', 'I', 'I', 'I', 'I'],
        // Sub-row example
        ['', '', 'checkbox', 'C', 'C', '', '']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set Column Widths
    ws['!cols'] = [
        { wch: 10 }, // Code
        { wch: 40 }, // Task
        { wch: 10 }, // Type
        { wch: 5 }, // 1M
        { wch: 5 }, // 3M
        { wch: 5 }, // 6M
        { wch: 5 }, // 1Y
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Checklist Template');

    // Write to artifacts directory
    const outputDir = '/Users/thinhmap665/.gemini/antigravity/brain/8f70c3ff-79a5-4793-9990-06dceee294fe';
    const filePath = path.join(outputDir, 'Mau_Checklist_Chuan_v2.xlsx');
    
    XLSX.writeFile(wb, filePath);
    console.log(`Template generated at: ${filePath}`);
}

generateTemplate();
