import React, { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  Divider,
  Grid,
  MenuItem,
  TextField,
  Typography,
  Paper,
  Autocomplete,
  Chip,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import TopBar from "../../../../layout/MainLayout/TopBar";
import { CustomButton } from "../../../../components/Button";
import {
  IRepair,
  RepairAcceptancePayload,
  IMaterial,
} from "../../../../types/repairs.types";
import { IUser } from "../../../../types/user.types";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";

export default function RepairAcceptanceForm({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  initialData: IRepair;
  onClose: () => void;
  onSubmit: (data: RepairAcceptancePayload) => Promise<void> | void;
  loading?: boolean;
}) {
  const { users } = useUsersContext();
  
  const [note, setNote] = useState("");
  const [committeeMembers, setCommitteeMembers] = useState<IUser[]>([]);
  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");

  const [failureCause, setFailureCause] = useState("");
  const [failureDescription, setFailureDescription] = useState("");
  const [recoveredMaterials, setRecoveredMaterials] = useState<IMaterial[]>([]);
  const [materialsToScrap, setMaterialsToScrap] = useState<IMaterial[]>([]);
  const [acceptanceOtherOpinions, setAcceptanceOtherOpinions] = useState("");

  useEffect(() => {
    if (!open) return;

    setNote(initialData.acceptance_note || "");
    setCommitteeMembers(initialData.acceptance_committee || []);
    setAction("approve");
    setReason("");

    setFailureCause(initialData.failure_cause || "");
    setFailureDescription(initialData.failure_description || "");
    setRecoveredMaterials(initialData.recovered_materials || []);
    setMaterialsToScrap(initialData.materials_to_scrap || []);
    setAcceptanceOtherOpinions(initialData.acceptance_other_opinions || "");
  }, [open, initialData]);

  const canSubmit = () =>
    action === "reject" ? reason.trim().length > 0 : true;

  const handleSubmit = async () => {
    const payload: RepairAcceptancePayload = {
      acceptance_note: action === "approve" ? note : undefined,
      acceptance_committee_ids: committeeMembers.map((u) => u.user_id),
      action,
      reason: action === "reject" ? reason.trim() : undefined,
      failure_cause: failureCause.trim() || undefined,
      failure_description: failureDescription.trim() || undefined,
      recovered_materials: recoveredMaterials.filter(m => m.name && m.quantity > 0),
      materials_to_scrap: materialsToScrap.filter(m => m.name && m.quantity > 0),
      acceptance_other_opinions: acceptanceOtherOpinions.trim() || undefined,
    };
    await onSubmit(payload);
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { display: "flex", flexDirection: "column", height: "100dvh" },
      }}
    >
      <TopBar />

      <Box sx={{ flex: 1, overflowY: "auto", p: 4, mt: "70px" }}>
        <Typography variant="h6" fontWeight={700} color="primary" mb={3}>
          Biểu mẫu nghiệm thu thiết bị
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            background: "white",
            mb: 3,
          }}
        >
          <Typography fontWeight={700} fontSize={16} mb={2} color="primary">
            Ban Nghiệm thu thiết bị
          </Typography>
          <Autocomplete
            multiple
            options={users}
            getOptionLabel={(option) => `${option.name} - ${option.email}`}
            value={committeeMembers}
            onChange={(_, newValue) => setCommitteeMembers(newValue)}
            disabled={loading || action === "reject"}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chọn thành viên ban nghiệm thu"
                placeholder="Tìm kiếm và chọn người dùng..."
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  label={option.name}
                  {...getTagProps({ index })}
                  sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }}
                />
              ))
            }
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Chọn các thành viên tham gia vào ban nghiệm thu thiết bị
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            p: 3,
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            background: "white",
            mb: 3,
          }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                label="Nguyên nhân hỏng hóc"
                value={failureCause}
                onChange={(e) => setFailureCause(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                disabled={loading || action === "reject"}
                placeholder="Phân tích nguyên nhân hỏng hóc..."
              />
            </Grid>

            <Grid item xs={12}>
              <Typography fontWeight={600} mb={1} color="primary">Vật tư thu hồi</Typography>
              <Paper sx={{ p: 2, background: "#fafafa" }}>
                {recoveredMaterials.map((mat, idx) => (
                  <Box key={idx} mb={2}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField
                          size="small"
                          label="Tên vật tư"
                          fullWidth
                          value={mat.name}
                          onChange={(e) => {
                            const updated = [...recoveredMaterials];
                            updated[idx].name = e.target.value;
                            setRecoveredMaterials(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField
                          size="small"
                          label="Số lượng"
                          type="number"
                          fullWidth
                          value={mat.quantity}
                          onChange={(e) => {
                            const updated = [...recoveredMaterials];
                            updated[idx].quantity = Number(e.target.value);
                            setRecoveredMaterials(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField
                          size="small"
                          label="Đơn vị"
                          fullWidth
                          value={mat.unit}
                          onChange={(e) => {
                            const updated = [...recoveredMaterials];
                            updated[idx].unit = e.target.value;
                            setRecoveredMaterials(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={10} sm={3}>
                        <TextField
                          size="small"
                          label="% hư hỏng"
                          type="number"
                          fullWidth
                          value={mat.damage_percentage}
                          inputProps={{ min: 0, max: 100 }}
                          onChange={(e) => {
                            const updated = [...recoveredMaterials];
                            updated[idx].damage_percentage = Number(e.target.value);
                            setRecoveredMaterials(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={2} sm={1}>
                        <IconButton
                          color="error"
                          onClick={() => setRecoveredMaterials(recoveredMaterials.filter((_, i) => i !== idx))}
                          disabled={loading || action === "reject"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                <CustomButton
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setRecoveredMaterials([...recoveredMaterials, { name: "", quantity: 0, unit: "", damage_percentage: 0 }])}
                  disabled={loading || action === "reject"}
                >
                  Thêm vật tư thu hồi
                </CustomButton>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Typography fontWeight={600} mb={1} color="error">Vật tư xin hủy</Typography>
              <Paper sx={{ p: 2, background: "#fff5f5" }}>
                {materialsToScrap.map((mat, idx) => (
                  <Box key={idx} mb={2}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={4}>
                        <TextField
                          size="small"
                          label="Tên vật tư"
                          fullWidth
                          value={mat.name}
                          onChange={(e) => {
                            const updated = [...materialsToScrap];
                            updated[idx].name = e.target.value;
                            setMaterialsToScrap(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField
                          size="small"
                          label="Số lượng"
                          type="number"
                          fullWidth
                          value={mat.quantity}
                          onChange={(e) => {
                            const updated = [...materialsToScrap];
                            updated[idx].quantity = Number(e.target.value);
                            setMaterialsToScrap(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <TextField
                          size="small"
                          label="Đơn vị"
                          fullWidth
                          value={mat.unit}
                          onChange={(e) => {
                            const updated = [...materialsToScrap];
                            updated[idx].unit = e.target.value;
                            setMaterialsToScrap(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={10} sm={3}>
                        <TextField
                          size="small"
                          label="% hư hỏng"
                          type="number"
                          fullWidth
                          value={mat.damage_percentage}
                          inputProps={{ min: 0, max: 100 }}
                          onChange={(e) => {
                            const updated = [...materialsToScrap];
                            updated[idx].damage_percentage = Number(e.target.value);
                            setMaterialsToScrap(updated);
                          }}
                          disabled={loading || action === "reject"}
                        />
                      </Grid>
                      <Grid item xs={2} sm={1}>
                        <IconButton
                          color="error"
                          onClick={() => setMaterialsToScrap(materialsToScrap.filter((_, i) => i !== idx))}
                          disabled={loading || action === "reject"}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                <CustomButton
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setMaterialsToScrap([...materialsToScrap, { name: "", quantity: 0, unit: "", damage_percentage: 0 }])}
                  disabled={loading || action === "reject"}
                >
                  Thêm vật tư xin hủy
                </CustomButton>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Ý kiến khác"
                value={acceptanceOtherOpinions}
                onChange={(e) => setAcceptanceOtherOpinions(e.target.value)}
                fullWidth
                multiline
                minRows={2}
                disabled={loading || action === "reject"}
                placeholder="Các ý kiến khác về quá trình nghiệm thu..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Mô tả sự cố hỏng hóc"
                fullWidth
                multiline
                minRows={3}
                value={failureDescription}
                onChange={(e) => setFailureDescription(e.target.value)}
                disabled={loading || action === "reject"}
                placeholder="Mô tả chi tiết tình trạng hỏng hóc của thiết bị sau sửa chữa..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Nhận xét / ghi chú"
                fullWidth
                multiline
                minRows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={loading || action === "reject"}
                placeholder="Nhập nội dung đánh giá quá trình nghiệm thu..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                label="Hành động xử lý"
                fullWidth
                value={action}
                onChange={(e) =>
                  setAction(e.target.value as "approve" | "reject")
                }
                disabled={loading}
              >
                <MenuItem value="approve">Phê duyệt nghiệm thu</MenuItem>
                <MenuItem value="reject">Từ chối nghiệm thu</MenuItem>
              </TextField>
            </Grid>

            {action === "reject" && (
              <Grid item xs={12}>
                <TextField
                  label="Lý do từ chối nghiệm thu"
                  fullWidth
                  multiline
                  minRows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Nhập lý do từ chối..."
                  disabled={loading}
                />
              </Grid>
            )}
          </Grid>
        </Paper>
      </Box>

      <Divider />
      <Box
        sx={{
          p: 3,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          background: "#fafafa",
          borderTop: "1px solid #ddd",
        }}
      >
        <CustomButton
          variant="outlined"
          padding="6px 16px"
          onClick={onClose}
          disabled={loading}
        >
          Hủy
        </CustomButton>

        <CustomButton
          variant="contained"
          padding="6px 16px"
          bgrColor={action === "approve" ? "#2e7d32" : "#d32f2f"}
          onClick={handleSubmit}
          disabled={loading || !canSubmit()}
        >
          {action === "approve" ? "Xác nhận nghiệm thu" : "Xác nhận từ chối"}
        </CustomButton>
      </Box>
    </Dialog>
  );
}
