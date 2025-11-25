import { Box, BoxProps, Button, ButtonProps } from "@mui/material";
import { styled } from "@mui/material/styles";

export const ButtonCustom = styled(Button)<ButtonProps>(({ theme }) => ({
  width: "max-content",
  display: "flex",
  padding: "8px 10px",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  borderRadius: "8px",
  background: "var(--Base-White, #FFF)",
  boxShadow: "0px 1px 2px 0px rgba(16, 24, 40, 0.05)",
  "&:hover": { backgroundColor: "var(--Base-White, #FFF)" },

  [theme.breakpoints.down("sm")]: {
    padding: "6px 8px",
    borderRadius: "6px",
    minWidth: "32px",
  },
}));

export const BoxPage = styled(Box)<BoxProps>(({ theme }) => ({
  width: "max-content",
  display: "flex",
  padding: "8px",
  justifyContent: "center",
  alignItems: "center",
  gap: "8px",
  borderRadius: "8px",
  background: "var(--Base-White, #FFF)",
  "&:hover": { backgroundColor: "var(--Base-White, #FFF)" },
}));

export const BoxButton = styled(Box)<BoxProps>(({ theme }) => ({
  display: "flex",
  padding: "12px 16px 8px 16px",
  gap: "8px",
  justifyContent: "space-between",
  alignItems: "center",
  alignSelf: "stretch",
  borderTop: "1px solid var(--Gray-200, #EAECF0)",
  width: "100%",
}));
