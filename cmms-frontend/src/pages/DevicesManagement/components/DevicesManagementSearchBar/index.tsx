import React from "react";
import { Input as AntdInput } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { CustomButton } from "../../../../components/Button";

interface DevicesManagementSearchBarProps {
  search: string;
  setSearch: (search: string) => void;
  handleClearFilterData: () => void;
}

const DevicesManagementSearchBar: React.FC<DevicesManagementSearchBarProps> = ({
  search,
  setSearch,
  handleClearFilterData,
}) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        paddingBottom: "16px",
      }}
    >
      <AntdInput
        placeholder="Tìm kiếm thiết bị..."
        size="large"
        style={{ flex: 1, borderRadius: 8 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <CustomButton
        variant="contained"
        startIcon={<ReloadOutlined />}
        bgrColor="#d32f2f"
        onClick={handleClearFilterData}
      >
        Làm mới
      </CustomButton>
    </div>
  );
};

export default DevicesManagementSearchBar;
