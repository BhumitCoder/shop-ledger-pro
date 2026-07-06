import { useForm } from "react-hook-form";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import { PaymentMethod, Transaction, TxnType, createTransaction, updateTransaction } from "@/lib/db";
import { useAuth } from "@/providers/AuthProvider";
import { useSnackbar } from "notistack";
import { Timestamp } from "firebase/firestore";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  customerId: string;
  type: TxnType;
  /** Pass to edit an existing entry instead of creating */
  transaction?: Transaction | null;
}

interface FormData {
  amount: number;
  description: string;
  paymentMethod: PaymentMethod;
  date: string; // yyyy-mm-dd
}

const methods: PaymentMethod[] = ["cash", "upi", "bank", "cheque", "card", "other"];

const toDateStr = (ts: Timestamp) => ts.toDate().toISOString().slice(0, 10);

export function TransactionFormDialog({ open, onClose, customerId, type, transaction }: Props) {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const isEdit = !!transaction;

  const { register, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<FormData>({
    defaultValues: { amount: undefined as any, description: "", paymentMethod: "cash", date: new Date().toISOString().slice(0, 10) },
  });

  useEffect(() => {
    if (open) {
      if (transaction) {
        reset({
          amount: transaction.amount,
          description: transaction.description || "",
          paymentMethod: transaction.paymentMethod || "cash",
          date: toDateStr(transaction.date),
        });
      } else {
        reset({ amount: undefined as any, description: "", paymentMethod: "cash", date: new Date().toISOString().slice(0, 10) });
      }
    }
  }, [open, transaction, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    if (!data.amount || data.amount <= 0) { enqueueSnackbar("Enter a valid amount", { variant: "warning" }); return; }
    try {
      const payload = {
        type,
        amount: Number(data.amount),
        description: data.description.trim(),
        paymentMethod: data.paymentMethod,
        date: Timestamp.fromDate(new Date(data.date)),
      };
      if (isEdit && transaction) {
        await updateTransaction(user.uid, customerId, transaction.id, payload);
        enqueueSnackbar("Entry updated", { variant: "success" });
      } else {
        await createTransaction(user.uid, customerId, payload);
        enqueueSnackbar(type === "credit" ? "Credit entry added" : "Payment received", { variant: "success" });
      }
      onClose();
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Failed to save", { variant: "error" });
    }
  };

  const title = isEdit
    ? (type === "credit" ? "Edit — You gave ₹" : "Edit — You got ₹")
    : (type === "credit" ? "You gave ₹" : "You got ₹");

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Amount (₹)"
              type="number"
              autoFocus
              inputMode="decimal"
              error={!!errors.amount}
              helperText={errors.amount?.message}
              inputProps={{ onFocus: (e: React.FocusEvent<HTMLInputElement>) => e.target.select() }}
              {...register("amount", { valueAsNumber: true, required: "Amount required", min: { value: 0.01, message: "Must be > 0" } })}
            />
            <TextField label="Details (optional)" placeholder="e.g. Sugar 5kg" {...register("description")} />
            <TextField select label="Payment method" defaultValue="cash" {...register("paymentMethod")}>
              {methods.map((m) => <MenuItem key={m} value={m}>{m.toUpperCase()}</MenuItem>)}
            </TextField>
            <TextField label="Date" type="date" InputLabelProps={{ shrink: true }} {...register("date", { required: true })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" color={type === "credit" ? "error" : "success"} disabled={isSubmitting}>
            {isEdit ? "Update" : "Save"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
