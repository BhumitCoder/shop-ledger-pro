import { useForm } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { Customer, createCustomer, updateCustomer } from "@/lib/db";
import { useAuth } from "@/providers/AuthProvider";
import { useSnackbar } from "notistack";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  customer?: Customer;
}

interface FormData {
  name: string;
  phone: string;
  address: string;
  notes: string;
  openingBalance: number;
  openingType: "get" | "give" | "none";
}

export function CustomerFormDialog({ open, onClose, customer }: Props) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const { register, handleSubmit, reset, watch, formState: { isSubmitting, errors } } = useForm<FormData>({
    defaultValues: { name: "", phone: "", address: "", notes: "", openingBalance: 0, openingType: "none" },
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name,
        phone: customer.phone || "",
        address: customer.address || "",
        notes: customer.notes || "",
        openingBalance: Math.abs(customer.openingBalance || 0),
        openingType: customer.openingBalance > 0 ? "get" : customer.openingBalance < 0 ? "give" : "none",
      });
    } else if (open) {
      reset({ name: "", phone: "", address: "", notes: "", openingBalance: 0, openingType: "none" });
    }
  }, [customer, open, reset]);

  const openingType = watch("openingType");

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    const opening = data.openingType === "get" ? Number(data.openingBalance) : data.openingType === "give" ? -Number(data.openingBalance) : 0;
    try {
      if (customer) {
        await updateCustomer(user.uid, customer.id, {
          name: data.name.trim(), phone: data.phone.trim(), address: data.address.trim(), notes: data.notes.trim(), openingBalance: opening,
        });
        enqueueSnackbar("Customer updated", { variant: "success" });
      } else {
        await createCustomer(user.uid, {
          name: data.name.trim(), phone: data.phone.trim(), address: data.address.trim(), notes: data.notes.trim(), openingBalance: opening,
        });
        enqueueSnackbar("Customer added", { variant: "success" });
      }
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Failed to save", { variant: "error" });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{customer ? "Edit customer" : "Add customer"}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Customer name" autoFocus error={!!errors.name} helperText={errors.name?.message}
              {...register("name", { required: "Name is required" })} />
            <TextField label="Phone number" type="tel" inputMode="tel"
              {...register("phone", { pattern: { value: /^[0-9+\-\s]{6,15}$/, message: "Invalid phone" } })}
              error={!!errors.phone} helperText={errors.phone?.message} />
            <TextField label="Address" multiline minRows={2} {...register("address")} />
            <TextField label="Notes" multiline minRows={2} {...register("notes")} />
            <Stack direction="row" spacing={1}>
              <TextField select label="Opening" {...register("openingType")} value={openingType} sx={{ maxWidth: 140 }}>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="get">Will get</MenuItem>
                <MenuItem value="give">Will give</MenuItem>
              </TextField>
              <TextField label="Amount" type="number" inputMode="decimal" disabled={openingType === "none"}
                {...register("openingBalance", { valueAsNumber: true, min: 0 })} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>{customer ? "Save" : "Add"}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
