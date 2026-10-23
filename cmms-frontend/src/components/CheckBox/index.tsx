import React from "react";
import { Controller } from "react-hook-form";
import { StyledAntdCheckbox } from "./styles";

interface CheckBoxProps {
  control: any;
  name: string;
  label: React.ReactNode;
}

const CheckBox: React.FC<CheckBoxProps> = ({ control, name, label }) => {
  return (
    <Controller
      render={({ field }) => (
        <StyledAntdCheckbox
          checked={!!field.value}
          onChange={(e) => field.onChange(e.target.checked)}
          disabled={field?.disabled}
        >
          {label}
        </StyledAntdCheckbox>
      )}
      name={name}
      control={control}
    />
  );
};

export default CheckBox;
