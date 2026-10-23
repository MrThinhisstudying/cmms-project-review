import React, { useState, useMemo, useEffect } from "react";
import { Input as AntdInput, Select as AntdSelect } from "antd";
import { ClearOutlined } from "@ant-design/icons";
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
    () => _.debounce((value: string) => onChange(value), 500),
    [onChange]
  );

  useEffect(() => {
    setInputValue(search);
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
    onChangeDept("");
    debouncedOnChange.cancel();
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        paddingBottom: "16px",
        alignItems: "center",
      }}
    >
      <AntdInput
        placeholder="Tìm kiếm người dùng..."
        size="large"
        value={inputValue}
        onChange={handleInputChange}
        style={{ flex: 1, borderRadius: 8 }}
      />
      <AntdSelect
        size="large"
        placeholder="Phòng ban"
        value={selectedDept === "" ? undefined : selectedDept}
        onChange={(val) => onChangeDept(val ?? "")}
        style={{ minWidth: 200 }}
        allowClear
      >
        <AntdSelect.Option value="">Tất cả</AntdSelect.Option>
        {departments.map((dept) => (
          <AntdSelect.Option key={dept.dept_id} value={dept.dept_id}>
            {dept.name}
          </AntdSelect.Option>
        ))}
      </AntdSelect>
      <CustomButton
        variant="contained"
        startIcon={<ClearOutlined />}
        bgrColor="#d32f2f"
        onClick={handleClearSearch}
      >
        Xóa
      </CustomButton>
    </div>
  );
};

export default UserSearchBar;
