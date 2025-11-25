import { styled } from "@mui/material/styles";
import { SvgIcon, SvgIconProps } from "@mui/material";

export const IconCustom = styled(SvgIcon)<SvgIconProps>(({ theme }) => ({
  fontSize: "20px",
  [theme.breakpoints.down("lg")]: {
    fontSize: "16px",
  },
  [theme.breakpoints.down("sm")]: {
    fontSize: "14px",
  },
}));
