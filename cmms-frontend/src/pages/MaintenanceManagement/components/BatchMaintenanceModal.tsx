import React, { useState, useEffect } from "react";
import {
  Modal,
  Upload,
  Button,
  Steps,
  Result,
  Table,
  Card,
  Tag,
  Space,
  message,
  Tooltip,
  Alert,
} from "antd";
import {
  InboxOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  CalendarOutlined,
  CarOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { getAllDevices } from "../../../apis/devices";
import { batchCompleteMaintenance } from "../../../apis/maintenance";
import { getToken } from "../../../utils/auth";

dayjs.extend(customParseFormat);

const { Dragger } = Upload;

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  key: string;
  index: number;
  rawRegNumber: string;
  rawName: string;
  rawLevel: string;
  rawDate: string;
  notes: string;
  isValid: boolean;
  errorReason?: string;
  matchedDevice?: any;
  finalLevel: string;
  finalDate?: dayjs.Dayjs;
}

const normalizeStr = (s: string) =>
  s ? s.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";

const LEVEL_DISPLAY_MAP: Record<string, { label: string; color: string }> = {
  Tuần: { label: "Tuần", color: "blue" },
  "1M": { label: "01 Tháng", color: "cyan" },
  "3M": { label: "03 Tháng", color: "geekblue" },
  "6M": { label: "06 Tháng", color: "purple" },
  "9M": { label: "09 Tháng", color: "magenta" },
  "1Y": { label: "01 Năm", color: "magenta" },
  "2Y": { label: "02 Năm", color: "volcano" },
};

const normalizeLevel = (lvl: string): string => {
  if (!lvl) return "Tuần";
  const lower = lvl.trim().toLowerCase();
  if (
    lower.includes("tuần") ||
    lower.includes("tuan") ||
    lower === "1w" ||
    lower === "w" ||
    lower.includes("week")
  )
    return "Tuần";
  if (
    lower.includes("2 năm") ||
    lower.includes("02 năm") ||
    lower.includes("2 nam") ||
    lower.includes("02 nam") ||
    lower.includes("24 tháng") ||
    lower.includes("24 thang") ||
    lower === "2y" ||
    lower === "24_month"
  )
    return "2Y";
  if (
    lower.includes("1 năm") ||
    lower.includes("01 năm") ||
    lower.includes("1 nam") ||
    lower.includes("01 nam") ||
    lower.includes("12 tháng") ||
    lower.includes("12 thang") ||
    lower === "1y" ||
    lower === "12_month"
  )
    return "1Y";
  if (
    lower.includes("9 tháng") ||
    lower.includes("09 tháng") ||
    lower.includes("9 thang") ||
    lower.includes("09 thang") ||
    lower === "9m" ||
    lower === "9_month"
  )
    return "9M";
  if (
    lower.includes("6 tháng") ||
    lower.includes("06 tháng") ||
    lower.includes("6 thang") ||
    lower.includes("06 thang") ||
    lower === "6m" ||
    lower === "6_month"
  )
    return "6M";
  if (
    lower.includes("3 tháng") ||
    lower.includes("03 tháng") ||
    lower.includes("3 thang") ||
    lower.includes("03 thang") ||
    lower === "3m" ||
    lower === "3_month"
  )
    return "3M";
  if (
    lower.includes("1 tháng") ||
    lower.includes("01 tháng") ||
    lower.includes("1 thang") ||
    lower.includes("01 thang") ||
    lower === "1m" ||
    lower === "1_month" ||
    lower === "tháng" ||
    lower === "thang"
  )
    return "1M";
  return lvl.trim();
};

