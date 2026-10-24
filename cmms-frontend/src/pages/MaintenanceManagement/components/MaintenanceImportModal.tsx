import React, { useState } from "react";
import { Modal, Upload, Button, Steps, Result, Table, Typography, Card, Space, Divider, Tag } from "antd";
import {
  InboxOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import { useMaintenance } from "../../../hooks/useMaintenance";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const { Dragger } = Upload;
const { Text } = Typography;

interface MaintenanceImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MaintenanceImportModal: React.FC<MaintenanceImportModalProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<any[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const { importMaintenanceSchedule, loading } = useMaintenance();

  // Xuất file Excel mẫu chuẩn
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "STT": 1,
        "Biển Số Xe (*)": "72A-012.34",
        "Tên Thiết Bị / Xe (*)": "Xe đầu kéo TLD 01",
        "Nhãn Hiệu": "TLD",
        "Ngày Bắt Đầu (DD/MM/YYYY)": "01/01/2026",
        "Tuần (W)": "x",
        "1 Tháng (1M)": "x",
        "3 Tháng (3M)": "x",
        "6 Tháng (6M)": "x",
        "1 Năm (1Y)": "x",
        "2 Năm (2Y)": "",
        "Ghi Chú": "Xe kéo chuyên dụng sân đỗ",
      },
      {
        "STT": 2,
        "Biển Số Xe (*)": "72B-045.67",
        "Tên Thiết Bị / Xe (*)": "Xe thang hành khách 02",
        "Nhãn Hiệu": "TUG",
        "Ngày Bắt Đầu (DD/MM/YYYY)": "15/01/2026",
        "Tuần (W)": "",
        "1 Tháng (1M)": "x",
        "3 Tháng (3M)": "x",
        "6 Tháng (6M)": "x",
        "1 Năm (1Y)": "x",
        "2 Năm (2Y)": "",
        "Ghi Chú": "Xe thang số 2",
      },
      {
        "STT": 3,
        "Biển Số Xe (*)": "72C-089.12",
        "Tên Thiết Bị / Xe (*)": "Xe cứu hỏa sân bay 01",
        "Nhãn Hiệu": "Oshkosh",
        "Ngày Bắt Đầu (DD/MM/YYYY)": "01/02/2026",
        "Tuần (W)": "x",
        "1 Tháng (1M)": "x",
        "3 Tháng (3M)": "x",
        "6 Tháng (6M)": "x",
        "1 Năm (1Y)": "x",
        "2 Năm (2Y)": "x",
        "Ghi Chú": "Xe chữa cháy khẩn cấp",
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet["!cols"] = [
      { wch: 6 },  // STT
      { wch: 16 }, // Biển Số Xe
      { wch: 26 }, // Tên Thiết Bị
      { wch: 14 }, // Nhãn Hiệu
      { wch: 25 }, // Ngày Bắt Đầu
      { wch: 10 }, // Tuần
      { wch: 13 }, // 1 Tháng
      { wch: 13 }, // 3 Tháng
      { wch: 13 }, // 6 Tháng
      { wch: 12 }, // 1 Năm
      { wch: 12 }, // 2 Năm
      { wch: 28 }, // Ghi Chú
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ke_Hoach_Bao_Duong");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    saveAs(blob, "Mau_Ke_Hoach_Bao_Duong_Dinh_Ky.xlsx");
  };

  const handleUpload = async () => {
    if (fileList.length === 0) return;
    try {
      const fileObj = fileList[0];
      const file = fileObj.originFileObj || fileObj;
      const result = await importMaintenanceSchedule(file);
      setImportResult(result);
      setCurrentStep(2);
      onSuccess();
    } catch (error) {
      // Error handled in hook
    }
  };

  const steps = [
    {
      title: "Chọn File Excel",
      content: (
        <div>
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
                <div style={{ fontWeight: 600, color: "#166534", marginBottom: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  <FileExcelOutlined style={{ color: "#52c41a" }} />
                  Mẫu file kế hoạch bảo dưỡng định kỳ
                </div>
                <div style={{ fontSize: 13, color: "#4b5563" }}>
                  Tải mẫu Excel, điền Biển số xe và đánh dấu <b>'x'</b> vào các chu kỳ áp dụng.
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
                Tải File Mẫu (.xlsx)
              </Button>
            </div>
          </Card>

          <Dragger
            name="file"
            multiple={false}
            fileList={fileList}
            onRemove={() => setFileList([])}
            beforeUpload={(file) => {
              setFileList([file]);
              setCurrentStep(1);
              return false;
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
            <p className="ant-upload-text" style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>
              Kéo thả file Excel kế hoạch vào đây hoặc bấm để chọn file
            </p>
            <p className="ant-upload-hint" style={{ color: "#64748b" }}>
              Chỉ hỗ trợ định dạng Microsoft Excel (.xlsx, .xls)
            </p>
          </Dragger>
        </div>
      ),
    },
    {
      title: "Xác Nhận File",
      content: (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              background: "#f0f7ff",
              border: "1px solid #bae0ff",
              padding: "14px 20px",
              borderRadius: 10,
              marginBottom: 20,
            }}
          >
            <FileTextOutlined style={{ fontSize: 24, color: "#1677ff" }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontWeight: 600, color: "#002766" }}>
                {fileList[0]?.name}
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Kích thước: {((fileList[0]?.size || 0) / 1024).toFixed(1)} KB
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <Button
              style={{ borderRadius: 8 }}
              onClick={() => {
                setFileList([]);
                setCurrentStep(0);
              }}
              disabled={loading}
            >
              Chọn file khác
            </Button>
            <Button
              type="primary"
              onClick={handleUpload}
              loading={loading}
              icon={<UploadOutlined />}
              style={{
                borderRadius: 8,
                background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
                border: "none",
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(22, 119, 255, 0.25)",
              }}
            >
              Tiến Hành Import Kế Hoạch
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: "Kết Quả",
      content: (
        <Result
          status="success"
          title="Import kế hoạch hoàn tất!"
          subTitle={importResult?.message}
          extra={[
            <Button
              key="close"
              type="primary"
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
                setImportResult(null);
              }}
            >
              Hoàn Tất & Đóng
            </Button>,
          ]}
        >
          {importResult?.stats && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 16,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  background: "#f6ffed",
                  border: "1px solid #b7eb8f",
                  borderRadius: 8,
                  padding: "8px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: "#52c41a" }}>Thành công</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#389e0d" }}>
                  {importResult.stats.totalSuccess}
                </div>
              </div>

              <div
                style={{
                  background: "#fff1f0",
                  border: "1px solid #ffa39e",
                  borderRadius: 8,
                  padding: "8px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: "#ff4d4f" }}>Thất bại / Bỏ qua</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#cf1322" }}>
                  {importResult.stats.totalFailed}
                </div>
              </div>

              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  padding: "8px 16px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 12, color: "#64748b" }}>Tổng dòng xử lý</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a" }}>
                  {importResult.stats.total}
                </div>
              </div>
            </div>
          )}

          {importResult?.details && (
            <div style={{ maxHeight: "200px", overflow: "auto", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              <Table
                dataSource={importResult.details}
                columns={[
                  { title: "Thiết bị", dataIndex: "name", key: "name" },
                  {
                    title: "Trạng thái",
                    dataIndex: "status",
                    key: "status",
                    render: (t: string) => (
                      <Tag color={t === "success" ? "success" : "error"}>
                        {t === "success" ? "Thành công" : t}
                      </Tag>
                    ),
                  },
                ]}
                pagination={false}
                size="small"
                rowKey={(record: any, index?: number) => index?.toString() || record.name}
              />
            </div>
          )}
        </Result>
      ),
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, #52c41a 0%, #389e0d 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
              boxShadow: "0 2px 8px rgba(82, 196, 26, 0.3)",
            }}
          >
            <FileExcelOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0f172a" }}>
              Import Lịch Bảo Dưỡng Từ Excel
            </div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>
              Nhập cấu hình chu kỳ và ngày bắt đầu cho hàng loạt phương tiện
            </div>
          </div>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
      centered
      maskClosable={false}
    >
      <Divider style={{ margin: "14px 0" }} />
      <Steps current={currentStep} items={steps.map((item) => ({ title: item.title }))} style={{ marginBottom: 20 }} />
      <div>{steps[currentStep].content}</div>
    </Modal>
  );
};

export default MaintenanceImportModal;
