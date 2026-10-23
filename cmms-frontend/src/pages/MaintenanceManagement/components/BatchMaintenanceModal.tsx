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

const normalizeLevel = (lvl: string): string => {
  if (!lvl) return "Tuần";
  const lower = lvl.trim().toLowerCase();
  if (lower.includes("tuần") || lower === "1w" || lower === "w") return "Tuần";
  if (lower.includes("1 tháng") || lower.includes("01 tháng") || lower === "1m")
    return "1M";
  if (lower.includes("3 tháng") || lower.includes("03 tháng") || lower === "3m")
    return "3M";
  if (lower.includes("6 tháng") || lower.includes("06 tháng") || lower === "6m")
    return "6M";
  if (lower.includes("9 tháng") || lower.includes("09 tháng") || lower === "9m")
    return "9M";
  if (lower.includes("1 năm") || lower.includes("01 năm") || lower === "1y")
    return "1Y";
  if (lower.includes("2 năm") || lower.includes("02 năm") || lower === "2y")
    return "2Y";
  return lvl.trim();
};

const parseExcelDate = (val: any): dayjs.Dayjs | null => {
  if (!val) return null;
  if (val instanceof Date) return dayjs(val);

  if (typeof val === "number") {
    // Excel numeric date
    const d = new Date((val - (25567 + 2)) * 86400 * 1000);
    return dayjs(d);
  }

  const s = String(val).trim();
  const formats = [
    "DD/MM/YYYY",
    "D/M/YYYY",
    "YYYY-MM-DD",
    "DD-MM-YYYY",
    "MM/DD/YYYY",
  ];
  for (const f of formats) {
    const parsed = dayjs(s, f, true);
    if (parsed.isValid()) return parsed;
  }
  const relaxed = dayjs(s);
  return relaxed.isValid() ? relaxed : null;
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
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
        });

        if (!rawJson || rawJson.length === 0) {
          message.error("File Excel không có dữ liệu!");
          return;
        }

        const rows: ParsedRow[] = rawJson.map((item, idx) => {
          // Lấy biển số
          const rawReg = String(
            item["Biển Số Xe (*)"] ||
              item["Biển Số Xe"] ||
              item["Biển số"] ||
              item["Số đăng ký"] ||
              item["reg_number"] ||
              ""
          ).trim();

          // Lấy tên xe
          const rawName = String(
            item["Tên Thiết Bị / Xe"] ||
              item["Tên Thiết Bị"] ||
              item["Tên xe"] ||
              item["name"] ||
              ""
          ).trim();

          // Lấy cấp
          const rawLvl = String(
            item["Cấp Bảo Dưỡng"] ||
              item["Cấp BD"] ||
              item["level"] ||
              item["Cấp độ"] ||
              ""
          ).trim();

          // Lấy ngày
          const rawDate =
            item["Ngày Thực Hiện (DD/MM/YYYY) (*)"] ||
            item["Ngày Thực Hiện"] ||
            item["Ngày thực hiện"] ||
            item["execution_date"] ||
            "";

          // Lấy ghi chú
          const notes = String(
            item["Ghi Chú Phát Sinh"] ||
              item["Ghi Chú"] ||
              item["Ghi chu"] ||
              item["arising_issues"] ||
              ""
          ).trim();

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
        ? r.finalDate.toISOString()
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
      width: 100,
      align: "center" as const,
      render: (lvl: string) => <Tag color="purple">{lvl}</Tag>,
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
              background: "#fafafa",
              borderRadius: 8,
              border: "1px solid #d9d9d9",
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
                    color: "#1890ff",
                    marginBottom: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <FileExcelOutlined /> Mẫu file ghi nhận bảo dưỡng hàng loạt
                </div>
                <div style={{ fontSize: 13, color: "#595959" }}>
                  Tải file mẫu, nhập Biển số xe, Cấp bảo dưỡng và Ngày thực
                  hiện để hệ thống tự động hoàn thành phiếu và chuyển chu kỳ.
                </div>
              </div>
              <Button
                type="primary"
                ghost
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
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
            style={{ padding: 24, borderRadius: 8 }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined style={{ color: "#1890ff" }} />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 15, fontWeight: 600 }}>
              Kéo thả file Excel hoặc bấm vào đây để chọn file
            </p>
            <p className="ant-upload-hint" style={{ color: "#8c8c8c" }}>
              Hỗ trợ định dạng .xlsx, .xls (Tự động đối soát và xem trước dữ liệu)
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
                background: "#1890ff",
                borderColor: "#1890ff",
                fontWeight: 600,
                paddingLeft: 24,
                paddingRight: 24,
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
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileExcelOutlined style={{ color: "#1890ff", fontSize: 18 }} />
          <span style={{ fontWeight: 700, fontSize: 17, color: "#002766" }}>
            Làm Bảo Dưỡng Hàng Loạt Bằng Excel
          </span>
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
      width={850}
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
