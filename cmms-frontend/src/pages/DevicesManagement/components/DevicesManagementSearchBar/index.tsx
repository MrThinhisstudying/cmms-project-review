import React from "react";
import { TextField, Box } from "@mui/material";
import AutorenewIcon from "@mui/icons-material/Autorenew";
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
    <Box
      display="flex"
      alignItems="center"
      gap="12px"
      paddingBottom="16px"
      flexWrap="nowrap"
    >
      <TextField
        label="Tìm kiếm người dùng"
        variant="outlined"
        size="small"
        sx={{ flexGrow: 1 }}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <CustomButton
        variant="contained"
        startIcon={<AutorenewIcon />}
        bgrColor="#d32f2f"
        sx={{ whiteSpace: "nowrap", height: "40px" }}
        onClick={handleClearFilterData}
      >
        Làm mới
      </CustomButton>
    </Box>
  );
};

export default DevicesManagementSearchBar;
