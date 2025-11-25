import { Checkbox, FormControlLabel } from '@mui/material';
import React from 'react';
import { Controller } from 'react-hook-form';
import { CustomCheckedIcon, CustomIcon } from './styles';

interface CheckBoxProps {
  control: any;
  name: string;
  label: React.ReactNode;
}

const CheckBox: React.FC<CheckBoxProps> = ({ control, name, label }) => {
  return (
    <Controller
      render={({ field }) => (
        <FormControlLabel
          control={
            <Checkbox icon={<CustomIcon />} checkedIcon={<CustomCheckedIcon />} value={field.value} onChange={field.onChange} disabled={field?.disabled} name={name} />
          }
          label={label}
        />
      )}
      name={name}
      control={control}
    />
  );
};

export default CheckBox;
