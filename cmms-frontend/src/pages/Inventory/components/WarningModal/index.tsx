import React from "react";
import { Modal as AntdModal } from "antd";
import { CustomButton } from "../../../../components/Button";

export default function WarningModal({ open, handleClose, title }: any) {
  return (
    <AntdModal
      open={open}
      onCancel={handleClose}
      title="Cảnh báo"
      footer={[
        <CustomButton key="confirm" onClick={handleClose} variant="contained" bgrColor="#1890ff">
          Xác nhận
        </CustomButton>,
      ]}
      centered
    >
      <p style={{ margin: "16px 0", fontSize: 14, color: "#475467" }}>{title}</p>
    </AntdModal>
  );
}
