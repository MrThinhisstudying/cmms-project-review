import React from "react";
import { Dialog, Box, Typography, TextField } from "@mui/material";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { CustomButton } from "../../../../components/Button";

interface FormValues {
  name: string;
  description?: string;
}

const schema = yup.object().shape({
  name: yup
    .string()
    .trim()
    .required("Vui lòng nhập tên danh mục")
    .max(100, "Tên danh mục tối đa 100 ký tự"),
  description: yup.string().max(255, "Mô tả tối đa 255 ký tự").optional(),
});

export default function AddCategoryModal({
  open,
  handleClose,
}: {
  open: boolean;
  handleClose: () => void;
}) {
  const { createCategory, refreshAll } = useInventoryContext();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      await createCategory({
        name: values.name.trim(),
        description: values.description ?? "",
      });
      await refreshAll();
      reset();
      handleClose();
    } catch {
      handleClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <Box sx={{ p: 3 }}>
        <Typography fontSize={18} fontWeight={600} mb={2}>
          Thêm danh mục mới
        </Typography>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Tên danh mục"
                fullWidth
                size="small"
                error={!!errors.name}
                helperText={errors.name?.message as string}
                sx={{ mb: 2 }}
              />
            )}
          />

          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Mô tả (tùy chọn)"
                fullWidth
                size="small"
                error={!!errors.description}
                helperText={errors.description?.message as string}
              />
            )}
          />

          <Box
            sx={{ display: "flex", justifyContent: "flex-end", mt: 3, gap: 2 }}
          >
            <CustomButton
              variant="contained"
              id="cancel_add_category"
              fullWidth={false}
              onClick={handleClose}
              sx={{ height: "40px" }}
            >
              Huỷ
            </CustomButton>
            <CustomButton
              variant="contained"
              id="confirm_add_category"
              fullWidth={false}
              type="submit"
              sx={{ height: "40px" }}
            >
              Thêm
            </CustomButton>
          </Box>
        </form>
      </Box>
    </Dialog>
  );
}
