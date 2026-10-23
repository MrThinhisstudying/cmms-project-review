import React, { useState } from "react";
import { Modal, Upload, Button, Steps, Result, Table, Typography, Card } from "antd";
import {
  InboxOutlined,
  UploadOutlined,
  DownloadOutlined,
  FileExcelOutlined,
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

  // Hàm xuất file Excel mẫu chuẩn cho người dùng
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

    // Định độ rộng cột trực quan
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
      setCurrentStep(2); // Success step
      onSuccess();
    } catch (error) {
      // Error is handled in hook
    }
  };

  const steps = [
    {
      title: "Chọn File",
      content: (
        <div>
          {/* Box Hướng dẫn & Tải mẫu */}
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
                <div style={{ fontWeight: 600, color: "#1890ff", marginBottom: 2 }}>
                  <FileExcelOutlined style={{ marginRight: 6 }} />
                  Mẫu file kế hoạch bảo dưỡng định kỳ
                </div>
                <div style={{ fontSize: 13, color: "#595959" }}>
                  Tải mẫu về máy, điền Biển số xe và đánh dấu <b>'x'</b> vào các chu kỳ bảo dưỡng (Tuần, 1T, 3T, 6T, 1N) áp dụng cho từng xe.
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
            onRemove={() => setFileList([])}
            beforeUpload={(file) => {
              setFileList([file]);
              setCurrentStep(1); // Move to review step
              return false;
            }}
            accept=".xlsx, .xls"
            style={{ padding: "20px" }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Kéo thả file hoặc click để tải lên</p>
            <p className="ant-upload-hint">Hỗ trợ định dạng .xlsx, .xls</p>
          </Dragger>
        </div>
      ),
    },
    {
      title: "Xác nhận",
      content: (
        <div style={{ textAlign: "center", padding: "20px" }}>
          <Text strong>File đã chọn:</Text> {fileList[0]?.name}
          <div style={{ marginTop: 20 }}>
            <Button
              type="primary"
              onClick={handleUpload}
              loading={loading}
              icon={<UploadOutlined />}
            >
              Tiến hành Import
            </Button>
            <Button
              style={{ marginLeft: 10 }}
              onClick={() => {
                setFileList([]);
                setCurrentStep(0);
              }}
              disabled={loading}
            >
              Chọn lại
            </Button>
          </div>
        </div>
      ),
    },
    {
      title: "Kết quả",
      content: (
        <Result
          status="success"
          title="Import hoàn tất!"
          subTitle={importResult?.message}
          extra={[
            <Button
              key="close"
              type="primary"
              onClick={() => {
                onClose();
                setCurrentStep(0);
                setFileList([]);
                setImportResult(null);
              }}
            >
              Đóng
            </Button>,
          ]}
        >
          {/* HIỂN THỊ THỐNG KÊ */}
          {importResult?.stats && (
             <div style={{ marginBottom: 16, textAlign: 'center' }}>
                <Text type="success" style={{ marginRight: 16 }}>
                    ✅ Thành công: <b>{importResult.stats.totalSuccess}</b>
                </Text>
                <Text type="danger">
                    ❌ Thất bại/Bỏ qua: <b>{importResult.stats.totalFailed}</b>
                </Text>
                <div style={{ marginTop: 8, color: '#888' }}>
                    Tổng số dòng xử lý: {importResult.stats.total}
                </div>
             </div>
          )}
          {importResult?.details && (
            <div style={{ maxHeight: "200px", overflow: "auto" }}>
              <Table
                dataSource={importResult.details}
                columns={[
                  { title: "Thiết bị", dataIndex: "name", key: "name" },
                  { title: "Trạng thái", dataIndex: "status", key: "status" },
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
      title="Import Lịch Bảo Dưỡng (Excel)"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Steps current={currentStep} items={steps.map(item => ({ title: item.title }))} />
      <div style={{ marginTop: "24px", border: "1px dashed #e9e9e9", padding: "16px" }}>
        {steps[currentStep].content}
      </div>
    </Modal>
  );
};

export default MaintenanceImportModal;
