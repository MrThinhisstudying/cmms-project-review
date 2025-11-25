import React from "react";
import "./App.css";
import { ThemeProvider, createTheme } from "@mui/material";
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
        <React.Suspense fallback={<Loading />}>
          {!loading ? <AppRoutes /> : <Loading />}
        </React.Suspense>
      </ThemeProvider>
    </div>
  );
}

export default App;
