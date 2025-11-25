import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import { useStyles } from "./styles";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import ListItems from "./components/ListItems";
import ManageCategoryModal from "./components/ManageCategoryModal";
import AddItemDrawer from "./components/AddItemDrawer";
import Toast from "../../components/Toast";
import TabHeader from "../../components/TabHeader/TabHeader";
import { CustomButton } from "../../components/Button";
import { getToken } from "../../utils/auth";
import { uploadInventory } from "../../apis/inventory";
import { exportInventoryToExcel } from "../../utils";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import { IInventoryTab, IItem } from "../../types/inventory.types";
import Pagination from "../../components/Pagination/Pagination";

export function InventoryManagementPage() {
  const classes = useStyles();
  const { categories, items, loading, refreshAll, tabs } =
    useInventoryContext();
  const { user } = useAuthContext();
  const [value, setValue] = useState(0);
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 24;
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [editData, setEditData] = useState<IItem | null>(null);
  const [openToast, setOpenToast] = useState(false);
  const [toast, setToast] = useState<{
    type: "error" | "success";
    content: string;
  }>({ type: "success", content: "" });

  const toggleDrawer = (open: boolean, data: IItem | null) => {
    setEditData(data);
    setOpenDrawer(open);
  };

  useEffect(() => {
    setPage(1);
  }, [value]);

  const handleDownload = () => {
    try {
      exportInventoryToExcel(items);
      setToast({
        content:
          items.length === 0
            ? "Đã tải file mẫu vật tư thành công"
            : "Xuất danh sách vật tư thành công",
        type: "success",
      });
      setOpenToast(true);
    } catch (error) {
      setToast({
        content: "Xuất dữ liệu thất bại",
        type: "error",
      });
      setOpenToast(true);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const token = getToken();
      const res = await uploadInventory(token, file);
      setToast({
        content: res.message || "Nhập vật tư thành công",
        type: "success",
      });
      await refreshAll();
    } catch (err: any) {
      setToast({
        content: err.message || "Nhập vật tư thất bại",
        type: "error",
      });
    } finally {
      e.target.value = "";
      setOpenToast(true);
    }
  };

  return (
    <Box component="main" className={classes.Dashboard}>
      <Box className={classes.Header}>
        <Typography fontSize={24} fontWeight={500} lineHeight={"32px"}>
          Quản lý vật tư
        </Typography>
        <Box className={classes.Action}>
          {user?.role === "admin" && (
            <>
              <Box position="relative">
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleUpload}
                  style={{
                    position: "absolute",
                    width: "100%",
                    height: "100%",
                    opacity: 0,
                    cursor: "pointer",
                    zIndex: 2,
                  }}
                />
                <CustomButton
                  variant="contained"
                  startIcon={<UploadIcon />}
                  sx={{ height: "40px" }}
                  component="span"
                >
                  Tải tệp
                </CustomButton>
              </Box>
              <CustomButton
                variant="contained"
                startIcon={<DownloadIcon />}
                sx={{ height: "40px" }}
                onClick={handleDownload}
              >
                Xuất dữ liệu
              </CustomButton>
              <CustomButton
                variant="contained"
                id="manage_category"
                onClick={() => setOpenCategoryModal(true)}
                sx={{ height: "40px" }}
              >
                Quản lý Danh mục
              </CustomButton>
              <CustomButton
                variant="contained"
                id="add_new_item"
                onClick={() => toggleDrawer(true, null)}
                startIcon={<AddIcon sx={{ color: "#fff" }} />}
                sx={{ height: "40px" }}
              >
                Thêm mới vật tư
              </CustomButton>
            </>
          )}
        </Box>
      </Box>

      <Box className={classes.TabPanel}>
        <TabHeader
          tabs={tabs}
          handleChange={(v: number) => setValue(v)}
          value={value}
        />
        {tabs.map((tab: IInventoryTab) => (
          <Box
            role="tabpanel"
            hidden={value !== tab.id}
            id={`tab-${tab.id}`}
            aria-labelledby={`tab-${tab.id}`}
            key={tab.id}
          >
            {value === tab.id && (
              <>
                <ListItems
                  result={tab.data.slice(
                    (page - 1) * rowsPerPage,
                    (page - 1) * rowsPerPage + rowsPerPage
                  )}
                  loading={loading}
                  toggleDrawer={toggleDrawer}
                  refreshAll={refreshAll}
                />
                {tab.data && tab.data.length > rowsPerPage && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "center",
                      mt: 2,
                      width: "100%",
                    }}
                  >
                    <Pagination
                      data={tab.data}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={(p: number) => setPage(p)}
                    />
                  </Box>
                )}
              </>
            )}
          </Box>
        ))}
      </Box>

      <ManageCategoryModal
        open={openCategoryModal}
        handleClose={() => {
          setOpenCategoryModal(false);
          refreshAll();
          setToast({
            type: "success",
            content: "Cập nhật danh mục thành công",
          });
          setOpenToast(true);
        }}
        categories={categories}
      />

      <AddItemDrawer
        openDrawer={openDrawer}
        toggleDrawer={toggleDrawer}
        data={editData}
        categories={categories}
        onSaved={(payload?: any) => {
          setOpenDrawer(false);
          refreshAll();
          setToast({
            type: "success",
            content: payload?.message ?? "Lưu thành công",
          });
          setOpenToast(true);
        }}
        onError={(payload?: any) => {
          setToast({
            type: "error",
            content: payload?.message ?? "Có lỗi xảy ra",
          });
          setOpenToast(true);
        }}
      />

      <Toast
        content={toast.content}
        variant={toast.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </Box>
  );
}
