import React from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Loader from "../Loader";
import ItemCard from "../ItemCard";
import { Typography } from "@mui/material";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";

export default function ListItems({
  result,
  loading,
  toggleDrawer,
  refreshAll,
}: any) {
  if (loading) return <Loader />;

  if (!result || result.length === 0)
    return (
      <Box
        sx={{
          p: 6,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          color: "text.secondary",
        }}
      >
        <InventoryOutlinedIcon
          sx={{ fontSize: 80, color: "grey.400", mb: 2 }}
        />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Không có vật tư nào
        </Typography>
        <Typography variant="body2" sx={{ mb: 3, color: "text.disabled" }}>
          Hãy thử thêm vật tư mới hoặc làm mới danh sách.
        </Typography>
      </Box>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={{ xs: 2, md: 3 }}>
        {result.map((item: any, index: number) => (
          <Grid item xs={12} sm={12} md={6} lg={3} key={index}>
            <ItemCard
              item={item}
              toggleDrawer={toggleDrawer}
              refreshAll={refreshAll}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
