import React, { useState, useRef } from "react";
import {
  Space,
  Card,
  Button,
  Select,
  message,
  Typography,
  Slider,
  Tooltip,
} from "antd";
import { 
    FilePdfOutlined, 
    SearchOutlined, 
    ZoomInOutlined, 
    ZoomOutOutlined 
} from "@ant-design/icons";
import { getQuarterlyReport, ReportData, exportReportPdf } from "../../apis/reports";
import { getToken } from "../../utils/auth";
import dayjs from "dayjs";

const { Option } = Select;

// A4 Landscape: 297mm x 210mm
// Margins: 20mm (Left), 15mm (Top/Bottom/Right)
// Content Width: 297 - 20 - 15 = 262mm
const ROWS_PER_FIRST_PAGE = 8; 
const ROWS_PER_PAGE = 13;   

// Translation Map
const STATUS_MAP: Record<string, string> = {
    "MOI": "Mới",
    "DANG_SU_DUNG": "Đang sử dụng",
    "SU_DUNG_HAN_CHE": "Sử dụng hạn chế",
    "DANG_SUA_CHUA": "Đang sửa chữa",
    "THANH_LY": "Thanh lý",
    "HONG": "Hỏng",
    "TOT": "Tốt",
    // Fallback for others if needed
};

const Reports: React.FC = () => {
  const token = getToken();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData[]>([]);
  const [quarter, setQuarter] = useState<number>(1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [period, setPeriod] = useState<string>("");
  const [zoom, setZoom] = useState<number>(0.7); 
  const reportContainerRef = useRef<HTMLDivElement>(null);

  const handleFetchReport = async () => {
    setLoading(true);
    try {
      const res = await getQuarterlyReport(token, { quarter, year });
      setData(res.data);
      setPeriod(res.period);
      message.success("Lấy dữ liệu báo cáo thành công!");
    } catch (error) {
      console.error(error);
      message.error("Có lỗi xảy ra khi lấy dữ liệu báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (data.length === 0) {
        message.warning("Không có dữ liệu để xuất PDF");
        return;
    }

    const hide = message.loading("Đang tạo PDF từ server...", 0);
    
    try {
        // Construct HTML Manually from Data State to ensure Single Continuous Table
        const rowsHtml = data.map((item, index) => `
            <tr>
                <td style="text-align: center;">${item.tt}</td>
                <td>${item.deviceName}</td>
                <td style="text-align: center;">${getStatusLabel(item.currentStatus)}</td>
                <td style="text-align: center;">${item.managementUnit}</td>
                <td style="text-align: center;">${item.maintenanceCount || 0}</td>
                <td style="text-align: center;">${item.repairCount || 0}</td>
                <td style="text-align: center;">${item.isPending}</td>
                <td style="text-align: center;">${item.isFixed}</td>
                <td>${item.repairUnit}</td>
                <td>${item.replacementParts}</td>
                <td>${item.notes}</td>
            </tr>
        `).join("");

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <style>
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        width: 100%;
                        font-family: "Times New Roman", Times, serif; 
                        font-size: 11pt; 
                        -webkit-print-color-adjust: exact;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        table-layout: fixed; 
                    }
                    /* Border Styles */
                    td, th {
                        border: 1px solid #000;
                        padding: 4px 2px;
                        word-break: break-word;
                        overflow-wrap: break-word; /* Ensure long text wraps */
                        vertical-align: middle;
                        font-size: 11pt;
                    }
                    /* Header Styles */
                    th {
                        text-align: center;
                        font-weight: bold;
                    }
                    /* Pagination Control */
                    thead { display: table-header-group; }
                    tbody { display: table-row-group; }
                    tr { page-break-inside: avoid; }
                    
                    /* Utility */
                    .text-center { text-align: center; }
                    .signature-block {
                        margin-top: 20px;
                        page-break-inside: avoid;
                        display: flex;
                        justify-content: space-between;
                        padding: 0 20px;
                    }
                </style>
            </head>
            <body>
                <div style="width: 100%; padding: 0;">
                    
                    <!-- Report Header -->
                    <div style="text-align: center; margin-bottom: 5px; position: relative;">
                        <div style="position: absolute; top: 0; left: 0;">Phụ lục 02</div>
                        <div style="text-align: right;">
                            <div style="display: inline-block; border: 1px solid #000; padding: 5px 10px; text-align: center;">
                                <b>BCKT-1/BM1</b><br/>Lần ban hành: 01/01
                            </div>
                        </div>
                    </div>

                    <div style="text-align: center; margin-bottom: 15px;">
                        <div style="font-size: 15pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase;">
                            BÁO CÁO KỸ THUẬT TRANG THIẾT BỊ QUÝ ${quarter} NĂM ${year}
                        </div>
                        <div style="font-size: 12pt; font-style: italic;">
                            (${period || "Từ ... đến ..."})
                        </div>
                    </div>

                    <div style="font-size: 12pt; font-weight: bold; margin-bottom: 2px;">
                        Đơn vị quản lý: CẢNG HÀNG KHÔNG CÔN ĐẢO
                    </div>
                    <div style="font-size: 12pt; margin-bottom: 10px;">
                        Kính gửi: Ban Kỹ thuật Công nghệ Môi trường
                    </div>

                    <!-- Main Table -->
                    <table>
                        <colgroup>
                            <col style="width: 10mm" />
                            <col style="width: 50mm" />
                            <col style="width: 25mm" />
                            <col style="width: 25mm" />
                            <col style="width: 15mm" />
                            <col style="width: 15mm" />
                            <col style="width: 20mm" />
                            <col style="width: 20mm" />
                            <col style="width: 25mm" />
                            <col style="width: 25mm" />
                            <col style="width: auto" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th rowSpan="2">TT</th>
                                <th rowSpan="2">Tên thiết bị</th>
                                <th rowSpan="2">Tình trạng<br/>KT hiện tại</th>
                                <th rowSpan="2">Đơn vị<br/>quản lý</th>
                                <th colSpan="2">Số lần</th>
                                <th rowSpan="2">Đang<br/>khắc phục</th>
                                <th rowSpan="2">Đã<br/>khắc phục</th>
                                <th rowSpan="2">Đơn vị<br/>sửa chữa</th>
                                <th rowSpan="2">Vật tư<br/>thay thế</th>
                                <th rowSpan="2">Ghi chú</th>
                            </tr>
                            <tr>
                                <th>Bảo<br/>dưỡng</th>
                                <th>Hỏng<br/>hóc</th>
                            </tr>
                            <tr>
                                <th>(1)</th>
                                <th>(2)</th>
                                <th>(3)</th>
                                <th>(4)</th>
                                <th>(5)</th>
                                <th>(6)</th>
                                <th>(7)</th>
                                <th>(8)</th>
                                <th>(9)</th>
                                <th>(10)</th>
                                <th>(11)</th>
                            </tr>
                        </thead>
                        <tbody>
                             <tr>
                                <td colSpan="11" style="font-weight: bold; padding: 5px;">
                                    I. TRANG THIẾT BỊ/ PHƯƠNG TIỆN HOẠT ĐỘNG TRÊN KHU BAY
                                </td>
                            </tr>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <!-- Signature Block -->
                    <div class="signature-block">
                        <div style="text-align: center; width: 200px;">
                            <b>Người báo cáo</b>
                        </div>
                        <div style="text-align: center; width: 250px;">
                            <div style="font-style: italic; margin-bottom: 5px;">
                                Ngày ${dayjs().date()} tháng ${dayjs().month() + 1} năm ${dayjs().year()}
                            </div>
                            <div style="font-weight: bold; text-transform: uppercase;">Thủ trưởng đơn vị</div>
                        </div>
                    </div>

                </div>
            </body>
            </html>
        `;

        const blob = await exportReportPdf(token, htmlContent);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");

        hide();
        message.success("Đã mở PDF trong tab mới!");
    } catch (error) {
        hide();
        console.error(error);
        message.error("Lỗi khi tạo PDF.");
    }
  };

  // --- Helper to chunk data ---
  const getPages = () => {
    if (data.length === 0) return [[]];
    
    const pages: ReportData[][] = [];
    let currentRow = 0;

    // First page
    const firstPageRows = data.slice(0, ROWS_PER_FIRST_PAGE);
    pages.push(firstPageRows);
    currentRow += ROWS_PER_FIRST_PAGE;

    // Subsequent pages
    while (currentRow < data.length) {
      const nextRows = data.slice(currentRow, currentRow + ROWS_PER_PAGE);
      pages.push(nextRows);
      currentRow += ROWS_PER_PAGE;
    }
    return pages;
  };

  const pages = getPages();

  // --- Strict A4 Styles ---
  const styles = {
    pageContainer: {
        width: "297mm",
        height: "210mm",
        background: "white",
        marginBottom: "30px", 
        padding: "15mm 15mm 15mm 20mm", // Visual Padding for Monitor
        boxSizing: "border-box" as const,
        position: "relative" as const,
        fontFamily: '"Times New Roman", Times, serif',
        color: "#000",
        boxShadow: "0 4px 8px rgba(0,0,0,0.2)", 
    },
    headerTopLine: {
        fontSize: "11pt",
        textAlign: "center" as const,
        marginBottom: "5px",
        position: "relative" as const,
    },
    headerGrid: {
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "start",
        marginBottom: "10px",
    },
    boxBorder: {
        border: "1px solid #000",
        padding: "5px 10px",
        textAlign: "center" as const,
        fontSize: "10pt",
        minWidth: "150px",
    },
    titleSection: {
        textAlign: "center" as const,
        marginBottom: "15px",
    },
    titleMain: {
        fontSize: "15pt",
        fontWeight: "bold",
        marginBottom: "5px",
        textTransform: "uppercase" as const,
    },
    titleSub: {
        fontSize: "12pt",
        fontStyle: "italic",
    },
    metaInfo: {
        fontSize: "12pt",
        fontWeight: "bold",
        marginBottom: "2px",
    },
    metaDest: {
        fontSize: "12pt",
        marginBottom: "10px",
        marginTop: "2px",
    },
    // Table fixed layout
    table: {
        width: "100%",
        borderCollapse: "collapse" as const,
        tableLayout: "fixed" as const,
        fontSize: "11pt",
    },
    th: {
        border: "1px solid #000",
        padding: "4px 2px",
        textAlign: "center" as const,
        verticalAlign: "middle",
        fontWeight: "bold",
        overflow: "hidden",
        wordBreak: "break-word" as const,
        fontSize: "11pt",
    },
    td: {
        border: "1px solid #000",
        padding: "4px 2px",
        verticalAlign: "middle",
        textAlign: "left" as const,
        overflow: "hidden",
        wordBreak: "break-word" as const,
        fontSize: "11pt",
    },
    tdCenter: {
        border: "1px solid #000",
        padding: "4px 2px",
        verticalAlign: "middle",
        textAlign: "center" as const,
        fontSize: "11pt",
    },
    signatureBlock: {
        marginTop: "20mm",
        display: "flex",
        justifyContent: "space-between",
        paddingLeft: "20px",
        paddingRight: "20px",
    },
    pageNumber: {
        position: "absolute" as const,
        bottom: "10mm",
        left: 0,
        right: 0,
        textAlign: "center" as const,
        fontSize: "10pt",
    }
  };

  const getStatusLabel = (status: string) => {
    return STATUS_MAP[status] || status;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", background: "#f0f2f5" }}>
      {/* Control Bar */}
      <Card bordered={false} bodyStyle={{ padding: "12px 24px" }} style={{ zIndex: 10, borderRadius: 0 }}>
        <Space size="middle" align="center" style={{ width: "100%", justifyContent: "space-between" }}>
            <Space size="middle">
                <div>
                    <span style={{ fontWeight: 500, marginRight: 8 }}>Quý:</span>
                    <Select value={quarter} onChange={setQuarter} style={{ width: 100 }}>
                        {[1, 2, 3, 4].map((q) => <Option key={q} value={q}>Quý {q}</Option>)}
                    </Select>
                </div>
                <div>
                    <span style={{ fontWeight: 500, marginRight: 8 }}>Năm:</span>
                    <Select value={year} onChange={setYear} style={{ width: 100 }}>
                        {[2023, 2024, 2025, 2026, 2027].map((y) => <Option key={y} value={y}>{y}</Option>)}
                    </Select>
                </div>
                <Button
                    type="primary"
                    icon={<SearchOutlined />}
                    onClick={handleFetchReport}
                    loading={loading}
                >
                    Xem báo cáo
                </Button>
            </Space>

            <Space size="middle">
                {/* Scale Control */}
                <div style={{ display: "flex", alignItems: "center", width: 200 }}>
                    <ZoomOutOutlined onClick={() => setZoom(Math.max(0.3, zoom - 0.1))} />
                    <Slider
                        min={0.3}
                        max={1.5}
                        step={0.1}
                        value={zoom}
                        onChange={(val: number) => setZoom(val)}
                        style={{ flex: 1, margin: "0 10px" }}
                        tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
                    />
                    <ZoomInOutlined onClick={() => setZoom(Math.min(1.5, zoom + 0.1))} />
                </div>

                <Button
                    danger
                    icon={<FilePdfOutlined />}
                    onClick={handleExportPDF}
                >
                    Xuất PDF
                </Button>
             </Space>
        </Space>
      </Card>

      {/* RENDER PAGES (Scrollable Viewport) */}
      <div 
        style={{ 
            flex: 1, 
            overflow: "auto", 
            background: "#525659", 
            display: "flex", 
            justifyContent: "center",
            padding: "40px"
        }}
      >
        {/* Scale Wrapper */}
        <div style={{ 
            transform: `scale(${zoom})`, 
            transformOrigin: "top center", 
            transition: "transform 0.2s ease-out" 
        }}>
            <div ref={reportContainerRef}>
                {pages.map((rows, pageIndex) => {
                    const isFirstPage = pageIndex === 0;
                    const isLastPage = pageIndex === pages.length - 1;
                    
                    return (
                        <div key={pageIndex} className="report-page" style={styles.pageContainer}>
                            {/* Header Area (First Page) */}
                            {isFirstPage ? (
                                <>
                                    <div style={styles.headerTopLine}>
                                        <div style={{ display: "inline-block" }}>Phụ lục 02</div>
                                    </div>
                                    <div style={styles.headerGrid}>
                                        <div></div>
                                        <div></div>
                                        <div style={{ justifySelf: "end" }}>
                                            <div style={styles.boxBorder}>
                                                <b>BCKT-1/BM1</b><br/>
                                                Lần ban hành: 01/01
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={styles.titleSection}>
                                        <div style={styles.titleMain}>
                                            BÁO CÁO KỸ THUẬT TRANG THIẾT BỊ QUÝ {quarter} NĂM {year}
                                        </div>
                                        <div style={styles.titleSub}>
                                            ({period || "Từ ... đến ..."})
                                        </div>
                                    </div>
                                    
                                    {/* Don vi quan ly line - Adjusted spacing */}
                                    <div style={styles.metaInfo}>
                                        Đơn vị quản lý: CẢNG HÀNG KHÔNG CÔN ĐẢO
                                    </div>
                                    <div style={styles.metaDest}>
                                        Kính gửi: Ban Kỹ thuật Công nghệ Môi trường
                                    </div>
                                </>
                            ) : (
                                <div style={{ height: "10mm" }}></div> 
                            )}

                            {/* Table */}
                            <table style={styles.table}>
                                <colgroup>
                                    <col style={{ width: "10mm" }} /> {/* TT */}
                                    <col style={{ width: "50mm" }} /> {/* Tên TB */}
                                    <col style={{ width: "25mm" }} /> {/* Tình trạng */}
                                    <col style={{ width: "25mm" }} /> {/* Đơn vị QL */}
                                    <col style={{ width: "15mm" }} /> {/* SL Bảo dưỡng */}
                                    <col style={{ width: "15mm" }} /> {/* SL Hỏng */}
                                    <col style={{ width: "20mm" }} /> {/* Đang KP */}
                                    <col style={{ width: "20mm" }} /> {/* Đã KP */}
                                    <col style={{ width: "25mm" }} /> {/* Đơn vị sửa */}
                                    <col style={{ width: "25mm" }} /> {/* Vật tư */}
                                    <col style={{ width: "auto" }} /> {/* Ghi chú */}
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th style={styles.th} rowSpan={2}>TT</th>
                                        <th style={styles.th} rowSpan={2}>Tên thiết bị</th>
                                        <th style={styles.th} rowSpan={2}>Tình trạng<br/>KT hiện tại</th>
                                        <th style={styles.th} rowSpan={2}>Đơn vị<br/>quản lý</th>
                                        <th style={styles.th} colSpan={2}>Số lần</th>
                                        <th style={styles.th} rowSpan={2}>Đang<br/>khắc phục</th>
                                        <th style={styles.th} rowSpan={2}>Đã<br/>khắc phục</th>
                                        <th style={styles.th} rowSpan={2}>Đơn vị<br/>sửa chữa</th>
                                        <th style={styles.th} rowSpan={2}>Vật tư<br/>thay thế</th>
                                        <th style={styles.th} rowSpan={2}>Ghi chú</th>
                                    </tr>
                                    <tr>
                                        <th style={styles.th}>Bảo<br/>dưỡng</th>
                                        <th style={styles.th}>Hỏng<br/>hóc</th>
                                    </tr>
                                    <tr>
                                        <th style={styles.th}>(1)</th>
                                        <th style={styles.th}>(2)</th>
                                        <th style={styles.th}>(3)</th>
                                        <th style={styles.th}>(4)</th>
                                        <th style={styles.th}>(5)</th>
                                        <th style={styles.th}>(6)</th>
                                        <th style={styles.th}>(7)</th>
                                        <th style={styles.th}>(8)</th>
                                        <th style={styles.th}>(9)</th>
                                        <th style={styles.th}>(10)</th>
                                        <th style={styles.th}>(11)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isFirstPage && (
                                        <tr>
                                            <td colSpan={11} style={{ ...styles.td, fontWeight: "bold", background: "#fff" }}>
                                                I. TRANG THIẾT BỊ/ PHƯƠNG TIỆN HOẠT ĐỘNG TRÊN KHU BAY
                                            </td>
                                        </tr>
                                    )}
                                    {rows.map((item, idx) => (
                                        <tr key={idx}>
                                            <td style={styles.tdCenter}>{item.tt}</td>
                                            <td style={styles.td}>{item.deviceName}</td>
                                            <td style={styles.tdCenter}>{getStatusLabel(item.currentStatus)}</td>
                                            <td style={styles.tdCenter}>{item.managementUnit}</td>
                                            <td style={styles.tdCenter}>{item.maintenanceCount || 0}</td>
                                            <td style={styles.tdCenter}>{item.repairCount || 0}</td>
                                            <td style={styles.tdCenter}>{item.isPending}</td>
                                            <td style={styles.tdCenter}>{item.isFixed}</td>
                                            <td style={styles.td}>{item.repairUnit}</td>
                                            <td style={styles.td}>{item.replacementParts}</td>
                                            <td style={styles.td}>{item.notes}</td>
                                        </tr>
                                    ))}
                                    {data.length === 0 && (
                                        <tr>
                                            <td colSpan={11} style={{ padding: "20px", textAlign: "center" }}>Không có dữ liệu</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>


                            {/* Footer Signature (Last Page) */}
                            {isLastPage && (
                                <div style={styles.signatureBlock}>
                                    <div style={{ textAlign: "center", width: "200px" }}>
                                        <b>Người báo cáo</b>
                                    </div>
                                    <div style={{ textAlign: "center", width: "250px" }}>
                                        <div style={{ fontStyle: "italic", marginBottom: "5px" }}>
                                            Ngày {dayjs().date()} tháng {dayjs().month() + 1} năm {dayjs().year()}
                                        </div>
                                        <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>Thủ trưởng đơn vị</div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Page Number Removed for Puppeteer Handling */}
                        </div>
                    );
                })}

            </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
