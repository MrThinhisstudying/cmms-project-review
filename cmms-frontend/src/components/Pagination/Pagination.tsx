import React from "react";
import { Box, useMediaQuery } from "@mui/material";
import { BoxButton, BoxPage, ButtonCustom } from "./styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { useTheme } from "@mui/material/styles";
import { TypographyCustom } from "../TypographyCustom";
import { CustomPagination } from "../../types/index.types";

export default function Pagination({
  data,
  rowsPerPage,
  onPageChange,
  page,
}: CustomPagination) {
  const theme = useTheme();
  const isLgDown = useMediaQuery(theme.breakpoints.down("lg"));

  const maxPagesToShow = 5;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const handleChangePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onPageChange(newPage);
    }
  };

  const renderPageNumbers = () => {
    const pageNumbers = [];
    let firstPage = Math.max(1, page - Math.floor((maxPagesToShow - 1) / 2));
    let lastPage = Math.min(totalPages, firstPage + maxPagesToShow - 1);

    if (firstPage !== 1) {
      pageNumbers.push(
        <ButtonCustom
          key="firstPage"
          variant="contained"
          id="1"
          disabled={page === 1}
          onClick={() => handleChangePage(1)}
        >
          <TypographyCustom customcolor="var(--Gray-600, #475467)">
            1
          </TypographyCustom>
        </ButtonCustom>
      );
    }

    if (firstPage > 2) {
      pageNumbers.push(
        <BoxPage key="startEllipsis">
          <TypographyCustom customcolor="var(--Gray-600, #475467)">
            ...
          </TypographyCustom>
        </BoxPage>
      );
    }

    for (let i = firstPage; i <= lastPage; i++) {
      pageNumbers.push(
        <ButtonCustom
          key={i}
          variant="contained"
          id={i.toString()}
          disabled={i === page}
          onClick={() => handleChangePage(i)}
        >
          <TypographyCustom customcolor="var(--Gray-600, #475467)">
            {i.toString()}
          </TypographyCustom>
        </ButtonCustom>
      );
    }

    if (lastPage < totalPages - 1) {
      pageNumbers.push(
        <BoxPage key="endEllipsis">
          <TypographyCustom customcolor="var(--Gray-600, #475467)">
            ...
          </TypographyCustom>
        </BoxPage>
      );
    }

    if (lastPage !== totalPages) {
      pageNumbers.push(
        <ButtonCustom
          key="lastPage"
          variant="contained"
          id={totalPages.toString()}
          disabled={page === totalPages}
          onClick={() => handleChangePage(totalPages)}
        >
          <TypographyCustom customcolor="var(--Gray-600, #475467)">
            {totalPages.toString()}
          </TypographyCustom>
        </ButtonCustom>
      );
    }

    return pageNumbers;
  };

  return (
    <BoxButton>
      {!isLgDown && (
        <ButtonCustom
          variant="contained"
          disabled={page <= 1}
          onClick={() => handleChangePage(page - 1)}
          startIcon={<ArrowBackIcon sx={{ color: "rgba(52, 64, 84, 1)" }} />}
          sx={{ minWidth: "auto" }}
        >
          <TypographyCustom
            customcolor="var(--Gray-600, #475467)"
            sx={{ whiteSpace: "nowrap" }}
          >
            Quay lại
          </TypographyCustom>
        </ButtonCustom>
      )}
      <Box display="flex" gap={1} justifyContent="center" width="100%">
        {renderPageNumbers()}
      </Box>
      {!isLgDown && (
        <ButtonCustom
          variant="contained"
          disabled={page >= totalPages}
          onClick={() => handleChangePage(page + 1)}
          endIcon={<ArrowForwardIcon sx={{ color: "rgba(52, 64, 84, 1)" }} />}
          sx={{ minWidth: "auto" }}
        >
          <TypographyCustom
            customcolor="var(--Gray-600, #475467)"
            sx={{ whiteSpace: "nowrap" }}
          >
            Tiếp theo
          </TypographyCustom>
        </ButtonCustom>
      )}
    </BoxButton>
  );
}
