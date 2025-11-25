import {
  InputLabel,
  InputLabelProps,
  TextField,
  TextFieldProps,
  styled,
} from "@mui/material";

export const CustomInput = styled(TextField)<TextFieldProps>(({ theme }) => ({
  "& .MuiInputBase-root": {
    borderRadius: "8px",
  },
  "& input": {
    border: "1px solid #D0D5DD",
    borderRadius: "8px",
    padding: "10px 14px",
    "&::placeholder": {
      color: "#98A2B3",
    },
  },
  "& .MuiFormHelperText-root": {
    marginLeft: 0,
    color: "var(--Error-700, #B42318)",
    position: "absolute",
    bottom: "-20px",
    left: "0",
  },
  "& .MuiOutlinedInput-root": {
    "&.Mui-focused fieldset": {
      border: "2px solid #115eaf",
    },
  },
  "&.Mui-error .MuiFormHelperText-root": {
    visibility: "visible",
    opacity: 1,
  },
}));

export const CustomLabel = styled(InputLabel)<InputLabelProps>(({ theme }) => ({
  color: "#344054",
  fontWeight: 500,
  fontSize: 14,
}));
