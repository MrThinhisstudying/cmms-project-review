import React, { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  Divider,
  Grid,
  IconButton,
  MenuItem,
  TextField,
  Typography,
  Paper,
  Autocomplete,
  Chip,
} from "@mui/material";
import TopBar from "../../../../layout/MainLayout/TopBar";
import { CustomButton } from "../../../../components/Button";
import {
  IRepair,
  RepairInspectionPayload,
  IInspectionMaterial,
} from "../../../../types/repairs.types";
import { IUser } from "../../../../types/user.types";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";

export default function RepairInspectionForm({
  open,
  initialData,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  initialData: IRepair;
  onClose: () => void;
  onSubmit: (data: RepairInspectionPayload) => Promise<void> | void;
  loading?: boolean;
}) {
  const { items } = useInventoryContext();
  const { users } = useUsersContext();

  const [committeeMembers, setCommitteeMembers] = useState<IUser[]>([]);

  const [inspectionItems, setInspectionItems] = useState<Array<{description: string; cause: string; solution: string; notes: string}>>([
    { description: "", cause: "", solution: "", notes: "" }
  ]);
  const [inspectionOtherOpinions, setInspectionOtherOpinions] = useState("");

  const [materialsStock, setMaterialsStock] = useState<IInspectionMaterial[]>([
    { item_id: null, quantity: 1, unit: "", is_new: false, notes: "" },
  ]);

  const [materialsNew, setMaterialsNew] = useState<IInspectionMaterial[]>([
    { item_id: null, item_name: "", quantity: 1, unit: "", is_new: true, notes: "" },
  ]);

  const [action, setAction] = useState<"approve" | "reject">("approve");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;

    setCommitteeMembers(initialData.inspection_committee || []);

    setInspectionItems(
      initialData.inspection_items && initialData.inspection_items.length > 0
        ? initialData.inspection_items.map(item => ({
            description: item.description || "",
            cause: item.cause || "",
            solution: item.solution || "",
            notes: item.notes || ""
          }))
        : [{ description: "", cause: "", solution: "", notes: "" }]
    );
    setInspectionOtherOpinions(initialData.inspection_other_opinions || "");

    const fromStock =
      initialData.inspection_materials?.filter((m) => !m.is_new) || [];
    const fromNew =
      initialData.inspection_materials?.filter((m) => m.is_new) || [];

    setMaterialsStock(
      fromStock.length
        ? fromStock.map((m) => ({
            item_id: m.item_id ?? null,
            quantity: m.quantity,
            unit: m.unit || "",
            is_new: false,
            notes: m.notes || "",
          }))
        : [{ item_id: null, quantity: 1, unit: "", is_new: false, notes: "" }]
    );

    setMaterialsNew(
      fromNew.length
        ? fromNew.map((m) => ({
            item_id: null,
            item_name: m.item_name || "",
            quantity: m.quantity,
            unit: m.unit || "",
            is_new: true,
            notes: m.notes || "",
          }))
        : [
            {
              item_id: null,
              item_name: "",
              quantity: 1,
              unit: "",
              is_new: true,
              notes: "",
            },
          ]
    );

    setAction("approve");
    setReason("");
  }, [open, initialData]);

  const updateStock = (i: number, key: keyof IInspectionMaterial, v: any) => {
    const next = [...materialsStock];
    next[i] = { ...next[i], [key]: v };
    setMaterialsStock(next);
  };

  const updateNew = (i: number, key: keyof IInspectionMaterial, v: any) => {
    const next = [...materialsNew];
    next[i] = { ...next[i], [key]: v };
    setMaterialsNew(next);
  };

  const addInspectionItem = () => {
    setInspectionItems((p) => [...p, { description: "", cause: "", solution: "", notes: "" }]);
  };

  const removeInspectionItem = (i: number) => {
    setInspectionItems((p) => p.filter((_, idx) => idx !== i));
  };

  const updateInspectionItem = (i: number, field: 'description' | 'cause' | 'solution' | 'notes', value: string) => {
    const updated = [...inspectionItems];
    updated[i] = { ...updated[i], [field]: value };
    setInspectionItems(updated);
  };

  const addStock = () => {
    setMaterialsStock((p) => [
      ...p,
      { item_id: null, quantity: 1, unit: "", is_new: false, notes: "" },
    ]);
  };

  const addNew = () => {
    setMaterialsNew((p) => [
      ...p,
      { item_id: null, item_name: "", quantity: 1, unit: "", is_new: true, notes: "" },
    ]);
  };

  const removeStock = (i: number) => {
    setMaterialsStock((p) => p.filter((_, idx) => idx !== i));
  };

  const removeNew = (i: number) => {
    setMaterialsNew((p) => p.filter((_, idx) => idx !== i));
  };

  const canSubmit = () => {
    if (action === "reject") return reason.trim().length > 0;
    return inspectionItems.some(item => 
      item.description.trim().length > 0 || 
      item.cause.trim().length > 0 || 
      item.solution.trim().length > 0
    );
  };

  const handleSubmit = async () => {
    const payload: RepairInspectionPayload = {
      inspection_materials:
        action === "approve"
          ? [
              ...materialsStock.filter(
                (m) => m.item_id && m.quantity > 0 && !m.is_new
              ),
              ...materialsNew.filter(
                (m) => m.item_name && m.quantity > 0 && m.is_new
              ),
            ]
          : [],
      inspection_committee_ids: committeeMembers.map((u) => u.user_id),
      action,
      reason: action === "reject" ? reason.trim() : undefined,
      inspection_items: inspectionItems.filter(item => 
        item.description.trim() || item.cause.trim() || item.solution.trim()
      ),
      inspection_other_opinions: inspectionOtherOpinions.trim() || undefined,
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

      <Box sx={{ flex: 1, overflowY: "auto", p: 3, mt: "70px" }}>
        <Typography fontWeight={700} variant="h6" mb={3} color="primary">
          Phiếu kiểm nghiệm kỹ thuật thiết bị
        </Typography>

        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper
              sx={{
                p: 3,
                borderRadius: 2,
                border: "1px solid #e0e0e0",
                background: "#f9fafb",
              }}
            >
              <Typography fontWeight={700} fontSize={16} mb={2} color="primary">
                Ban Kiểm nghiệm kỹ thuật
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
                    label="Chọn thành viên ban kiểm nghiệm"
                    placeholder="Tìm kiếm và chọn người dùng..."
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option.name}
                      {...getTagProps({ index })}
                      sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}
                    />
                  ))
                }
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                Chọn các thành viên tham gia vào ban kiểm nghiệm kỹ thuật thiết bị
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 3, background: "#f5f5f5", border: "2px solid #e0e0e0" }}>
              <Typography fontWeight={700} fontSize={18} mb={2} color="primary">
                Nội dung kiểm nghiệm
              </Typography>
              {inspectionItems.map((item, idx) => (
                <Paper
                  key={idx}
                  sx={{
                    p: 2,
                    mb: 2,
                    background: "white",
                    border: "1px solid #e0e0e0",
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography fontWeight={600} color="text.secondary">
                      Mục {idx + 1}
                    </Typography>
                    <IconButton
                      color="error"
                      size="small"
                      onClick={() => removeInspectionItem(idx)}
                      disabled={loading || action === "reject" || inspectionItems.length === 1}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Mô tả hư hỏng"
                        value={item.description}
                        onChange={(e) => updateInspectionItem(idx, 'description', e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={loading || action === "reject"}
                        placeholder="Mô tả chi tiết tình trạng hư hỏng..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Nguyên nhân hư hỏng"
                        value={item.cause}
                        onChange={(e) => updateInspectionItem(idx, 'cause', e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={loading || action === "reject"}
                        placeholder="Phân tích nguyên nhân gây ra hư hỏng..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Biện pháp sửa chữa"
                        value={item.solution}
                        onChange={(e) => updateInspectionItem(idx, 'solution', e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={loading || action === "reject"}
                        placeholder="Đề xuất biện pháp sửa chữa..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Ghi chú"
                        value={item.notes}
                        onChange={(e) => updateInspectionItem(idx, 'notes', e.target.value)}
                        fullWidth
                        multiline
                        minRows={2}
                        disabled={loading || action === "reject"}
                        placeholder="Ghi chú bổ sung..."
                      />
                    </Grid>
                  </Grid>
                </Paper>
              ))}
              <CustomButton
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={addInspectionItem}
                disabled={loading || action === "reject"}
                bgrColor="#1976d2"
              >
                Thêm mục kiểm nghiệm
              </CustomButton>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Ý kiến khác"
              value={inspectionOtherOpinions}
              onChange={(e) => setInspectionOtherOpinions(e.target.value)}
              fullWidth
              multiline
              minRows={2}
              disabled={loading || action === "reject"}
              placeholder="Các ý kiến khác về quá trình kiểm nghiệm..."
            />
          </Grid>

          {action === "approve" && (
            <>
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: "1px solid #e0e0e0",
                    background: "white",
                  }}
                >
                  <Typography fontWeight={700} fontSize={16} mb={2}>
                    Vật tư sử dụng từ kho
                  </Typography>

                  {materialsStock.map((m, i) => {
                    const item = items.find((it) => it.item_id === m.item_id);
                    const maxQty = item?.quantity ?? 0;

                    return (
                      <Box
                        key={i}
                        sx={{
                          border: "1px solid #f0f0f0",
                          p: 2,
                          mb: 2,
                          borderRadius: 1.5,
                        }}
                      >
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={5}>
                            <TextField
                              select
                              fullWidth
                              label="Vật tư kho"
                              size="small"
                              value={m.item_id ?? ""}
                              onChange={(e) =>
                                updateStock(
                                  i,
                                  "item_id",
                                  Number(e.target.value)
                                )
                              }
                            >
                              <MenuItem value="">-- chọn vật tư --</MenuItem>
                              {items.map((it) => (
                                <MenuItem
                                  key={it.item_id}
                                  value={it.item_id}
                                  disabled={it.quantity < 1}
                                >
                                  {it.name} {it.quantity < 1 && "(Hết)"}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Grid>

                          <Grid item xs={2}>
                            <TextField
                              label="SL"
                              type="number"
                              size="small"
                              fullWidth
                              value={m.quantity}
                              inputProps={{ min: 1, max: maxQty }}
                              onChange={(e) => {
                                let v = Number(e.target.value);
                                if (v < 1) v = 1;
                                if (v > maxQty) v = maxQty;
                                updateStock(i, "quantity", v);
                              }}
                            />
                          </Grid>

                          <Grid item xs={2}>
                            <TextField
                              label="ĐVT"
                              size="small"
                              fullWidth
                              disabled
                              value={item?.quantity_unit || ""}
                            />
                          </Grid>

                          <Grid item xs={2}>
                            <TextField
                              label="Tồn kho"
                              size="small"
                              fullWidth
                              disabled
                              value={item?.quantity ?? 0}
                            />
                          </Grid>

                          <Grid item xs={1} textAlign="center">
                            <IconButton
                              color="error"
                              onClick={() => removeStock(i)}
                              disabled={materialsStock.length === 1}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Grid>

                          <Grid item xs={12}>
                            <TextField
                              label="Ghi chú vật tư"
                              size="small"
                              fullWidth
                              value={m.notes || ""}
                              onChange={(e) => updateStock(i, "notes", e.target.value)}
                              placeholder="Ghi chú cho yêu cầu vật tư này..."
                            />
                          </Grid>
                        </Grid>
                      </Box>
                    );
                  })}

                  <CustomButton
                    variant="outlined"
                    padding="6px 16px"
                    startIcon={<AddIcon />}
                    onClick={addStock}
                  >
                    Thêm vật tư kho
                  </CustomButton>
                </Paper>
              </Grid>

              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    border: "1px solid #e0e0e0",
                    background: "white",
                  }}
                >
                  <Typography fontWeight={700} fontSize={16} mb={2}>
                    Vật tư mua mới
                  </Typography>

                  {materialsNew.map((m, i) => (
                    <Box
                      key={i}
                      sx={{
                        border: "1px solid #f0f0f0",
                        p: 2,
                        mb: 2,
                        borderRadius: 1.5,
                      }}
                    >
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={5}>
                          <TextField
                            label="Tên vật tư"
                            size="small"
                            fullWidth
                            value={m.item_name}
                            onChange={(e) =>
                              updateNew(i, "item_name", e.target.value)
                            }
                          />
                        </Grid>

                        <Grid item xs={2}>
                          <TextField
                            label="SL"
                            size="small"
                            type="number"
                            fullWidth
                            value={m.quantity}
                            inputProps={{ min: 1 }}
                            onChange={(e) => {
                              let v = Number(e.target.value);
                              if (v < 1) v = 1;
                              updateNew(i, "quantity", v);
                            }}
                          />
                        </Grid>

                        <Grid item xs={3}>
                          <TextField
                            label="ĐVT"
                            size="small"
                            fullWidth
                            value={m.unit}
                            onChange={(e) =>
                              updateNew(i, "unit", e.target.value)
                            }
                          />
                        </Grid>

                        <Grid item xs={1} textAlign="center">
                          <IconButton
                            color="error"
                            onClick={() => removeNew(i)}
                            disabled={materialsNew.length === 1}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Grid>

                        <Grid item xs={12}>
                          <TextField
                            label="Ghi chú vật tư"
                            size="small"
                            fullWidth
                            value={m.notes || ""}
                            onChange={(e) => updateNew(i, "notes", e.target.value)}
                            placeholder="Ghi chú cho yêu cầu vật tư này..."
                          />
                        </Grid>
                      </Grid>
                    </Box>
                  ))}

                  <CustomButton
                    variant="outlined"
                    padding="6px 16px"
                    startIcon={<AddIcon />}
                    onClick={addNew}
                  >
                    Thêm vật tư mới
                  </CustomButton>
                </Paper>
              </Grid>
            </>
          )}

          <Grid item xs={12}>
            <TextField
              select
              label="Hành động xử lý"
              fullWidth
              value={action}
              onChange={(e) =>
                setAction(e.target.value as "approve" | "reject")
              }
            >
              <MenuItem value="approve">Phê duyệt kết quả kiểm nghiệm</MenuItem>
              <MenuItem value="reject">Từ chối kết quả kiểm nghiệm</MenuItem>
            </TextField>
          </Grid>

          {action === "reject" && (
            <Grid item xs={12}>
              <TextField
                label="Lý do từ chối"
                fullWidth
                multiline
                minRows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Grid>
          )}
        </Grid>
      </Box>

      <Divider />
      <Box
        sx={{
          p: 2,
          display: "flex",
          justifyContent: "flex-end",
          gap: 2,
          background: "#fafafa",
        }}
      >
        <CustomButton variant="outlined" onClick={onClose} disabled={loading}>
          Hủy
        </CustomButton>
        <CustomButton
          variant="contained"
          onClick={handleSubmit}
          disabled={loading || !canSubmit()}
          bgrColor={action === "approve" ? "#2e7d32" : "#d32f2f"}
        >
          {action === "approve"
            ? "Hoàn tất kiểm nghiệm"
            : "Từ chối kiểm nghiệm"}
        </CustomButton>
      </Box>
    </Dialog>
  );
}
