import React from "react";
import { Controller } from "react-hook-form";
import {
  CustomInputContainer,
  CustomLabel,
  StyledAntdInput,
  StyledAntdPasswordInput,
  HelperText,
} from "./styles";

interface InputProps {
  control: any;
  name: string;
  error?: string;
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
  type = "text",
}) => {
  return (
    <Controller
      render={({ field }) => (
        <CustomInputContainer>
          <CustomLabel htmlFor={name}>{label}</CustomLabel>
          {type === "password" ? (
            <StyledAntdPasswordInput
              id={name}
              $hasError={!!error}
              placeholder={placeholder || "Enter"}
              onChange={field.onChange}
              value={field.value ?? ""}
            />
          ) : (
            <StyledAntdInput
              id={name}
              $hasError={!!error}
              placeholder={placeholder || "Enter"}
              onChange={field.onChange}
              value={field.value ?? ""}
              type={type}
            />
          )}
          {error && <HelperText>{error}</HelperText>}
        </CustomInputContainer>
      )}
      name={name}
      control={control}
    />
  );
};

export default Input;
