import React from "react";
import "./App.css";
import { ConfigProvider } from "antd";
import { useAuthContext } from "./context/AuthContext/AuthContext";
import { AppRoutes } from "./routes";
import Loading from "./components/Loading";

function App() {
  const { loading } = useAuthContext();

  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      <ConfigProvider
        theme={{
          token: {
            borderRadius: 8,
            fontFamily: "Inter, Helvetica, 'sans-serif'",
            colorPrimary: "#1890ff",
          },
        }}
      >
        <React.Suspense fallback={<Loading />}>
          {!loading ? <AppRoutes /> : <Loading />}
        </React.Suspense>
      </ConfigProvider>
    </div>
  );
}

export default App;
