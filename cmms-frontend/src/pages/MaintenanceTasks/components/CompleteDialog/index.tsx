import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
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
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Hoàn tất phiếu bảo dưỡng</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Mô tả công việc đã thực hiện *"
          multiline
          minRows={4}
          fullWidth
          value={review}
          onChange={(e) => setReview(e.target.value)}
          error={!!error}
          helperText={
            error || "Ví dụ: thay dầu, vệ sinh lọc, siết ốc, thay bạc đạn..."
          }
          sx={{ mt: 1 }}
        />
      </DialogContent>
      <DialogActions>
        <CustomButton
          variant="outlined"
          sx={{ height: "40px" }}
          onClick={onClose}
        >
          Hủy
        </CustomButton>
        <CustomButton
          variant="contained"
          sx={{ height: "40px" }}
          onClick={handleSave}
        >
          Xác nhận hoàn tất
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}
