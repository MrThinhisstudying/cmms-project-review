import { Card, CardContent, CardContentProps, CardProps } from "@mui/material";
import { styled } from "@mui/material/styles";

export const CardContainer = styled(Card)<CardProps>({
  height: "100%",
  display: "flex",
  flexDirection: "column",
});

export const BoxContent = styled(CardContent)<CardContentProps>({
  flexGrow: 1,
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "16px !important",
  gap: "8px",
});
