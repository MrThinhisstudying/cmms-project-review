import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  TabPanel: { width: "100%" },
  Header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 24px 0 24px",
  },
  Dashboard: { flexGrow: 1, overflow: "auto", height: "100%" },
  Action: { display: "flex", alignItems: "flex-start", gap: "8px" },
}));

export { useStyles };
