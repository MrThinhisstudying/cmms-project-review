import React, { useEffect, useState } from "react";
import { Dialog, Box, Typography, IconButton, TextField } from "@mui/material";
import { DndProvider } from "react-dnd";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import CategoryItem from "../CategoryItem";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CustomButton } from "../../../../components/Button";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCategoryModal from "../AddCategoryModal";
import ConfirmModal from "../../../../components/Modal";

export default function ManageCategoryModal({
  open,
  handleClose,
  categories,
}: any) {
  const { updateCategory, deleteCategory, refreshAll } = useInventoryContext();
  const [local, setLocal] = useState<any[]>([]);
  const [editingMap, setEditingMap] = useState<Record<string, boolean>>({});
  const [editValues, setEditValues] = useState<
    Record<string, { name: string; description: string }>
  >({});
  const [openAdd, setOpenAdd] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    setLocal((categories || []).map((c: any) => ({ ...c })));
    setEditingMap({});
    setEditValues({});
  }, [categories]);

  const handleAdd = () => {
    setOpenAdd(true);
  };

  const move = (from: number, to: number) => {
    const copied = [...local];
    const [m] = copied.splice(from, 1);
    copied.splice(to, 0, m);
    setLocal(copied);
  };

  const startEdit = (
    id: any,
    currentName: string,
    currentDescription?: string
  ) => {
    setEditingMap((s) => ({ ...s, [id]: true }));
    setEditValues((s) => ({
      ...(s ?? {}),
      [id]: { name: currentName, description: currentDescription ?? "" },
    }));
  };

  const cancelEdit = (id: any) => {
    setEditingMap((s) => ({ ...s, [id]: false }));
    setEditValues((s) => {
      const copy = { ...(s ?? {}) };
      delete copy[id];
      return copy;
    });
  };

  const handleSave = async (id: any) => {
    const vals = (editValues ?? {})[id];
    if (!vals) return;
    const name = (vals.name ?? "").trim();
    const description = vals.description ?? "";
    if (!name) return;
    try {
      await updateCategory(id, { name, description });
      await refreshAll();
      cancelEdit(id);
    } catch (err) {}
  };

  const handleDeleteClick = (id: number) => {
    setSelectedId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedId) return;
    try {
      await deleteCategory(selectedId);
      await refreshAll();
    } finally {
      setSelectedId(null);
      setConfirmOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
        <Box sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography fontSize={18} fontWeight={600}>
              Quản lý danh mục
            </Typography>
            <CustomButton
              variant="contained"
              id="add_category_btn"
              fullWidth={false}
              onClick={handleAdd}
              sx={{ height: "40px" }}
            >
              Thêm mới
            </CustomButton>
          </Box>

          <DndProvider backend={HTML5Backend}>
            <Box>
              {local.length === 0 ? (
                <Box
                  sx={{
                    border: "1px dashed #D0D5DD",
                    borderRadius: 2,
                    p: 4,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#98A2B3",
                    textAlign: "center",
                    gap: 1,
                    background: "#FAFAFA",
                  }}
                >
                  <Typography fontSize={16} fontWeight={500}>
                    Chưa có danh mục nào
                  </Typography>
                  <Typography fontSize={14} color="#98A2B3">
                    Nhấn nút <b>Thêm mới</b> để thêm danh mục mới
                  </Typography>
                </Box>
              ) : (
                local.map((c, i) => (
                  <CategoryItem
                    key={c.id}
                    category={c}
                    index={i}
                    moveCategory={move}
                  >
                    <Box
                      sx={{
                        p: 2,
                        border: "1px solid #E8EAF0",
                        borderRadius: 1,
                        mb: 1,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 2,
                        transition: "0.2s",
                        "&:hover": { backgroundColor: "#F9FAFB" },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                          flex: 1,
                        }}
                      >
                        {editingMap[c.id] ? (
                          <>
                            <TextField
                              value={(editValues ?? {})[c.id]?.name ?? ""}
                              onChange={(e) =>
                                setEditValues((s: any) => ({
                                  ...(s ?? {}),
                                  [c.id]: {
                                    ...(s?.[c.id] ?? {
                                      name: "",
                                      description: "",
                                    }),
                                    name: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Tên danh mục"
                              fullWidth
                              size="small"
                            />
                            <TextField
                              value={
                                (editValues ?? {})[c.id]?.description ?? ""
                              }
                              onChange={(e) =>
                                setEditValues((s: any) => ({
                                  ...(s ?? {}),
                                  [c.id]: {
                                    ...(s?.[c.id] ?? {
                                      name: "",
                                      description: "",
                                    }),
                                    description: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Mô tả (tùy chọn)"
                              fullWidth
                              size="small"
                            />
                          </>
                        ) : (
                          <>
                            <Typography
                              sx={{ wordBreak: "break-word", fontWeight: 600 }}
                            >
                              {c.name}
                            </Typography>
                            <Typography
                              sx={{
                                wordBreak: "break-word",
                                color: "text.secondary",
                                fontSize: 13,
                                fontStyle: c.description ? "normal" : "italic",
                                opacity: c.description ? 1 : 0.7,
                              }}
                            >
                              {c.description ? c.description : "Chưa có mô tả"}
                            </Typography>
                          </>
                        )}
                      </Box>

                      <Box sx={{ display: "flex", gap: 1 }}>
                        {editingMap[c.id] ? (
                          <>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleSave(c.id)}
                            >
                              <SaveIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => cancelEdit(c.id)}
                            >
                              <EditIcon />
                            </IconButton>
                          </>
                        ) : (
                          <>
                            <IconButton
                              size="small"
                              onClick={() =>
                                startEdit(c.id, c.name, c.description)
                              }
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteClick(c.id)}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </Box>
                  </CategoryItem>
                ))
              )}
            </Box>
          </DndProvider>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <CustomButton
              variant="contained"
              id="done_button"
              fullWidth={false}
              onClick={handleClose}
              sx={{ height: "40px" }}
            >
              Tải lại
            </CustomButton>
          </Box>
        </Box>
      </Dialog>

      <AddCategoryModal
        open={openAdd}
        handleClose={async () => {
          setOpenAdd(false);
          await refreshAll();
        }}
      />
      <ConfirmModal
        open={confirmOpen}
        title="Xóa danh mục"
        content="Bạn có chắc chắn muốn xóa danh mục này? Hành động này không thể hoàn tác."
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
