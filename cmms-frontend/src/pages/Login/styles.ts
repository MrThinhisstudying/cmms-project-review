import { Box, BoxProps, styled } from "@mui/material";
import AIRPORT_BG from "../../assets/images/airport-bg.jpg";

export const LoginContainer = styled(Box)<BoxProps>(({ theme }) => ({
  width: "100%",
  height: "100dvh",
  display: "flex",
  flexDirection: "column",
  margin: "auto",
  alignItems: "center",
  backgroundImage: `url(${AIRPORT_BG})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
}));

export const LoginFormContainer = styled("form")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  gap: "16px",
}));

export const ForgotPasswordFormContainer = styled("form")(({ theme }) => ({
  maxWidth: "320px",
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "24px 16px 16px 16px",
  position: "relative",
}));
