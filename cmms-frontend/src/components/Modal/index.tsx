import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
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
    <Dialog
      open={open}
      onClose={onClose}
      BackdropProps={{
        style: { backgroundColor: "rgba(0, 0, 0, 0.1)" },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{content}</DialogContent>
      <DialogActions>
        <CustomButton onClick={onClose} variant="outlined" padding="4px 12px">
          Hủy
        </CustomButton>
        <CustomButton
          onClick={onConfirm}
          bgrColor="#d32f2f"
          variant="contained"
          padding="4px 12px"
        >
          Xác nhận
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmModal;
