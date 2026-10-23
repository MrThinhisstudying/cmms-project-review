import React, { useEffect } from "react";
import { notification } from "antd";

const Toast: React.FC<{
  open: boolean;
  onClose: () => void;
  variant: "success" | "error" | "info";
  content: string;
  vertical?: "top" | "bottom";
  horizontal?: "center" | "left" | "right";
  duration?: number;
}> = ({ open, onClose, variant, content, vertical = "top", horizontal = "center", duration }) => {
  const [api, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (open && content) {
      const placement = `${vertical === "bottom" ? "bottom" : "top"}${
        horizontal === "left" ? "Left" : horizontal === "right" ? "Right" : "Right"
      }` as const;

      const titleText = variant === "error" ? "Lỗi" : variant === "success" ? "Thành công" : "Thông báo";

      api[variant]({
        title: titleText,
        message: titleText,
        description: content,
        duration: (duration || 3000) / 1000,
        placement,
        onClose,
      });
    }
  }, [open, content, variant, vertical, horizontal, duration, api, onClose]);

  return <>{contextHolder}</>;
};

export default Toast;
