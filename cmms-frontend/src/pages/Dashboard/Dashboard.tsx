import React from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
} from "@mui/material";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { dashboardMenuItems } from "../../constants/menu";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { user } = useAuthContext();

  const allowedMenus = dashboardMenuItems.filter((item) =>
    item.roles.includes(user?.role || "guest")
  );

  function getRandomColor() {
    const colors = [
      "#6c5ce7",
      "#00b894",
      "#e17055",
      "#0984e3",
      "#c77dff",
      "#f39c12",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      height="calc(100vh - 130px)"
      sx={{ overflow: "hidden" }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          py: 6,
          px: { xs: 2, md: 6 },
          bgcolor: "#f9f9ff",
        }}
      >
        <Typography
          variant="h4"
          textAlign="center"
          gutterBottom
          sx={{ fontWeight: "bold", color: "#6512c2" }}
        >
          Phần mềm Quản lý Thiết bị (EMS)
        </Typography>
        <Typography
          variant="subtitle1"
          textAlign="center"
          sx={{ mb: 4, color: "text.secondary" }}
        >
          Hệ thống hiện đại giúp quản lý, bảo trì, và tối ưu hóa thiết bị tại
          sân bay
        </Typography>

        <Grid container spacing={4} justifyContent="center">
          {allowedMenus.map((item, idx) => (
            <Grid item xs={12} md={5} key={idx}>
              <Card
                sx={{
                  height: "100%",
                  borderRadius: 3,
                  boxShadow: 6,
                  transition: "0.3s",
                  "&:hover": { transform: "translateY(-8px)" },
                  borderTop: `6px solid ${getRandomColor()}`,
                  background: "#fff",
                }}
              >
                <CardContent sx={{ textAlign: "center", p: 4 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ fontWeight: "bold", color: item.color }}
                  >
                    {item.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ mb: 2, color: "text.secondary" }}
                  >
                    {item.description}
                  </Typography>
                  <Button
                    component={Link}
                    to={item.path}
                    variant="contained"
                    sx={{
                      bgcolor: item.color,
                      "&:hover": { opacity: 0.9 },
                    }}
                  >
                    Truy cập
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default Dashboard;
