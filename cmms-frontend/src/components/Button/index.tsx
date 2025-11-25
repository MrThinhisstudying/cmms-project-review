import { Button, ButtonProps, styled } from "@mui/material";

interface CustomButtonProps extends ButtonProps {
  padding?: string;
  bgrColor?: string;
}

export const CustomButton = styled(Button)<CustomButtonProps>(
  ({ padding, variant, bgrColor }) => {
    const mainColor = bgrColor || "#1976d2";
    const disabledBg = mainColor + "66";

    return {
      minWidth: "fit-content",
      padding: padding ?? "10px 16px",
      textTransform: "none",
      fontSize: "15px",
      borderRadius: "8px",
      fontWeight: 600,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      border: variant === "outlined" ? `1px solid ${mainColor}` : "none",
      backgroundColor: variant === "outlined" ? "transparent" : mainColor,
      color: variant === "outlined" ? mainColor : "#fff",

      "&:hover": {
        backgroundColor: variant === "outlined" ? `${mainColor}11` : mainColor,
        borderColor: variant === "outlined" ? mainColor : "none",
        boxShadow: "none",
      },

      "&:active": {
        boxShadow: "none",
      },

      "&:disabled": {
        backgroundColor: variant === "outlined" ? "transparent" : disabledBg,
        color: variant === "outlined" ? mainColor + "66" : "#fff",
        border: "none",
        opacity: 1,
        cursor: "default",
        boxShadow: "none",
      },
    };
  }
);
