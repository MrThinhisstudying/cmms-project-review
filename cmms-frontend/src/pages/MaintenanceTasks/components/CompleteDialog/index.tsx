import React, { useState } from "react";
import { Modal as AntdModal, Input as AntdInput } from "antd";
import { CustomButton } from "../../../../components/Button";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (review: string) => Promise<void> | void;
};

export default function CompleteDialog({ open, onClose, onSubmit }: Props) {
  const [review, setReview] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!review.trim()) {
      setError("Vui lòng mô tả những việc đã làm/thay thế.");
      return;
    }
    setError("");
    await onSubmit(review.trim());
  };

  return (
    <AntdModal
      open={open}
      onCancel={onClose}
      title="Hoàn tất phiếu bảo dưỡng"
      footer={[
        <CustomButton key="cancel" variant="outlined" onClick={onClose}>
          Hủy
        </CustomButton>,
        <CustomButton key="confirm" variant="contained" bgrColor="#1890ff" onClick={handleSave}>
          Xác nhận hoàn tất
        </CustomButton>,
      ]}
      centered
    >
      <div style={{ marginTop: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 500 }}>
          Mô tả công việc đã thực hiện *
        </label>
        <AntdInput.TextArea
          rows={4}
          placeholder="Ví dụ: thay dầu, vệ sinh lọc, siết ốc, thay bạc đạn..."
          value={review}
          onChange={(e) => setReview(e.target.value)}
          status={error ? "error" : ""}
        />
        <span style={{ color: error ? "#B42318" : "#667085", fontSize: 12, marginTop: 4, display: "block" }}>
          {error || "Ví dụ: thay dầu, vệ sinh lọc, siết ốc, thay bạc đạn..."}
        </span>
      </div>
    </AntdModal>
  );
}
