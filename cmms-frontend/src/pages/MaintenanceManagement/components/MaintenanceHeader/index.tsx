import React from "react";
import { Box, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { CustomButton } from "../../../../components/Button";

type Props = { onAdd: () => void };

export default function MaintenanceHeader({ onAdd }: Props) {
  return (
    <Box
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      pb={2}
    >
      <Typography variant="h6">Lập lịch bảo dưỡng</Typography>
      <CustomButton
        variant="contained"
        sx={{ height: "40px" }}
        startIcon={<AddIcon />}
        onClick={onAdd}
      >
        Thêm mới
      </CustomButton>
    </Box>
  );
}
