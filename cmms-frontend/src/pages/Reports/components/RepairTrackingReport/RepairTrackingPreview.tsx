import React from "react";
import dayjs from "dayjs";
import { IRepairTrackingRow } from "./types";

interface RepairTrackingPreviewProps {
  rows: IRepairTrackingRow[];
  groupLabel: string;
  periodText: string;
  year: number;
  zoom: number;
}

const ROWS_PER_PAGE = 12; // Standard A4 Landscape page size capacity with header/footer

export const RepairTrackingPreview: React.FC<RepairTrackingPreviewProps> = ({
  rows,
  groupLabel,
  periodText,
  year,
  zoom,
}) => {
  // Chunk rows into pages for realistic paper preview
  const chunkPages = (): IRepairTrackingRow[][] => {
    if (rows.length === 0) return [[]];
    const pages: IRepairTrackingRow[][] = [];
    for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
      pages.push(rows.slice(i, i + ROWS_PER_PAGE));
    }
    return pages;
  };

  const pages = chunkPages();
  const today = dayjs();

  // Strict A4 Landscape styles (297mm x 210mm)
  const styles = {
    viewport: {
      flex: 1,
      overflow: "auto" as const,
      background: "#525659",
      display: "flex",
      flexDirection: "column" as const,
      alignItems: "center",
      padding: "30px 10px",
      minHeight: "680px",
      borderRadius: "12px",
    },
    zoomWrapper: {
      transform: `scale(${zoom})`,
      transformOrigin: "top center",
      transition: "transform 0.15s ease-out",
    },
    pageContainer: {
      width: "297mm",
      minHeight: "210mm",
      background: "#ffffff",
      marginBottom: "28px",
      padding: "16mm 16mm 16mm 20mm", // 20mm left margin for binder/book margin
      boxSizing: "border-box" as const,
      position: "relative" as const,
      fontFamily: '"Times New Roman", Times, serif',
      color: "#000000",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      borderLeft: "6px solid #b91c1c", // Red notebook binding imitation matching photo!
    },
    headerTable: {
      width: "100%",
      borderCollapse: "collapse" as const,
      marginBottom: "12px",
    },
    headerCellLeft: {
      width: "45%",
      textAlign: "center" as const,
      verticalAlign: "top",
    },
    headerCellRight: {
      width: "55%",
      textAlign: "center" as const,
      verticalAlign: "top",
    },
    companyName: {
      fontSize: "10.5pt",
      fontWeight: "bold",
      textTransform: "uppercase" as const,
    },
    deptName: {
      fontSize: "11pt",
      fontWeight: "bold",
      textTransform: "uppercase" as const,
      marginTop: "2px",
      display: "inline-block",
      borderBottom: "1.5px solid #000",
      paddingBottom: "2px",
    },
    countryName: {
      fontSize: "11pt",
      fontWeight: "bold",
      textTransform: "uppercase" as const,
    },
    mottoName: {
      fontSize: "11pt",
      fontWeight: "bold",
      marginTop: "2px",
      display: "inline-block",
      borderBottom: "1.5px solid #000",
      paddingBottom: "2px",
    },
    titleSection: {
      textAlign: "center" as const,
      marginTop: "10px",
      marginBottom: "16px",
    },
    titleMain: {
      fontSize: "14pt",
      fontWeight: "bold",
      textTransform: "uppercase" as const,
      letterSpacing: "0.5px",
    },
    titleSub: {
      fontSize: "11pt",
      fontStyle: "italic",
      marginTop: "4px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as const,
      tableLayout: "fixed" as const,
      fontSize: "10pt",
    },
    th: {
      border: "1px solid #000",
      padding: "5px 3px",
      textAlign: "center" as const,
      verticalAlign: "middle",
      fontWeight: "bold",
      background: "#f8f9fa",
      wordBreak: "break-word" as const,
    },
    thSub: {
      border: "1px solid #000",
      padding: "2px 0",
      textAlign: "center" as const,
      fontWeight: "normal",
      fontStyle: "italic",
      background: "#f8f9fa",
      fontSize: "9.5pt",
    },
    td: {
      border: "1px solid #000",
      padding: "5px 4px",
      verticalAlign: "middle",
      wordBreak: "break-word" as const,
    },
    tdCenter: {
      border: "1px solid #000",
      padding: "5px 3px",
      textAlign: "center" as const,
      verticalAlign: "middle",
    },
    signatureBlock: {
      marginTop: "25px",
      display: "flex",
      justifyContent: "space-between",
      padding: "0 30px",
      fontSize: "11pt",
    },
    sigColumn: {
      textAlign: "center" as const,
      width: "250px",
    },
    pageNumberFooter: {
      position: "absolute" as const,
      bottom: "10mm",
      left: 0,
      right: 0,
      textAlign: "center" as const,
      fontSize: "9.5pt",
      fontStyle: "italic",
      color: "#666",
    },
  };

  return (
    <div style={styles.viewport}>
      <div style={styles.zoomWrapper}>
        {pages.map((pageRows, pageIndex) => {
          const isFirstPage = pageIndex === 0;
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <div
              key={pageIndex}
              className="repair-tracking-page"
              style={styles.pageContainer}
            >
              {/* Header block (First page) */}
              {isFirstPage ? (
                <>
                  <table style={styles.headerTable}>
                    <tbody>
                      <tr>
                        <td style={styles.headerCellLeft}>
                          <div style={styles.companyName}>CẢNG HÀNG KHÔNG CÔN ĐẢO</div>
                          <div style={styles.deptName}>ĐỘI KỸ THUẬT</div>
                        </td>
                        <td style={styles.headerCellRight}>
                          <div style={styles.countryName}>
                            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                          </div>
                          <div style={styles.mottoName}>Độc lập - Tự do - Hạnh phúc</div>
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={styles.titleSection}>
                    <div style={styles.titleMain}>
                      SỔ THEO DÕI SỬA CHỮA TTB ({groupLabel})
                    </div>
                    <div style={styles.titleSub}>
                      Năm {year} ({periodText})
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    borderBottom: "1px dashed #999",
                    paddingBottom: "8px",
                    marginBottom: "14px",
                    fontSize: "10pt",
                    fontStyle: "italic",
                  }}
                >
                  <span>SỔ THEO DÕI SỬA CHỮA TTB ({groupLabel}) - Tiếp theo</span>
                  <span>Trang {pageIndex + 1}/{pages.length}</span>
                </div>
              )}

              {/* Data Table */}
              <table style={styles.table}>
                <colgroup>
                  <col style={{ width: "5%" }} />   {/* (1) STT */}
                  <col style={{ width: "15%" }} />  {/* (2) Tên Thiết Bị */}
                  <col style={{ width: "10%" }} />  {/* (3) Biển Số */}
                  <col style={{ width: "9%" }} />   {/* (4) Ngày Hư Hỏng */}
                  <col style={{ width: "27%" }} />  {/* (5) Nội Dung Sửa Chữa */}
                  <col style={{ width: "9%" }} />   {/* (6) Ngày Hoàn Thành */}
                  <col style={{ width: "8%" }} />   {/* (7) Đơn Vị Sửa Chữa */}
                  <col style={{ width: "9%" }} />   {/* (8) Đơn Vị Khai Thác */}
                  <col style={{ width: "8%" }} />   {/* (9) Kết Quả */}
                </colgroup>
                <thead>
                  <tr>
                    <th style={styles.th}>STT</th>
                    <th style={styles.th}>Tên Thiết Bị</th>
                    <th style={styles.th}>Biển Số</th>
                    <th style={styles.th}>Ngày Hư Hỏng</th>
                    <th style={styles.th}>Nội Dung Sửa Chữa</th>
                    <th style={styles.th}>Ngày Hoàn Thành</th>
                    <th style={styles.th}>Đơn Vị Sửa Chữa</th>
                    <th style={styles.th}>Đơn Vị Khai Thác</th>
                    <th style={styles.th}>Kết Quả</th>
                  </tr>
                  <tr>
                    <th style={styles.thSub}>(1)</th>
                    <th style={styles.thSub}>(2)</th>
                    <th style={styles.thSub}>(3)</th>
                    <th style={styles.thSub}>(4)</th>
                    <th style={styles.thSub}>(5)</th>
                    <th style={styles.thSub}>(6)</th>
                    <th style={styles.thSub}>(7)</th>
                    <th style={styles.thSub}>(8)</th>
                    <th style={styles.thSub}>(9)</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr key={row.repairId}>
                      <td style={styles.tdCenter}>{row.stt}</td>
                      <td style={{ ...styles.td, fontWeight: 500 }}>{row.deviceName}</td>
                      <td style={{ ...styles.tdCenter, fontWeight: "bold", color: "#1e3a8a" }}>
                        {row.regNumber}
                      </td>
                      <td style={styles.tdCenter}>{row.breakdownDate}</td>
                      <td style={styles.td}>{row.repairContent}</td>
                      <td style={styles.tdCenter}>{row.completionDate || "—"}</td>
                      <td style={styles.tdCenter}>{row.repairUnit}</td>
                      <td style={styles.tdCenter}>{row.operatingUnit}</td>
                      <td
                        style={{
                          ...styles.tdCenter,
                          color: row.result === "Đạt" ? "#15803d" : "#b45309",
                          fontWeight: 500,
                        }}
                      >
                        {row.result}
                      </td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        style={{
                          padding: "36px",
                          textAlign: "center",
                          fontStyle: "italic",
                          color: "#6b7280",
                        }}
                      >
                        Không có dữ liệu sửa chữa nào phù hợp với bộ lọc đã chọn.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Signatures on the last page */}
              {isLastPage && (
                <div style={styles.signatureBlock}>
                  <div style={styles.sigColumn}>
                    <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                      NGƯỜI THEO DÕI / LẬP SỔ
                    </div>
                    <div style={{ fontStyle: "italic", fontSize: "10pt", marginTop: "2px" }}>
                      (Ký, ghi rõ họ tên)
                    </div>
                    <div style={{ height: "65px" }} />
                  </div>
                  <div style={styles.sigColumn}>
                    <div style={{ fontStyle: "italic", fontSize: "10pt", marginBottom: "3px" }}>
                      Ngày {today.date()} tháng {today.month() + 1} năm {today.year()}
                    </div>
                    <div style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                      ĐỘI TRƯỞNG ĐỘI KỸ THUẬT
                    </div>
                    <div style={{ fontStyle: "italic", fontSize: "10pt", marginTop: "2px" }}>
                      (Ký, đóng dấu / ghi rõ họ tên)
                    </div>
                    <div style={{ height: "65px" }} />
                  </div>
                </div>
              )}

              {/* Footer Page Number */}
              <div style={styles.pageNumberFooter}>
                Trang {pageIndex + 1} / {pages.length}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
