import React, { useMemo, useState } from "react";
import { IconButton, TableBody, TableCell, TableHead } from "@mui/material";
import { IDevice } from "../../../../types/devicesManagement.types";
import {
  CustomTable,
  TableCellHeader,
  TableRowBody,
  TableRowContainer,
} from "./style";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmModal from "../../../../components/Modal";
import { mapStatus } from "../../../../constants/statusOptions";
import InfoIcon from "@mui/icons-material/Info";

interface DevicesTableProps {
  filteredData: IDevice[];
  rowsPerPage: number;
  page: number;
  onEdit: (device: IDevice) => void;
  onDelete: (device_id?: number) => void;
  onDetail: (device: IDevice) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

const DevicesTable: React.FC<DevicesTableProps> = ({
  filteredData,
  rowsPerPage,
  page,
  onEdit,
  onDelete,
  onDetail,
  canEdit = false,
  canDelete = false,
}) => {
  const [open, setOpen] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<
    number | undefined
  >();

  const paginatedDevices = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredData.slice(start, end);
  }, [filteredData, page, rowsPerPage]);

  const handleDeleteClick = (device_id?: number) => {
    setSelectedDeviceId(device_id);
    setOpen(true);
  };

  const handleConfirmDelete = () => {
    onDelete(selectedDeviceId);
    setOpen(false);
    setSelectedDeviceId(undefined);
  };

  return (
    <>
      <CustomTable stickyHeader>
        <TableHead>
          <TableRowContainer>
            <TableCellHeader>#</TableCellHeader>
            <TableCellHeader>Tên Trang Thiết Bị</TableCellHeader>
            <TableCellHeader>Nhãn hiệu thiết bị</TableCellHeader>
            <TableCellHeader>Mục đích sử dụng thiết bị</TableCellHeader>
            <TableCellHeader>Nước sản xuất</TableCellHeader>
            <TableCellHeader>Năm sản xuất</TableCellHeader>
            <TableCellHeader>Số máy (Serial Number)</TableCellHeader>
            <TableCellHeader>Tình Trạng</TableCellHeader>
            <TableCellHeader>Mã số, địa chỉ kỹ thuật</TableCellHeader>
            <TableCellHeader>Thống kê</TableCellHeader>
            {canEdit && <TableCellHeader>Sửa</TableCellHeader>}
            {canDelete && <TableCellHeader>Xoá</TableCellHeader>}
          </TableRowContainer>
        </TableHead>

        <TableBody>
          {paginatedDevices.map((item, index) => (
            <TableRowBody key={item.device_id || index} index={index}>
              <TableCell>{(page - 1) * rowsPerPage + index + 1}</TableCell>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.brand}</TableCell>
              <TableCell>{item.usage_purpose}</TableCell>
              <TableCell>{item.country_of_origin}</TableCell>
              <TableCell>{item.manufacture_year}</TableCell>
              <TableCell>{item.serial_number}</TableCell>
              <TableCell>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: mapStatus(item.status).color,
                    }}
                  />
                  {mapStatus(item.status).label}
                </span>
              </TableCell>
              <TableCell>{item.technical_code_address}</TableCell>
              <TableCell>
                <IconButton
                  color="primary"
                  onClick={() => onDetail(item)}
                  aria-label="detail"
                >
                  <InfoIcon />
                </IconButton>
              </TableCell>

              {canEdit && (
                <TableCell>
                  <IconButton
                    color="primary"
                    onClick={() => onEdit(item)}
                    aria-label="edit"
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              )}

              {canDelete && (
                <TableCell>
                  <IconButton
                    color="error"
                    onClick={() => handleDeleteClick(item.device_id)}
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              )}
            </TableRowBody>
          ))}
        </TableBody>
      </CustomTable>

      <ConfirmModal
        open={open}
        title="Xác nhận xóa"
        content="Bạn có chắc chắn muốn xóa trang thiết bị này?"
        onClose={() => {
          setOpen(false);
          setSelectedDeviceId(undefined);
        }}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
};

export default DevicesTable;
