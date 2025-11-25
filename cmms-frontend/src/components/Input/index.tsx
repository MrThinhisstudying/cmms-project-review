import { Box } from "@mui/material";
import React from "react";
import { Controller } from "react-hook-form";
import { CustomInput, CustomLabel } from "./styles";

interface InputProps {
  control: any;
  name: string;
  error: string;
  label: string;
  placeholder?: string;
  type?: string;
}

const Input: React.FC<InputProps> = ({
  control,
  error,
  name,
  label,
  placeholder,
  type,
}) => {
  return (
    <Controller
      render={({ field }) => (
        <Box>
          <CustomLabel htmlFor={name}>{label}</CustomLabel>
          <CustomInput
            id={name}
            error={!!error}
            variant="outlined"
            fullWidth
            helperText={error}
            margin="dense"
            placeholder={placeholder || "Enter"}
            onChange={field.onChange}
            value={field.value ?? ""}
            type={type}
          />
        </Box>
      )}
      name={name}
      control={control}
    />
  );
};

export default Input;
