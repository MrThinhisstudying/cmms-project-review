
import * as XLSX from 'xlsx';

// MOCK: The exact logic from MaintenanceService (simplified for testing)
function testImportLogic() {
    console.log("--- STARTING DEBUG SIMULATION ---");

    // 1. Create a Mock Workbook causing the issue
    // Column A: 'Code', Value: 46023 (Number) -> Should be "1.1"
    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Code', 'Task', '1M'], // Header
        [46023, 'Test Item 1', 'I'], // Row 1: 46023 (Jan 1, 2026)
        [46054, 'Test Item 2', 'I'], // Row 2: 46054 (Feb 1, 2026)
        ['1.3', 'Test Item 3', 'I']  // Row 3: Text "1.3"
    ];
    // Create sheet, but force detected cells to be Numbers for 46023
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Manually ensure type is 'n' (number) to simulate "General" format in Excel
    const cellA2 = ws['A2']; 
    if (cellA2) { cellA2.t = 'n'; cellA2.v = 46023; delete cellA2.w; } // Delete .w to simulate missing formatted text
    
    const cellA3 = ws['A3'];
    if (cellA3) { cellA3.t = 'n'; cellA3.v = 46054; delete cellA3.w; }

    console.log("Mock Sheet Created. Cell A2 (Code):", ws['A2']);

    // 2. RUN PARSING LOGIC
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:C5');
    
    const getCellText = (r: number, c: number): string => {
        const cellAddress = XLSX.utils.encode_cell({r, c});
        const cell = ws[cellAddress];
        if (!cell) return '';
        // Logic from service: Prefer .w, else .v
        return (cell.w !== undefined ? String(cell.w) : String(cell.v || '')).trim();
    };

    // Assume we found header at row 0
    const colIndexMap: any = { 'CODE': 0, 'TASK': 1, '1M': 2 }; 

    const getVal = (r: number, searchKeys: string[]): string => {
        const normKeys = searchKeys.map(k => k.trim().toUpperCase());
        // Simple mock of column finding
        if (normKeys.includes('CODE')) return getCellText(r, 0);
        return '';
    };

    // Iterate Data Rows
    for (let r = 1; r <= 3; r++) {
        let codeContent = getVal(r, ['Code']);
        console.log(`Row ${r} Raw Code: "${codeContent}"`);

        // --- HEURISTIC FIX START ---
        if (codeContent && /^\d{5}$/.test(codeContent) && parseInt(codeContent) > 30000) {
            console.log(`   -> Detected Serial: ${codeContent}`);
            const serial = parseInt(codeContent);
            const dateInfo = XLSX.SSF.parse_date_code(serial);
            console.log(`   -> Parsed DateInfo:`, dateInfo);
            if (dateInfo) {
                codeContent = `${dateInfo.d}.${dateInfo.m}`;
                console.log(`   -> FIXED CODE: "${codeContent}"`);
            }
        }
        // --- HEURISTIC FIX END ---
        
        console.log(`Row ${r} Final Code: "${codeContent}"`);
    }
}

testImportLogic();
