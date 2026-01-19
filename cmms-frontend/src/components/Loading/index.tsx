import React from "react";
import { Spin } from "antd";

const Loading = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        flexDirection: "column",
        gap: "1rem"
      }}
    >
      <Spin size="large" tip="Đang tải..." />
    </div>
  );
};

export default Loading;
