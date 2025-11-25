import React, { useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import Toast from "../../components/Toast";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import StockOutDetailDrawer from "./components/StockOutDetailDrawer";
import StockOutsTable from "./components/StockOutsTable";
import Pagination from "../../components/Pagination/Pagination";
import { IStockOut } from "../../types/inventory.types";

export default function StockOutsPage() {
  const { stockOuts, loading } = useInventoryContext();
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 10;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [openToast, setOpenToast] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    content: string;
  }>({
    type: "success",
    content: "",
  });

  const handlePageChange = (p: number) => setPage(p);

  return (
    <>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6">Quản lý yêu cầu xuất kho</Typography>
          </Box>
        </Grid>

        <Grid
          item
          xs={12}
          sx={{
            height: "calc(100vh - 170px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <StockOutsTable
              data={stockOuts}
              loading={loading}
              rowsPerPage={rowsPerPage}
              page={page}
              onDetail={(so: IStockOut) => {
                setDetailId(so.id ?? undefined);
                setDetailOpen(true);
              }}
              onError={(msg) => {
                setToast({ type: "error", content: msg });
                setOpenToast(true);
              }}
              onSuccess={(msg) => {
                setToast({ type: "success", content: msg });
                setOpenToast(true);
              }}
            />
          </Box>

          <Pagination
            data={stockOuts}
            rowsPerPage={rowsPerPage}
            onPageChange={handlePageChange}
            page={page}
          />
        </Grid>
      </Grid>

      <StockOutDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        stockOutId={detailId ?? undefined}
      />

      <Toast
        content={toast.content}
        variant={toast.type}
        open={openToast}
        onClose={() => setOpenToast(false)}
      />
    </>
  );
}
