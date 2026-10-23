import React from "react";
import { Modal as AntdModal } from "antd";
import { CustomButton } from "../Button";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  content,
  onClose,
  onConfirm,
}) => {
  return (
    <AntdModal
      open={open}
      title={title}
      onCancel={onClose}
      footer={[
        <CustomButton key="cancel" onClick={onClose} variant="outlined" padding="4px 12px">
          Hủy
        </CustomButton>,
        <CustomButton
          key="confirm"
          onClick={onConfirm}
          bgrColor="#d32f2f"
          variant="contained"
          padding="4px 12px"
          style={{ marginLeft: "8px" }}
        >
          Xác nhận
        </CustomButton>,
      ]}
      centered
    >
      <p style={{ margin: "16px 0", fontSize: "14px", color: "#475467" }}>{content}</p>
    </AntdModal>
  );
};

export default ConfirmModal;
