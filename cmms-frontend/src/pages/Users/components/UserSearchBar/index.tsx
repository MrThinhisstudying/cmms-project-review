import React, { useState, useMemo, useEffect } from "react";
import {
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import _ from "lodash";
import { CustomButton } from "../../../../components/Button";
import { IDepartment } from "../../../../types/user.types";

interface UserSearchBarProps {
  search: string;
  onChange: (name: string) => void;
  departments: IDepartment[];
  selectedDept: number | "";
  onChangeDept: (deptId: number | "") => void;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({
  search,
  onChange,
  departments,
  selectedDept,
  onChangeDept,
}) => {
  const [inputValue, setInputValue] = useState(search);

  const debouncedOnChange = useMemo(
    () => _.debounce((value: string) => onChange(value), 1500),
    [onChange]
  );

  useEffect(() => {
    if (search !== inputValue) {
      setInputValue(search);
    }
  }, [search]);

  useEffect(() => {
    if (inputValue !== search) {
      debouncedOnChange(inputValue);
    }
    return () => {
      debouncedOnChange.cancel();
    };
  }, [inputValue, search, debouncedOnChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleClearSearch = () => {
    setInputValue("");
    onChange("");
    debouncedOnChange.cancel();
  };

  return (
    <Box
      display="flex"
      justifyContent="space-between"
      gap="12px"
      paddingBottom="16px"
    >
      <TextField
        label="Tìm kiếm người dùng"
        variant="outlined"
        size="small"
        fullWidth
        value={inputValue}
        onChange={handleInputChange}
      />
      <TextField
        select
        size="small"
        label="Phòng ban"
        value={selectedDept}
        onChange={(e) => onChangeDept(e.target.value as number | "")}
        sx={{ minWidth: 200 }}
        SelectProps={{
          displayEmpty: true,
          renderValue: (value) => {
            if (value === "") {
              return "Tất cả";
            }
            const dept = departments.find((d) => d.dept_id === value);
            return dept ? dept.name : "";
          },
        }}
        InputLabelProps={{ shrink: true }}
      >
        <MenuItem value="">Tất cả</MenuItem>
        {departments.map((dept) => (
          <MenuItem key={dept.dept_id} value={dept.dept_id}>
            {dept.name}
          </MenuItem>
        ))}
      </TextField>
      <CustomButton
        variant="contained"
        startIcon={<DeleteIcon />}
        bgrColor="#d32f2f"
        sx={{ whiteSpace: "nowrap", height: "40px" }}
        onClick={handleClearSearch}
      >
        Xóa
      </CustomButton>
    </Box>
  );
};

export default UserSearchBar;