const parseExcelDate = (val: any): dayjs.Dayjs | null => {
  if (val === null || val === undefined || val === "") return null;

  // 1. Nếu là Date object (SheetJS hoặc JS Date)
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    const compensated = new Date(val.getTime() + 10 * 60 * 1000);
    return dayjs(
      new Date(
        compensated.getFullYear(),
        compensated.getMonth(),
        compensated.getDate(),
        12,
        0,
        0
      )
    );
  }

  // 2. Nếu là số serial từ Excel (e.g. 46029)
  if (typeof val === "number") {
    try {
      const parsed = XLSX.SSF.parse_date_code(val);
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return dayjs(new Date(parsed.y, parsed.m - 1, parsed.d, 12, 0, 0));
      }
    } catch {
      const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
      const compensated = new Date(jsDate.getTime() + 10 * 60 * 1000);
      return dayjs(
        new Date(
          compensated.getFullYear(),
          compensated.getMonth(),
          compensated.getDate(),
          12,
          0,
          0
        )
      );
    }
  }

  // 3. Nếu là chuỗi ký tự (String)
  const s = String(val).trim();
  if (!s) return null;

  // Nếu là chuỗi số Excel serial (e.g. "46029")
  if (!isNaN(Number(s)) && Number(s) > 30000 && Number(s) < 100000) {
    try {
      const parsed = XLSX.SSF.parse_date_code(Number(s));
      if (parsed && parsed.y && parsed.m && parsed.d) {
        return dayjs(new Date(parsed.y, parsed.m - 1, parsed.d, 12, 0, 0));
      }
    } catch {}
  }

  // Ưu tiên 1: Chuẩn ngày Việt Nam: DD/MM/YYYY, D/M/YYYY, D/M/YY, DD/MM/YY (ngăn cách bằng / hoặc - hoặc .)
  // Ví dụ: 7/1/26, 07/01/2026, 14/1/26, 7-1-26, 07.01.2026
  const vnMatch = s.match(/^(\d{1,2})[/\-. ](\d{1,2})[/\-. ](\d{2,4})$/);
  if (vnMatch) {
    const day = parseInt(vnMatch[1], 10);
    const month = parseInt(vnMatch[2], 10);
    let year = parseInt(vnMatch[3], 10);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return dayjs(new Date(year, month - 1, day, 12, 0, 0));
    }
  }

  // Ưu tiên 2: Chuẩn ISO YYYY-MM-DD hoặc YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[/\-. ](\d{1,2})[/\-. ](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return dayjs(new Date(year, month - 1, day, 12, 0, 0));
    }
  }

  // Fallback qua Dayjs nếu có định dạng đặc thù khác
  const formats = [
    "DD/MM/YYYY",
    "D/M/YYYY",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "D/M/YY",
    "DD/MM/YY",
  ];
  for (const f of formats) {
    const parsed = dayjs(s, f, true);
    if (parsed.isValid()) {
      return parsed.hour(12).minute(0).second(0).millisecond(0);
    }
  }

  const relaxed = dayjs(s);
  if (relaxed.isValid()) {
    return relaxed.hour(12).minute(0).second(0).millisecond(0);
  }

  return null;
};


