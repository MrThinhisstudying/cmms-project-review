import {
  Box,
  BoxProps,
  Button,
  ButtonProps,
  IconButton,
  styled,
} from "@mui/material";

export const ButtonUpload = styled(Button)<ButtonProps>(({ theme }) => ({
  width: "100px",
  height: "100px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  borderRadius: "8px",
  border: "1px dashed #D0D5DD",
  background: "#FFF",
}));

export const BoxImage = styled(Box)<BoxProps>(({ theme }) => ({
  position: "relative",
  width: "max-content",
}));

export const IconButtonContainer = styled(IconButton)(({ theme }) => ({
  position: "absolute",
  top: "-8px",
  padding: "8px",
  right: "-8px",
  color: "#fff",
  backgroundColor: "rgba(0, 0, 0, 0.7)",
  "&:hover": {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
}));
