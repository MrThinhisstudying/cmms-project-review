import React, { useState } from "react";
import {
  Typography,
  Box,
  IconButton,
  Badge,
  Menu,
  MenuItem,
  ListItemText,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuthContext } from "../../../context/AuthContext/AuthContext";
import LOGO_ACV from "../../../assets/images/acv-logo.png";
import { AppBarContainer, ToolbarContainer } from "./style";
import { useNotificationContext } from "../../../context/NotificationContext/NotificationContext";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { INotification } from "../../../types/index.types";

interface TopBarProps {
  onMenuClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onMenuClick }) => {
  const { user } = useAuthContext();
  const { notifications, unreadCount, readAll } = useNotificationContext();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleReadAll = () => {
    readAll();
    handleClose();
  };

  return (
    <AppBarContainer>
      <ToolbarContainer>
        <Box display="flex" alignItems="center" gap={2}>
          {onMenuClick && (
            <IconButton
              edge="start"
              onClick={onMenuClick}
              sx={{ display: { xs: "inline-flex", md: "none" } }}
            >
              <MenuIcon sx={{ color: "#000" }} />
            </IconButton>
          )}
          <img
            src={LOGO_ACV}
            style={{ height: "60px", width: "220px" }}
            alt="LOGO_ACV"
          />
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          {user?.avatar ? (
            <img
              src={user.avatar}
              alt="User Avatar"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Typography variant="h6" color="textPrimary">
              {user?.name}
            </Typography>
          )}
          <IconButton
            onClick={handleOpen}
            sx={{
              backgroundColor: "#f0f0f0",
              "&:hover": { backgroundColor: "#e0e0e0" },
            }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon sx={{ color: "#000" }} />
            </Badge>
          </IconButton>
          <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
            {notifications.length === 0 ? (
              <MenuItem>
                <ListItemText primary="Không có thông báo" />
              </MenuItem>
            ) : (
              <>
                {notifications.map((n: INotification, idx: number) => (
                  <MenuItem key={n.id ?? idx}>
                    <ListItemText
                      primary={n.message}
                      secondary={new Date(n.created_at).toLocaleString()}
                    />
                  </MenuItem>
                ))}
                <MenuItem onClick={handleReadAll}>
                  <ListItemText
                    primary="Đánh dấu đã đọc tất cả"
                    sx={{ textAlign: "center" }}
                  />
                </MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </ToolbarContainer>
    </AppBarContainer>
  );
};

export default TopBar;
