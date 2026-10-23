import dayjs from "dayjs";
import { IRepairTrackingRow } from "./types";

interface GenerateReportHtmlParams {
  rows: IRepairTrackingRow[];
  groupLabel: string;
  periodText: string;
  year: number;
}

export const generateRepairTrackingHtml = ({
  rows,
  groupLabel,
  periodText,
  year,
}: GenerateReportHtmlParams): string => {
  const tableRowsHtml =
    rows.length > 0
      ? rows
          .map(
            (row) => `
        <tr>
          <td style="text-align: center; vertical-align: middle;">${row.stt}</td>
          <td style="text-align: left; vertical-align: middle; padding: 4px 6px;">${row.deviceName}</td>
          <td style="text-align: center; vertical-align: middle; font-weight: bold;">${row.regNumber}</td>
          <td style="text-align: center; vertical-align: middle;">${row.breakdownDate}</td>
          <td style="text-align: left; vertical-align: middle; padding: 4px 6px;">${row.repairContent}</td>
          <td style="text-align: center; vertical-align: middle;">${row.completionDate || ""}</td>
          <td style="text-align: center; vertical-align: middle;">${row.repairUnit}</td>
          <td style="text-align: center; vertical-align: middle;">${row.operatingUnit}</td>
          <td style="text-align: center; vertical-align: middle;">${row.result}</td>
        </tr>
      `
          )
          .join("")
      : `
        <tr>
          <td colspan="9" style="text-align: center; padding: 24px; font-style: italic; color: #555;">
            Không có dữ liệu sửa chữa trong khoảng thời gian đã chọn
          </td>
        </tr>
      `;

  const today = dayjs();

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sổ theo dõi sửa chữa TTB</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm 15mm 15mm 15mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      font-family: "Times New Roman", Times, serif;
      font-size: 11pt;
      color: #000;
      -webkit-print-color-adjust: exact;
    }
    .report-wrapper {
      width: 100%;
      box-sizing: border-box;
    }
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      table-layout: fixed;
    }
    .header-table td {
      border: none;
      vertical-align: top;
      padding: 0;
    }
    .unit-box {
      text-align: center;
      width: 45%;
    }
    .unit-box .company {
      font-size: 10.5pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .unit-box .dept {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-top: 2px;
      display: inline-block;
      border-bottom: 1.5px solid #000;
      padding-bottom: 2px;
    }
    .motto-box {
      text-align: center;
      width: 55%;
    }
    .motto-box .country {
      font-size: 11pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    .motto-box .motto {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 2px;
      display: inline-block;
      border-bottom: 1.5px solid #000;
      padding-bottom: 2px;
    }
    .title-section {
      text-align: center;
      margin-top: 8px;
      margin-bottom: 14px;
    }
    .title-main {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .title-sub {
      font-size: 11.5pt;
      font-style: italic;
      margin-top: 4px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      font-size: 10.5pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #000;
      padding: 4px 3px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    table.data-table th {
      text-align: center;
      font-weight: bold;
      background-color: #f7f7f7;
      vertical-align: middle;
    }
    table.data-table thead {
      display: table-header-group;
    }
    table.data-table tbody {
      display: table-row-group;
    }
    table.data-table tr {
      page-break-inside: avoid;
    }
    .sub-num-header th {
      font-weight: normal;
      font-style: italic;
      background-color: #fafafa;
      padding: 2px 0;
    }
    .signature-section {
      width: 100%;
      margin-top: 25px;
      page-break-inside: avoid;
      display: flex;
      justify-content: space-between;
    }
    .sig-col {
      text-align: center;
      width: 40%;
    }
    .sig-title {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 11pt;
    }
    .sig-sub {
      font-size: 10pt;
      font-style: italic;
      margin-top: 2px;
    }
    .sig-space {
      height: 70px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="report-wrapper">
    <!-- Header Unit & Motto -->
    <table class="header-table">
      <tr>
        <td class="unit-box">
          <div class="company">CẢNG HÀNG KHÔNG CÔN ĐẢO</div>
          <div class="dept">ĐỘI KỸ THUẬT</div>
        </td>
        <td class="motto-box">
          <div class="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
        </td>
      </tr>
    </table>

    <!-- Main Title -->
    <div class="title-section">
      <div class="title-main">SỔ THEO DÕI SỬA CHỮA TTB (${groupLabel})</div>
      <div class="title-sub">Năm ${year} (${periodText})</div>
    </div>

    <!-- Data Table -->
    <table class="data-table">
      <colgroup>
        <col style="width: 5%;">   <!-- (1) STT -->
        <col style="width: 15%;">  <!-- (2) Tên Thiết Bị -->
        <col style="width: 10%;">  <!-- (3) Biển Số -->
        <col style="width: 9%;">   <!-- (4) Ngày Hư Hỏng -->
        <col style="width: 27%;">  <!-- (5) Nội Dung Sửa Chữa -->
        <col style="width: 9%;">   <!-- (6) Ngày Hoàn Thành -->
        <col style="width: 8%;">   <!-- (7) Đơn Vị Sửa Chữa -->
        <col style="width: 9%;">   <!-- (8) Đơn Vị Khai Thác -->
        <col style="width: 8%;">   <!-- (9) Kết Quả -->
      </colgroup>
      <thead>
        <tr>
          <th>STT</th>
          <th>Tên Thiết Bị</th>
          <th>Biển Số</th>
          <th>Ngày Hư Hỏng</th>
          <th>Nội Dung Sửa Chữa</th>
          <th>Ngày Hoàn Thành</th>
          <th>Đơn Vị Sửa Chữa</th>
          <th>Đơn Vị Khai Thác</th>
          <th>Kết Quả</th>
        </tr>
        <tr class="sub-num-header">
          <th>(1)</th>
          <th>(2)</th>
          <th>(3)</th>
          <th>(4)</th>
          <th>(5)</th>
          <th>(6)</th>
          <th>(7)</th>
          <th>(8)</th>
          <th>(9)</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <!-- Signatures -->
    <div class="signature-section">
      <div class="sig-col">
        <div class="sig-title">NGƯỜI THEO DÕI / LẬP SỔ</div>
        <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
      <div class="sig-col">
        <div class="sig-sub">Ngày ${today.date()} tháng ${today.month() + 1} năm ${today.year()}</div>
        <div class="sig-title">ĐỘI TRƯỞNG ĐỘI KỸ THUẬT</div>
        <div class="sig-sub">(Ký, đóng dấu / ghi rõ họ tên)</div>
        <div class="sig-space"></div>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};
