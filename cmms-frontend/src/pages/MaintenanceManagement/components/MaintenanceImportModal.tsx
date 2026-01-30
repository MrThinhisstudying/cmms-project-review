import React, { useState } from "react";
import { Modal, Upload, Button, Steps, Result, Table, Typography } from "antd";
import { InboxOutlined, UploadOutlined } from "@ant-design/icons";
import { useMaintenance } from "../../../hooks/useMaintenance";

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
