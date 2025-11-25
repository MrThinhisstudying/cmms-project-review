import React from "react";
import { Box, Typography } from "@mui/material";
import { useStyles } from "./styles";
import { CustomTabProps } from "../../types/index.types";

function CustomTab(props: CustomTabProps) {
  const isActive = props.id === props.value;
  const classes = useStyles();

  return (
    <Box
      sx={{ bgcolor: isActive ? "rgba(242, 251, 243, 1)" : "none" }}
      className={classes.Box}
    >
      <Typography
        sx={{
          color: isActive
            ? "var(--Primary-700, #296C32)"
            : "var(--Gray-500, #667085)",
        }}
        fontSize={16}
        fontWeight={600}
        lineHeight={"24px"}
      >
        {props.label}
      </Typography>
      {props.id !== 0 && (
        <Box className={classes.BoxCustomTab}>
          <Typography
            fontWeight={500}
            textAlign={"center"}
            fontSize={14}
            lineHeight={"20px"}
          >
            {props.total}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default CustomTab;
