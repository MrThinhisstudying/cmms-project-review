import React from "react";
import { Dialog, Box, Typography } from "@mui/material";
import { CustomButton } from "../../../../components/Button";

export default function WarningModal({ open, handleClose, title }: any) {
  return (
    <Dialog open={open} onClose={handleClose}>
      <Box sx={{ width: 400, p: 3 }}>
        <Typography fontSize={18} fontWeight={600}>
          Warning
        </Typography>
        <Typography sx={{ mt: 2 }}>{title}</Typography>
        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
          <CustomButton
            id="confirm_button"
            fullWidth={false}
            title="Confirm"
            onClick={handleClose}
            sx={{ height: "40px" }}
          />
        </Box>
      </Box>
    </Dialog>
  );
}
