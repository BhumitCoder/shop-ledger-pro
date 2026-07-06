import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box, Button, Card, CardContent, Chip, Fab, MenuItem, Skeleton, Stack,
  Tab, Tabs, TextField, Typography, IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAuth } from "@/providers/AuthProvider";
import { Expense, Income, deleteExpense, deleteIncome, subscribeExpenses, subscribeIncome } from "@/lib/db";
import { fmtDate, fmtMoney } from "@/lib/format";
import { ExpenseFormDialog } from "@/components/ExpenseFormDialog";
import { useSnackbar } from "notistack";
import { useLocation } from "react-router-dom";

export default function ExpensesPage() {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const location = useLocation();
  const [tab, setTab] = useState(0);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogMode, setDialogMode] = useState<"expense" | "income" | null>(null);

  // Auto-open income dialog when navigated here from Dashboard "Income" quick action
  const handledState = useRef(false);
  useEffect(() => {
    if (!handledState.current && (location.state as any)?.openIncome) {
      handledState.current = true;
      setTab(1);
      setDialogMode("income");
    }
  }, [location.state]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const unsub1 = subscribeExpenses(user.uid, (rows) => { setExpenses(rows); setLoading(false); });
    const unsub2 = subscribeIncome(user.uid, setIncome);
    return () => { unsub1(); unsub2(); };
  }, [user]);

  const totalExpenses = useMemo(() => expenses.reduce((a, b) => a + b.amount, 0), [expenses]);
  const totalIncome = useMemo(() => income.reduce((a, b) => a + b.amount, 0), [income]);

  const handleDeleteExpense = async (id: string) => {
    if (!user || !confirm("Delete this expense?")) return;
    try { await deleteExpense(user.uid, id); enqueueSnackbar("Expense deleted", { variant: "success" }); }
    catch (e: any) { enqueueSnackbar(e?.message || "Delete failed", { variant: "error" }); }
  };

  const handleDeleteIncome = async (id: string) => {
    if (!user || !confirm("Delete this income entry?")) return;
    try { await deleteIncome(user.uid, id); enqueueSnackbar("Income deleted", { variant: "success" }); }
    catch (e: any) { enqueueSnackbar(e?.message || "Delete failed", { variant: "error" }); }
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
        <Card sx={{ bgcolor: "error.main", color: "white" }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="caption">Total Expenses</Typography>
            <Typography variant="h6" fontWeight={800}>{fmtMoney(totalExpenses)}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ bgcolor: "success.main", color: "white" }}>
          <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
            <Typography variant="caption">Total Income</Typography>
            <Typography variant="h6" fontWeight={800}>{fmtMoney(totalIncome)}</Typography>
          </CardContent>
        </Card>
      </Box>

      <Card sx={{ bgcolor: tab === 0 ? (totalIncome - totalExpenses >= 0 ? "success.light" : "error.light") : "transparent" }}>
        <CardContent sx={{ py: 1, "&:last-child": { pb: 1 } }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">Net (Income − Expenses)</Typography>
            <Typography fontWeight={800} color={totalIncome - totalExpenses >= 0 ? "success.dark" : "error.dark"}>
              {fmtMoney(totalIncome - totalExpenses)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
        <Tab label={`Expenses (${expenses.length})`} />
        <Tab label={`Income (${income.length})`} />
      </Tabs>

      {loading ? (
        <Stack spacing={1}>
          {[1, 2, 3].map((i) => <Skeleton animation="wave" key={i} variant="rounded" height={72} />)}
        </Stack>
      ) : tab === 0 ? (
        <Stack spacing={1}>
          {expenses.length === 0 && (
            <Card><CardContent>
              <Typography textAlign="center" color="text.secondary">No expenses yet. Tap + to add one.</Typography>
            </CardContent></Card>
          )}
          {expenses.map((e) => (
            <Card key={e.id}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={e.category} size="small" color="error" variant="outlined" />
                      {e.vendor && <Typography variant="caption" color="text.secondary">{e.vendor}</Typography>}
                    </Stack>
                    {e.description && <Typography variant="body2" mt={0.5}>{e.description}</Typography>}
                    <Typography variant="caption" color="text.secondary">{fmtDate(e.date)}</Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={800} color="error.main">{fmtMoney(e.amount)}</Typography>
                    <IconButton size="small" color="error" onClick={() => handleDeleteExpense(e.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Stack spacing={1}>
          {income.length === 0 && (
            <Card><CardContent>
              <Typography textAlign="center" color="text.secondary">No income entries yet. Tap + to add one.</Typography>
            </CardContent></Card>
          )}
          {income.map((i) => (
            <Card key={i.id}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={i.category} size="small" color="success" variant="outlined" />
                      {i.source && <Typography variant="caption" color="text.secondary">{i.source}</Typography>}
                    </Stack>
                    {i.description && <Typography variant="body2" mt={0.5}>{i.description}</Typography>}
                    <Typography variant="caption" color="text.secondary">{fmtDate(i.date)}</Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography fontWeight={800} color="success.main">{fmtMoney(i.amount)}</Typography>
                    <IconButton size="small" color="error" onClick={() => handleDeleteIncome(i.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Spacer so last card clears the FAB */}
      <Box sx={{ height: 80 }} />

      <Fab
        color={tab === 0 ? "error" : "success"}
        onClick={() => setDialogMode(tab === 0 ? "expense" : "income")}
        sx={{ position: "fixed", right: 20, bottom: "calc(64px + env(safe-area-inset-bottom) + 28px)", zIndex: 20 }}
        aria-label="add"
      >
        <AddIcon />
      </Fab>

      <ExpenseFormDialog
        open={!!dialogMode}
        onClose={() => setDialogMode(null)}
        mode={dialogMode || "expense"}
      />
    </Stack>
  );
}
