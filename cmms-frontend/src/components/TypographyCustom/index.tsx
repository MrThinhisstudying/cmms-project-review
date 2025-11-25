import { Typography, TypographyProps } from "@mui/material";
import { styled } from "@mui/material/styles";

interface TypographyCustomProps extends TypographyProps {
  customcolor?: string;
}

export const TypographyCustom = styled(Typography, {
  shouldForwardProp: (prop) => prop !== "customcolor",
})<TypographyCustomProps>(({ theme, customcolor }) => ({
  fontWeight: 500,
  color: customcolor || "inherit",
  fontSize: "16px",
  lineHeight: "20px",

  [theme.breakpoints.down("lg")]: {
    fontSize: "14px",
    lineHeight: "18px",
  },

  [theme.breakpoints.down("sm")]: {
    fontSize: "12px",
    lineHeight: "16px",
  },
}));
