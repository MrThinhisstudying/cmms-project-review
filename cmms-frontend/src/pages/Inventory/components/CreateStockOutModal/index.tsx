import React, { useEffect } from "react";
import { Dialog, Box, Typography, TextField } from "@mui/material";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useInventoryContext } from "../../../../context/InventoryContext/InventoryContext";
import { CustomButton } from "../../../../components/Button";

const schema = yup
  .object({
    quantity: yup
      .number()
      .typeError("Số lượng phải là số")
      .required("Vui lòng nhập số lượng")
      .moreThan(0, "Số lượng phải lớn hơn 0"),
    note: yup.string().optional().max(500),
  })
  .required();

type FormValues = yup.InferType<typeof schema>;

export default function CreateStockOutModal({
  open,
  onClose,
  item,
  onSaved,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  item: any;
  onSaved?: (payload?: any) => void;
  onError?: (payload?: any) => void;
}) {
  const { requestStockOut } = useInventoryContext();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: { quantity: undefined, note: "" },
  });

  useEffect(() => {
    if (open) reset({ quantity: undefined, note: "" });
  }, [open, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    const qty = Number(values.quantity ?? 0);
    const available = Number(item?.quantity ?? 0);

    if (qty > available) {
      setError("quantity", {
        type: "manual",
        message: `Số lượng không được vượt quá tồn kho hiện có (${available})`,
      });
      return;
    }

    try {
      await requestStockOut({
        item_id: item.item_id ?? item.id,
        quantity: qty,
        note: values.note ?? "",
      });
      onSaved?.({ message: "Yêu cầu xuất kho đã được tạo" });
      reset({ quantity: undefined, note: "" });
      onClose();
    } catch (err: any) {
      const message = err?.message ?? "Tạo yêu cầu xuất kho thất bại";
      onError?.({ message });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <Box sx={{ p: 3 }}>
        <Typography fontSize={18} fontWeight={600} mb={2}>
          Tạo phiếu xuất — {item?.name ?? ""}
        </Typography>

        <Typography fontSize={14} color="text.secondary" mb={1}>
          Tồn hiện có: <strong>{item?.quantity ?? 0}</strong>
        </Typography>

        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <Controller
            name="quantity"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Số lượng xuất"
                fullWidth
                margin="normal"
                type="number"
                inputProps={{ step: "0.0001" }}
                error={!!errors.quantity}
                helperText={errors.quantity?.message}
              />
            )}
          />

          <Controller
            name="note"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Ghi chú (tùy chọn)"
                fullWidth
                margin="normal"
                multiline
                rows={3}
                error={!!errors.note}
                helperText={errors.note?.message}
              />
            )}
          />

          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 2, mt: 2 }}
          >
            <CustomButton
              variant="contained"
              id="cancel_button"
              fullWidth={false}
              onClick={onClose}
              sx={{ height: "40px", flex: 1 }}
            >
              Huỷ
            </CustomButton>
            <CustomButton
              variant="contained"
              id="save_button"
              fullWidth={false}
              type="submit"
              disabled={isSubmitting}
              sx={{ height: "40px", flex: 1 }}
            >
              Gửi yêu cầu
            </CustomButton>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