const BatchMaintenanceModal: React.FC<Props> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const token = getToken();

  // Load danh sách thiết bị
  useEffect(() => {
    if (open) {
      getAllDevices(token)
        .then((res) => {
          if (Array.isArray(res)) setDevices(res);
        })
        .catch(() => {
          message.error("Lỗi tải danh mục thiết bị");
        });
    }
  }, [open, token]);

  // Tải file mẫu Excel
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        STT: 1,
        "Biển Số Xe (*)": "VCS11202",
        "Tên Thiết Bị / Xe": "Xe đầu kéo Toyota/02-2TD20",
        "Cấp Bảo Dưỡng": "Tuần",
        "Ngày Thực Hiện (DD/MM/YYYY) (*)": dayjs().format("DD/MM/YYYY"),
        "Ghi Chú Phát Sinh": "Đã kiểm tra động cơ và áp suất lốp",
      },
      {
        STT: 2,
        "Biển Số Xe (*)": "VCS11203",
        "Tên Thiết Bị / Xe": "Xe thang hành khách TUG",
        "Cấp Bảo Dưỡng": "01 Tháng",
        "Ngày Thực Hiện (DD/MM/YYYY) (*)": dayjs().format("DD/MM/YYYY"),
        "Ghi Chú Phát Sinh": "Thay dầu thủy lực",
      },
      {
        STT: 3,
        "Biển Số Xe (*)": "VCS11204",
        "Tên Thiết Bị / Xe": "Xe cứu hỏa sân đỗ",
        "Cấp Bảo Dưỡng": "03 Tháng",
        "Ngày Thực Hiện (DD/MM/YYYY) (*)": dayjs().format("DD/MM/YYYY"),
        "Ghi Chú Phát Sinh": "Kiểm tra vòi phun áp lực",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet["!cols"] = [
      { wch: 6 }, // STT
      { wch: 18 }, // Biển số xe
      { wch: 32 }, // Tên thiết bị
      { wch: 16 }, // Cấp bảo dưỡng
      { wch: 28 }, // Ngày thực hiện
      { wch: 36 }, // Ghi chú phát sinh
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Thuc_Hien_Bao_Duong"
    );

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(blob, "Mau_Ghi_Nhan_Bao_Duong_Hang_Loat.xlsx");
  };

  // Đọc file Excel và đối soát dữ liệu
  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, {
          raw: true,
          defval: "",
        });

        if (!rawJson || rawJson.length === 0) {
          message.error("File Excel không có dữ liệu!");
          return;
        }

        const rows: ParsedRow[] = rawJson.map((item, idx) => {
          // Lấy biển số xe một cách linh hoạt
          let rawReg = "";
          for (const key of Object.keys(item)) {
            const kl = key.toLowerCase().trim();
            if (
              kl.includes("biển số") ||
              kl.includes("bien so") ||
              kl.includes("số đăng ký") ||
              kl.includes("so dang ky") ||
              kl.includes("reg_number")
            ) {
              rawReg = String(item[key] || "").trim();
              break;
            }
          }
          if (!rawReg) {
            rawReg = String(
              item["Biển Số Xe (*)"] ||
                item["Biển Số Xe"] ||
                item["Biển số"] ||
                item["Số đăng ký"] ||
                item["reg_number"] ||
                ""
            ).trim();
          }

          // Lấy tên xe một cách linh hoạt
          let rawName = "";
          for (const key of Object.keys(item)) {
            const kl = key.toLowerCase().trim();
            if (
              kl.includes("tên thiết bị") ||
              kl.includes("ten thiet bi") ||
              kl.includes("tên xe") ||
              kl.includes("ten xe") ||
              kl === "name"
            ) {
              rawName = String(item[key] || "").trim();
              break;
            }
          }
          if (!rawName) {
            rawName = String(
              item["Tên Thiết Bị / Xe"] ||
                item["Tên Thiết Bị"] ||
                item["Tên xe"] ||
                item["name"] ||
                ""
            ).trim();
          }

          // Lấy cấp bảo dưỡng một cách linh hoạt
          let rawLvl = "";
          for (const key of Object.keys(item)) {
            const kl = key.toLowerCase().trim();
            if (
              kl.includes("cấp bảo dưỡng") ||
              kl.includes("cap bao duong") ||
              kl.includes("cấp bd") ||
              kl.includes("cap bd") ||
              kl === "level"
            ) {
              rawLvl = String(item[key] || "").trim();
              break;
            }
          }
          if (!rawLvl) {
            rawLvl = String(
              item["Cấp Bảo Dưỡng"] ||
                item["Cấp BD"] ||
                item["level"] ||
                item["Cấp độ"] ||
                ""
            ).trim();
          }

          // Lấy ngày thực hiện một cách linh hoạt
          let rawDate: any = "";
          for (const key of Object.keys(item)) {
            const kl = key.toLowerCase().trim();
            if (
              kl.includes("ngày thực hiện") ||
              kl.includes("ngay thuc hien") ||
              kl.includes("execution_date") ||
              kl.includes("ngày làm") ||
              kl.includes("ngay lam")
            ) {
              rawDate = item[key];
              break;
            }
          }
          if (!rawDate) {
            rawDate =
              item["Ngày Thực Hiện (DD/MM/YYYY) (*)"] ||
              item["Ngày Thực Hiện"] ||
              item["Ngày thực hiện"] ||
              item["execution_date"] ||
              "";
          }

          // Lấy ghi chú phát sinh một cách linh hoạt
          let notes = "";
          for (const key of Object.keys(item)) {
            const kl = key.toLowerCase().trim();
            if (
              kl.includes("ghi chú") ||
              kl.includes("ghi chu") ||
              kl.includes("phát sinh") ||
              kl.includes("arising_issues")
            ) {
              notes = String(item[key] || "").trim();
              break;
            }
          }
          if (!notes) {
            notes = String(
              item["Ghi Chú Phát Sinh"] ||
                item["Ghi Chú"] ||
                item["Ghi chu"] ||
                item["arising_issues"] ||
                ""
            ).trim();
          }

          // Đối soát với danh mục thiết bị
          const normReg = normalizeStr(rawReg);
          const normName = normalizeStr(rawName);

          let matched: any = null;
          // Ưu tiên 1: Khớp chính xác theo Biển số / Serial number nếu có
          if (normReg) {
            matched = devices.find((d) => {
              const dReg = normalizeStr(d.reg_number);
              const dSerial = normalizeStr(d.serial_number);
              return (dReg && dReg === normReg) || (dSerial && dSerial === normReg);
            });
          }
          // Ưu tiên 2: CHỈ fallback sang tên nếu trong file hoàn toàn KHÔNG có cột biển số
          if (!matched && !normReg && normName) {
            matched = devices.find((d) => normalizeStr(d.name) === normName);
          }

          const parsedDate = parseExcelDate(rawDate);
          let isValid = true;
          let errorReason = "";

          if (!matched) {
            isValid = false;
            errorReason = `Không tìm thấy xe khớp biển số "${rawReg}"`;
          } else if (!parsedDate || !parsedDate.isValid()) {
            isValid = false;
            errorReason = `Ngày thực hiện không hợp lệ ("${rawDate}")`;
          }

          const finalLevel = normalizeLevel(rawLvl);
          if (!LEVEL_DISPLAY_MAP[finalLevel]) {
            isValid = false;
            errorReason = `Cấp bảo dưỡng không nhận diện được ("${rawLvl}")`;
          }

          return {
            key: `row_${idx}`,
            index: idx + 1,
            rawRegNumber: rawReg,
            rawName: rawName,
            rawLevel: rawLvl,
            rawDate: String(rawDate),
            notes: notes,
            isValid: isValid,
            errorReason: errorReason,
            matchedDevice: matched,
            finalLevel: finalLevel,
            finalDate: parsedDate || undefined,
          };
        });

        setParsedRows(rows);
        setCurrentStep(1); // Chuyển sang bước Xem trước
      } catch (err: any) {
        message.error("Lỗi khi đọc file Excel: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Xác nhận lưu hàng loạt
  const handleConfirmSubmit = async () => {
    const validRows = parsedRows.filter((r) => r.isValid && r.matchedDevice);
    if (validRows.length === 0) {
      message.error("Không có dòng hợp lệ nào để thực hiện!");
      return;
    }

    // Sắp xếp theo thứ tự ngày tăng dần (Chronological order) để nếu 1 xe có nhiều kỳ bảo dưỡng
    // thì hệ thống sẽ ghi nhận và kích hoạt kỳ tiếp theo một cách tuần tự chính xác
    const sortedRows = [...validRows].sort((a, b) => {
      const timeA = a.finalDate ? a.finalDate.valueOf() : 0;
      const timeB = b.finalDate ? b.finalDate.valueOf() : 0;
      return timeA - timeB;
    });

    const payloadItems = sortedRows.map((r) => ({
      device_id: r.matchedDevice.device_id,
      maintenance_level: r.finalLevel,
      execution_date: r.finalDate
        ? r.finalDate.hour(12).minute(0).second(0).millisecond(0).toISOString()
        : new Date().toISOString(),
      arising_issues: r.notes || undefined,
    }));

    setSubmitting(true);
    try {
      const res = await batchCompleteMaintenance(token, payloadItems);
      setBatchResult(res);
      setCurrentStep(2); // Bước kết quả
      message.success(`Đã xử lý xong ${res.successCount || validRows.length} lượt bảo dưỡng!`);
      onSuccess();
    } catch (err: any) {
      message.error(err.message || "Lỗi khi xử lý hàng loạt");
    } finally {
      setSubmitting(false);
    }
  };

  const validRows = parsedRows.filter((r) => r.isValid && r.matchedDevice);
  const validCount = validRows.length;
  const uniqueDevicesCount = new Set(validRows.map((r) => r.matchedDevice?.device_id).filter(Boolean)).size;
  const invalidCount = parsedRows.length - validCount;

  // Cột cho bảng Xem trước (Preview)
  const previewColumns = [
    {
      title: "STT",
      dataIndex: "index",
      width: 50,
      align: "center" as const,
    },
    {
      title: "Biển số file",
      dataIndex: "rawRegNumber",
      width: 120,
      render: (t: string) => (
        <Tag color="cyan" style={{ fontWeight: 600 }}>
          {t || "Trống"}
        </Tag>
      ),
    },
    {
      title: "Thiết bị nhận diện",
      key: "device",
      render: (_: any, r: ParsedRow) =>
        r.matchedDevice ? (
          <div>
            <div style={{ fontWeight: 600, color: "#1890ff" }}>
              <CarOutlined style={{ marginRight: 6 }} />
              {r.matchedDevice.name}
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
              {r.matchedDevice.reg_number ? (
                <Tag color="cyan" style={{ fontSize: 11, padding: "0 4px", marginRight: 4, fontWeight: 500 }}>
                  {r.matchedDevice.reg_number}
                </Tag>
              ) : null}
              <span>{r.matchedDevice.brand || r.matchedDevice.deviceType?.name || ""}</span>
            </div>
          </div>
        ) : (
          <span style={{ color: "#ff4d4f", fontStyle: "italic" }}>
            (Không khớp trong hệ thống)
          </span>
        ),
    },
    {
      title: "Cấp BD",
      dataIndex: "finalLevel",
      width: 110,
      align: "center" as const,
      render: (lvl: string) => {
        const conf = LEVEL_DISPLAY_MAP[lvl] || { label: lvl, color: "default" };
        return (
          <Tag color={conf.color} style={{ fontWeight: 600 }}>
            {conf.label}
          </Tag>
        );
      },
    },
    {
      title: "Ngày thực hiện",
      key: "date",
      width: 130,
      align: "center" as const,
      render: (_: any, r: ParsedRow) =>
        r.finalDate && r.finalDate.isValid() ? (
          <span style={{ fontWeight: 600 }}>
            <CalendarOutlined style={{ marginRight: 5, color: "#52c41a" }} />
            {r.finalDate.format("DD/MM/YYYY")}
          </span>
        ) : (
          <span style={{ color: "#ff4d4f" }}>{r.rawDate || "Thiếu ngày"}</span>
        ),
    },
    {
      title: "Ghi chú",
      dataIndex: "notes",
      render: (t: string) => (
        <span style={{ fontSize: 12, color: "#666" }}>{t || "-"}</span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 120,
      align: "center" as const,
      render: (_: any, r: ParsedRow) =>
        r.isValid ? (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Hợp lệ
          </Tag>
        ) : (
          <Tooltip title={r.errorReason}>
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Lỗi
            </Tag>
          </Tooltip>
        ),
    },
  ];

  const steps = [
    {
      title: "Tải File Excel",
      content: (
        <div>
          {/* Card Hướng dẫn & Tải file mẫu */}
          <Card
            size="small"
            style={{
              marginBottom: 16,
              background: "#f0fdf4",
              borderRadius: 10,
              border: "1px solid #bbf7d0",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#166534",
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FileExcelOutlined style={{ color: "#52c41a" }} /> Mẫu file ghi nhận bảo dưỡng hàng loạt
                </div>
                <div style={{ fontSize: 13, color: "#4b5563" }}>
                  Tải file mẫu, nhập Biển số xe, Cấp bảo dưỡng và Ngày thực
                  hiện để hệ thống tự động hoàn thành phiếu và chuyển chu kỳ.
                </div>
              </div>
              <Button
                type="primary"
                ghost
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
                style={{
                  borderRadius: 8,
                  borderColor: "#52c41a",
                  color: "#237804",
                  background: "#fff",
                  fontWeight: 600,
                }}
              >
                Tải File Mẫu Excel (.xlsx)
              </Button>
            </div>
          </Card>

          <Dragger
            name="file"
            multiple={false}
            fileList={fileList}
            beforeUpload={(file) => {
              setFileList([file]);
              processExcelFile(file);
              return false;
            }}
            onRemove={() => {
              setFileList([]);
              setParsedRows([]);
            }}
            accept=".xlsx, .xls"
            style={{
              padding: "28px 16px",
              background: "#fafcfc",
              borderRadius: 12,
              border: "2px dashed #93c5fd",
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "#1677ff", fontSize: 44 }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 600, color: "#0f172a" }}>
              Kéo thả file Excel hoặc bấm vào đây để chọn file
            </p>
            <p className="ant-upload-hint" style={{ color: "#64748b" }}>
              Hỗ trợ định dạng .xlsx, .xls (Hệ thống tự động đối soát biển số và xem trước dữ liệu)
            </p>
          </Dragger>
        </div>
      ),
    },
    {
      title: "Xem Trước & Xác Nhận",
      content: (
        <div>
          {/* Box Thống kê kiểm tra */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <Space>
              <Tag color="success" style={{ fontSize: 13, padding: "4px 10px" }}>
                ✅ Hợp lệ: <b>{validCount}</b> lượt bảo dưỡng {uniqueDevicesCount > 0 && `(${uniqueDevicesCount} xe)`}
              </Tag>
              {invalidCount > 0 && (
                <Tag color="error" style={{ fontSize: 13, padding: "4px 10px" }}>
                  ❌ Cần kiểm tra lại: <b>{invalidCount}</b> dòng
                </Tag>
              )}
            </Space>

            <Button
              size="small"
              onClick={() => {
                setFileList([]);
                setParsedRows([]);
                setCurrentStep(0);
              }}
            >
              Chọn lại file khác
            </Button>
          </div>

          {invalidCount > 0 && (
            <Alert
              message={
                <span>
                  Có <b>{invalidCount}</b> dòng bị lỗi (không khớp biển số hoặc sai định dạng ngày). Các dòng lỗi sẽ tự động được bỏ qua, hệ thống chỉ ghi nhận cho <b>{validCount}</b> lượt bảo dưỡng hợp lệ ({uniqueDevicesCount} xe).
                </span>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 12, borderRadius: 6 }}
            />
          )}

          <Table
            dataSource={parsedRows}
            columns={previewColumns}
            pagination={{ pageSize: 6, size: "small" }}
            size="small"
            bordered
            scroll={{ x: 750 }}
            style={{ borderRadius: 8, overflow: "hidden" }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              marginTop: 16,
            }}
          >
            <Button
              onClick={() => {
                setFileList([]);
                setParsedRows([]);
                setCurrentStep(0);
              }}
              disabled={submitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={handleConfirmSubmit}
              loading={submitting}
              disabled={validCount === 0}
              style={{
                borderRadius: 8,
                background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                border: "none",
                fontWeight: 600,
                paddingLeft: 24,
                paddingRight: 24,
                boxShadow: "0 4px 14px rgba(22, 119, 255, 0.25)",
              }}
            >
              Xác nhận hoàn thành ({validCount} lượt bảo dưỡng{uniqueDevicesCount > 0 ? ` - ${uniqueDevicesCount} xe` : ""})
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: "Hoàn Tất",
      content: (
        <Result
          status="success"
          title="Ghi nhận bảo dưỡng hàng loạt hoàn tất!"
          subTitle={
            <span>
              Đã tạo phiếu bảo dưỡng thành công cho{" "}
              <b>{batchResult?.successCount || validCount}</b> lượt bảo dưỡng ({uniqueDevicesCount} xe) và cập nhật
              chu kỳ kế hoạch bảo dưỡng tiếp theo.
            </span>
          }
          extra={[
            <Button
              type="primary"
              key="close"
              style={{
                borderRadius: 8,
                background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                border: "none",
                fontWeight: 600,
              }}
              onClick={() => {
                onClose();
                setCurrentStep(0);
                setFileList([]);
                setParsedRows([]);
                setBatchResult(null);
              }}
            >
              Hoàn tất & Đóng
            </Button>,
          ]}
        />
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 20,
              boxShadow: "0 4px 12px rgba(82, 196, 26, 0.3)",
            }}
          >
            <FileExcelOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "#0f172a" }}>
              Ghi Nhận Bảo Dưỡng Hàng Loạt Bằng Excel
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              Tự động đối soát biển số, hoàn thành phiếu bảo dưỡng và chuyển chu kỳ tiếp theo
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={() => {
        if (!submitting) {
          onClose();
          setCurrentStep(0);
          setFileList([]);
          setParsedRows([]);
          setBatchResult(null);
        }
      }}
      footer={null}
      width={900}
      destroyOnClose
      centered
      maskClosable={false}
    >
      <Steps
        current={currentStep}
        items={steps.map((s) => ({ title: s.title }))}
        style={{ marginBottom: 20 }}
      />
      <div>{steps[currentStep].content}</div>
    </Modal>
  );
};

export default BatchMaintenanceModal;
