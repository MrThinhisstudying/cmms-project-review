import React from "react";
import { Pagination as AntdPagination } from "antd";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import { BoxButton, ButtonCustom } from "./styles";
import { TypographyCustom } from "../TypographyCustom";
import { CustomPagination } from "../../types/index.types";

export default function Pagination({
  data,
  rowsPerPage,
  onPageChange,
  page,
}: CustomPagination) {
  const totalItems = data ? data.length : 0;
  const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;

  const handleChangePage = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      onPageChange(newPage);
    }
  };

  return (
    <BoxButton>
      <ButtonCustom
        disabled={page <= 1}
        onClick={() => handleChangePage(page - 1)}
      >
        <LeftOutlined style={{ color: "#344054", fontSize: "12px" }} />
        <TypographyCustom customcolor="#475467" style={{ whiteSpace: "nowrap" }}>
          Quay lại
        </TypographyCustom>
      </ButtonCustom>

      <div style={{ display: "flex", gap: "4px", justifyContent: "center", width: "100%" }}>
        <AntdPagination
          current={page}
          pageSize={rowsPerPage}
          total={totalItems}
          onChange={(p) => onPageChange(p)}
          showSizeChanger={false}
        />
      </div>

      <ButtonCustom
        disabled={page >= totalPages}
        onClick={() => handleChangePage(page + 1)}
      >
        <TypographyCustom customcolor="#475467" style={{ whiteSpace: "nowrap" }}>
          Tiếp theo
        </TypographyCustom>
        <RightOutlined style={{ color: "#344054", fontSize: "12px" }} />
      </ButtonCustom>
    </BoxButton>
  );
}
