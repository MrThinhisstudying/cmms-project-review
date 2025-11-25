import React from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  Grid,
  Button,
  Stack,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import dayjs from "dayjs";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import { IRepair } from "../../../../types/repairs.types";

export default function RepairDetailDialog({
  open,
  data,
  onClose,
  onExport,
  canExport = false,
}: {
  open: boolean;
  data: IRepair;
  onClose: () => void;
  onExport?: (type: "request" | "inspection" | "acceptance") => void;
  canExport?: boolean;
}) {
  const renderStatusChip = (status: string) => {
    const colorMap: Record<string, string> = {
      pending: "#f9a825",
      manager_approved: "#42a5f5",
      admin_approved: "#4caf50",
      rejected: "#e53935",

      inspection_pending: "#7e57c2",
      inspection_manager_approved: "#26c6da",
      inspection_admin_approved: "#26a69a",
      inspection_rejected: "#e53935",

      acceptance_pending: "#00897b",
      acceptance_manager_approved: "#26c6da",
      acceptance_admin_approved: "#2e7d32",
      acceptance_rejected: "#e53935",
    };

    const labelMap: Record<string, string> = {
      pending: "Chờ Trưởng phòng duyệt",
      manager_approved: "Chờ Ban Giám đốc duyệt",
      admin_approved: "Đã duyệt – Chuyển sang kiểm nghiệm",
      rejected: "Đã bị từ chối",

      inspection_pending: "Đang kiểm nghiệm kỹ thuật",
      inspection_manager_approved: "Kiểm nghiệm – Chờ Ban Giám đốc duyệt",
      inspection_admin_approved: "Hoàn tất kiểm nghiệm",
      inspection_rejected: "Từ chối kiểm nghiệm",

      acceptance_pending: "Đang nghiệm thu thiết bị",
      acceptance_manager_approved: "Nghiệm thu – Chờ Ban Giám đốc duyệt",
      acceptance_admin_approved: "Hoàn tất toàn bộ quy trình",
      acceptance_rejected: "Từ chối nghiệm thu",
    };

    return (
      <Chip
        label={labelMap[status] || "Không xác định"}
        sx={{
          bgcolor: colorMap[status] || "gray",
          color: "#fff",
          fontWeight: 600,
          height: 28,
          borderRadius: "8px",
        }}
      />
    );
  };

  const renderMaterialList = () => {
    if (!data.inspection_materials?.length)
      return (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ ml: 2, mt: 1 }}
        >
          —
        </Typography>
      );

    return (
      <TableContainer
        component={Paper}
        sx={{ mt: 2, boxShadow: "none", border: "1px solid #e0e0e0" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700, width: "5%" }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 700, width: "30%" }}>
                Tên vật tư
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: "15%" }}>
                Danh mục
              </TableCell>
              <TableCell
                sx={{ fontWeight: 700, width: "10%", textAlign: "center" }}
              >
                Số lượng
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: "8%" }}>ĐVT</TableCell>
              <TableCell
                sx={{ fontWeight: 700, width: "12%", textAlign: "center" }}
              >
                Nguồn
              </TableCell>
              <TableCell sx={{ fontWeight: 700, width: "20%" }}>
                Ghi chú
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.inspection_materials.map((m, idx) => (
              <TableRow key={idx} hover>
                <TableCell>{idx + 1}</TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {m.item_name || `Vật tư #${m.item_id}`}
                  </Typography>
                  {m.item_code && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      Mã: {m.item_code}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {m.category_name || (m.is_new ? "—" : "Không rõ")}
                  </Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  <Typography variant="body2" fontWeight={600}>
                    {m.quantity}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{m.unit || "—"}</Typography>
                </TableCell>
                <TableCell sx={{ textAlign: "center" }}>
                  <Chip
                    label={m.is_new ? "Mua mới" : "Từ kho"}
                    size="small"
                    sx={{
                      bgcolor: m.is_new ? "#fff3e0" : "#e3f2fd",
                      color: m.is_new ? "#e65100" : "#1565c0",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    fontStyle="italic"
                  >
                    {m.notes || "—"}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          textAlign: "center",
          fontWeight: 700,
          fontSize: 20,
          bgcolor: "#f5f5f5",
          borderBottom: "1px solid #ddd",
          py: 2,
        }}
      >
        HỒ SƠ QUY TRÌNH SỬA CHỮA – KIỂM NGHIỆM – NGHIỆM THU THIẾT BỊ
        <Typography fontSize={14} fontWeight={400} mt={0.5}>
          Theo dõi toàn bộ vòng đời xử lý yêu cầu
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 3,
            border: "1px solid #e0e0e0",
            borderRadius: 2,
            mb: 3,
            background: "#fafafa",
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography fontWeight={700}>Tên thiết bị</Typography>
              <Typography>{data.device?.name || "—"}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography fontWeight={700}>Đơn vị quản lý</Typography>
              <Typography>{data.created_department?.name || "—"}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography fontWeight={700}>Người lập phiếu</Typography>
              <Typography>{data.created_by?.name || "—"}</Typography>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Typography fontWeight={700}>Ngày lập</Typography>
              <Typography>
                {dayjs(data.created_at).format("DD/MM/YYYY HH:mm")}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {canExport && (
          <Stack
            direction="row"
            spacing={2}
            justifyContent="center"
            sx={{ mb: 3 }}
          >
            <Button
              variant="contained"
              color="info"
              startIcon={<FileDownloadIcon />}
              onClick={() => onExport?.("request")}
            >
              Xuất Yêu cầu
            </Button>

            <Button
              variant="contained"
              color="primary"
              startIcon={<FileDownloadIcon />}
              onClick={() => onExport?.("inspection")}
            >
              Xuất Kiểm nghiệm
            </Button>

            <Button
              variant="contained"
              color="success"
              startIcon={<FileDownloadIcon />}
              onClick={() => onExport?.("acceptance")}
            >
              Xuất Nghiệm thu
            </Button>
          </Stack>
        )}

        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px solid #eee" }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            I. Giai đoạn Đề nghị sửa chữa
          </Typography>

          <Typography sx={{ mb: 1 }}>
            Trạng thái: {renderStatusChip(data.status_request)}
          </Typography>

          <Typography>
            Duyệt bởi Trưởng phòng:{" "}
            {data.approved_by_manager_request?.name || "—"}
          </Typography>

          <Typography>
            Duyệt bởi Ban Giám đốc:{" "}
            {data.approved_by_admin_request?.name || "—"}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px solid #eee" }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            II. Giai đoạn Kiểm nghiệm kỹ thuật
          </Typography>

          <Typography sx={{ mb: 1 }}>
            Trạng thái: {renderStatusChip(data.status_inspection)}
          </Typography>

          {(data.inspection_created_at ||
            data.inspection_approved_at ||
            data.inspection_duration_minutes) && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
              {data.inspection_created_at && (
                <Typography variant="body2">
                  <strong>Thời gian tạo phiếu:</strong>{" "}
                  {dayjs(data.inspection_created_at).format("DD/MM/YYYY HH:mm")}
                </Typography>
              )}
              {data.inspection_approved_at && (
                <Typography variant="body2">
                  <strong>Thời gian manager approve:</strong>{" "}
                  {dayjs(data.inspection_approved_at).format(
                    "DD/MM/YYYY HH:mm"
                  )}
                </Typography>
              )}
              {data.inspection_duration_minutes !== undefined &&
                data.inspection_duration_minutes !== null && (
                  <Typography variant="body2" color="primary" fontWeight={600}>
                    <strong>Thời gian kiểm nghiệm:</strong>{" "}
                    {Math.floor(data.inspection_duration_minutes / 60)}h{" "}
                    {data.inspection_duration_minutes % 60}m (
                    {data.inspection_duration_minutes} phút)
                  </Typography>
                )}
            </Box>
          )}

          {data.inspection_committee &&
            data.inspection_committee.length > 0 && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: "#f9fafb",
                  borderRadius: 1,
                  border: "1px solid #e0e0e0",
                }}
              >
                <Typography fontWeight={700} mb={2} color="#1976d2">
                  Thành phần Ban Kiểm nghiệm kỹ thuật:
                </Typography>
                <Grid container spacing={1.5}>
                  {data.inspection_committee.map((member, idx) => (
                    <Grid item xs={12} key={member.user_id}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1.5,
                          bgcolor: "white",
                          borderRadius: 1,
                          border: "1px solid #e3f2fd",
                        }}
                      >
                        <Typography
                          sx={{ minWidth: 30, fontWeight: 600, color: "#666" }}
                        >
                          {idx + 1}.
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={600}>
                            {member.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {member.email}
                            {member.position &&
                              ` • Chức vụ: ${member.position}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

          {data.inspection_items && data.inspection_items.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography fontWeight={700} fontSize={16} mb={2} color="primary">
                Nội dung kiểm nghiệm:
              </Typography>
              {data.inspection_items.map((item, idx) => (
                <Paper
                  key={idx}
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: "#fafafa",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <Typography fontWeight={600} color="text.secondary" mb={1}>
                    Mục {idx + 1}
                  </Typography>

                  {item.description && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography
                        fontWeight={600}
                        color="error.main"
                        fontSize={14}
                      >
                        Mô tả hư hỏng:
                      </Typography>
                      <Typography sx={{ pl: 2, whiteSpace: "pre-wrap" }}>
                        {item.description}
                      </Typography>
                    </Box>
                  )}

                  {item.cause && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography
                        fontWeight={600}
                        color="warning.main"
                        fontSize={14}
                      >
                        Nguyên nhân hư hỏng:
                      </Typography>
                      <Typography sx={{ pl: 2, whiteSpace: "pre-wrap" }}>
                        {item.cause}
                      </Typography>
                    </Box>
                  )}

                  {item.solution && (
                    <Box sx={{ mb: 1.5 }}>
                      <Typography
                        fontWeight={600}
                        color="info.main"
                        fontSize={14}
                      >
                        Biện pháp sửa chữa:
                      </Typography>
                      <Typography sx={{ pl: 2, whiteSpace: "pre-wrap" }}>
                        {item.solution}
                      </Typography>
                    </Box>
                  )}

                  {item.notes && (
                    <Box sx={{ mb: 0 }}>
                      <Typography
                        fontWeight={600}
                        color="text.secondary"
                        fontSize={14}
                      >
                        Ghi chú:
                      </Typography>
                      <Typography
                        sx={{
                          pl: 2,
                          whiteSpace: "pre-wrap",
                          fontStyle: "italic",
                        }}
                      >
                        {item.notes}
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          )}

          {data.inspection_other_opinions && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: "#fff3e0",
                borderRadius: 1,
                border: "1px solid #ffe0b2",
              }}
            >
              <Typography fontWeight={600} color="#e65100">
                Ý kiến khác:
              </Typography>
              <Typography sx={{ pl: 2, whiteSpace: "pre-wrap" }}>
                {data.inspection_other_opinions}
              </Typography>
            </Box>
          )}

          <Typography sx={{ mt: 1.5, fontWeight: 600 }}>
            Vật tư sử dụng:
          </Typography>

          {renderMaterialList()}

          <Typography sx={{ mt: 1.5 }}>
            Duyệt bởi Trưởng phòng:{" "}
            {data.approved_by_manager_inspection?.name || "—"}
          </Typography>
          <Typography>
            Duyệt bởi Ban Giám đốc:{" "}
            {data.approved_by_admin_inspection?.name || "—"}
          </Typography>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: 2, border: "1px solid #eee" }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            III. Giai đoạn Nghiệm thu
          </Typography>

          <Typography sx={{ mb: 1 }}>
            Trạng thái: {renderStatusChip(data.status_acceptance)}
          </Typography>

          {(data.acceptance_created_at ||
            data.acceptance_approved_at ||
            data.acceptance_duration_minutes) && (
            <Box sx={{ mb: 2, p: 2, bgcolor: "#f5f5f5", borderRadius: 1 }}>
              {data.acceptance_created_at && (
                <Typography variant="body2">
                  <strong>Thời gian tạo phiếu:</strong>{" "}
                  {dayjs(data.acceptance_created_at).format("DD/MM/YYYY HH:mm")}
                </Typography>
              )}
              {data.acceptance_approved_at && (
                <Typography variant="body2">
                  <strong>Thời gian manager approve:</strong>{" "}
                  {dayjs(data.acceptance_approved_at).format(
                    "DD/MM/YYYY HH:mm"
                  )}
                </Typography>
              )}
              {data.acceptance_duration_minutes !== undefined &&
                data.acceptance_duration_minutes !== null && (
                  <Typography
                    variant="body2"
                    color="success.main"
                    fontWeight={600}
                  >
                    <strong>Thời gian nghiệm thu:</strong>{" "}
                    {Math.floor(data.acceptance_duration_minutes / 60)}h{" "}
                    {data.acceptance_duration_minutes % 60}m (
                    {data.acceptance_duration_minutes} phút)
                  </Typography>
                )}
            </Box>
          )}

          {data.acceptance_committee &&
            data.acceptance_committee.length > 0 && (
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  bgcolor: "#f9fafb",
                  borderRadius: 1,
                  border: "1px solid #e0e0e0",
                }}
              >
                <Typography fontWeight={700} mb={2} color="#1976d2">
                  Thành phần Ban Nghiệm thu thiết bị:
                </Typography>
                <Grid container spacing={1.5}>
                  {data.acceptance_committee.map((member, idx) => (
                    <Grid item xs={12} key={member.user_id}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          p: 1.5,
                          bgcolor: "white",
                          borderRadius: 1,
                          border: "1px solid #e8f5e9",
                        }}
                      >
                        <Typography
                          sx={{ minWidth: 30, fontWeight: 600, color: "#666" }}
                        >
                          {idx + 1}.
                        </Typography>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight={600}>
                            {member.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {member.email}
                            {member.position &&
                              ` • Chức vụ: ${member.position}`}
                          </Typography>
                        </Box>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

          {data.failure_cause && (
            <Box sx={{ mb: 2 }}>
              <Typography fontWeight={600} color="error.main">
                Nguyên nhân hỏng hóc:
              </Typography>
              <Typography sx={{ pl: 2, whiteSpace: "pre-wrap" }}>
                {data.failure_cause}
              </Typography>
            </Box>
          )}

          {data.recovered_materials && data.recovered_materials.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography fontWeight={600} color="success.main" mb={1}>
                Vật tư thu hồi:
              </Typography>
              <TableContainer
                component={Paper}
                sx={{ boxShadow: "none", border: "1px solid #e0e0e0" }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#e8f5e9" }}>
                      <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tên vật tư</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                        Số lượng
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ĐVT</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                        % Hư hỏng
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.recovered_materials.map((mat, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{mat.name}</TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          {mat.quantity}
                        </TableCell>
                        <TableCell>{mat.unit}</TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          <Chip
                            label={`${mat.damage_percentage}%`}
                            size="small"
                            color={
                              mat.damage_percentage > 50 ? "error" : "warning"
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {data.materials_to_scrap && data.materials_to_scrap.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography fontWeight={600} color="error.main" mb={1}>
                Vật tư xin hủy:
              </Typography>
              <TableContainer
                component={Paper}
                sx={{ boxShadow: "none", border: "1px solid #ffcdd2" }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "#ffebee" }}>
                      <TableCell sx={{ fontWeight: 600 }}>STT</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Tên vật tư</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                        Số lượng
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>ĐVT</TableCell>
                      <TableCell sx={{ fontWeight: 600, textAlign: "right" }}>
                        % Hư hỏng
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.materials_to_scrap.map((mat, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{mat.name}</TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          {mat.quantity}
                        </TableCell>
                        <TableCell>{mat.unit}</TableCell>
                        <TableCell sx={{ textAlign: "right" }}>
                          <Chip
                            label={`${mat.damage_percentage}%`}
                            size="small"
                            color="error"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {data.acceptance_other_opinions && (
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: "#fff3e0",
                borderRadius: 1,
                border: "1px solid #ffe0b2",
              }}
            >
              <Typography fontWeight={600} color="#e65100">
                Ý kiến khác:
              </Typography>
              <Typography sx={{ pl: 2, whiteSpace: "pre-wrap" }}>
                {data.acceptance_other_opinions}
              </Typography>
            </Box>
          )}

          {data.failure_description && (
            <Box sx={{ mb: 2 }}>
              <Typography fontWeight={600} color="error.main">
                Mô tả sự cố hỏng hóc:
              </Typography>
              <Typography sx={{ pl: 2, whiteSpace: "pre-wrap" }}>
                {data.failure_description}
              </Typography>
            </Box>
          )}

          <Typography>Nhận xét: {data.acceptance_note || "—"}</Typography>

          <Typography sx={{ mt: 1.5 }}>
            Duyệt bởi Trưởng phòng:{" "}
            {data.approved_by_manager_acceptance?.name || "—"}
          </Typography>

          <Typography>
            Duyệt bởi Ban Giám đốc:{" "}
            {data.approved_by_admin_acceptance?.name || "—"}
          </Typography>
        </Paper>

        <Grid container spacing={3} mt={4}>
          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography fontWeight={700}>TỔ KỸ THUẬT</Typography>
              <Typography sx={{ mt: 5 }}>(Ký, ghi rõ họ tên)</Typography>
              <Typography fontWeight={700} sx={{ mt: 1 }}>
                {data.inspection_created_by?.name ||
                  data.acceptance_created_by?.name ||
                  "—"}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography fontWeight={700}>TỔ VHTTBMĐ</Typography>
              <Typography sx={{ mt: 5 }}>(Ký, ghi rõ họ tên)</Typography>
              <Typography fontWeight={700} sx={{ mt: 1 }}>
                {data.created_by?.name || "—"}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography fontWeight={700}>CÁN BỘ ĐỘI</Typography>
              <Typography sx={{ mt: 5 }}>(Ký, ghi rõ họ tên)</Typography>
              <Typography fontWeight={700} sx={{ mt: 1 }}>
                {data.approved_by_manager_acceptance?.name ||
                  data.approved_by_manager_inspection?.name ||
                  data.approved_by_manager_request?.name ||
                  "—"}
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={3}>
            <Box textAlign="center">
              <Typography fontWeight={700}>BAN GIÁM ĐỐC</Typography>
              <Typography sx={{ mt: 5 }}>(Ký, ghi rõ họ tên)</Typography>
              <Typography fontWeight={700} sx={{ mt: 1 }}>
                {data.approved_by_admin_acceptance?.name ||
                  data.approved_by_admin_inspection?.name ||
                  data.approved_by_admin_request?.name ||
                  "—"}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Box mt={5} textAlign="center">
          <Button variant="contained" color="primary" onClick={onClose}>
            Đóng
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
