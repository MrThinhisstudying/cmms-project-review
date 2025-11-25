import { styled } from "@mui/material/styles";
import {
  Dialog,
  DialogContent,
  DialogContentProps,
  DialogProps,
  DialogTitle,
  DialogTitleProps,
} from "@mui/material";

export const DialogContainer = styled(Dialog)<DialogProps>({
  "& .MuiPaper-root": {
    width: "50%",
  },
});

export const DialogContentContainer = styled(DialogContent)<DialogContentProps>(
  {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    paddingTop: "16px !important",
  }
);

export const DialogTitleContainer = styled(DialogTitle)<DialogTitleProps>({
  paddingBottom: 0,
});
