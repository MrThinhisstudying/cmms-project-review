import React from "react";
import "./App.css";
import { ThemeProvider, createTheme } from "@mui/material";
import { ConfigProvider } from "antd";
import { useAuthContext } from "./context/AuthContext/AuthContext";
import { AppRoutes } from "./routes";
import Loading from "./components/Loading";

const theme = createTheme({
  typography: {
    fontFamily: "Inter, Helvetica, 'sans-serif'",
  },
});

function App() {
  const { loading } = useAuthContext();

  return (
    <div style={{ position: "relative", zIndex: 10 }}>
      <ThemeProvider theme={theme}>
        <ConfigProvider
          theme={{
            token: {
              borderRadius: 8,
              fontFamily: "Inter, Helvetica, 'sans-serif'",
              // Ensure primary color matches if needed, default basic blue is fine based on request
            },
          }}
        >
          <React.Suspense fallback={<Loading />}>
            {!loading ? <AppRoutes /> : <Loading />}
          </React.Suspense>
        </ConfigProvider>
      </ThemeProvider>
    </div>
  );
}

export default App;
