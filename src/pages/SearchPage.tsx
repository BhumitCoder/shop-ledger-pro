import { useEffect, useMemo, useState } from "react";
import {
  Avatar, Box, Card, CardContent, Chip, InputAdornment, Skeleton,
  Stack, TextField, Typography, IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { Customer, Expense, Income, Transaction, subscribeCustomers, subscribeExpenses, subscribeIncome, txnsRef } from "@/lib/db";
import { fmtDate, fmtMoney } from "@/lib/format";
import { getDocs } from "firebase/firestore";

type Result =
  | { kind: "customer"; item: Customer }
  | { kind: "transaction"; item: Transaction; customer: Customer }
  | { kind: "expense"; item: Expense }
  | { kind: "income"; item: Income };

export default function SearchPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [txns, setTxns] = useState<{ txn: Transaction; customer: Customer }[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsubs: (() => void)[] = [];
    unsubs.push(subscribeCustomers(user.uid, setCustomers));
    unsubs.push(subscribeExpenses(user.uid, setExpenses));
    unsubs.push(subscribeIncome(user.uid, setIncome));
    return () => unsubs.forEach((u) => u());
  }, [user]);

  useEffect(() => {
    if (!user || customers.length === 0) { setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const all: { txn: Transaction; customer: Customer }[] = [];
      await Promise.all(
        customers.map(async (c) => {
          const snap = await getDocs(txnsRef(user.uid, c.id));
          snap.forEach((d) => all.push({ txn: { id: d.id, customerId: c.id, ...(d.data() as any) }, customer: c }));
        })
      );
      if (!cancelled) { setTxns(all); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, customers]);

  const results = useMemo<Result[]>(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const out: Result[] = [];
    customers.forEach((c) => {
      if (c.name.toLowerCase().includes(s) || (c.phone || "").includes(s) || (c.address || "").toLowerCase().includes(s)) {
        out.push({ kind: "customer", item: c });
      }
    });
    txns.forEach(({ txn, customer }) => {
      if (
        (txn.description || "").toLowerCase().includes(s) ||
        String(txn.amount).includes(s) ||
        customer.name.toLowerCase().includes(s)
      ) {
        out.push({ kind: "transaction", item: txn, customer });
      }
    });
    expenses.forEach((e) => {
      if (
        (e.description || "").toLowerCase().includes(s) ||
        (e.vendor || "").toLowerCase().includes(s) ||
        e.category.toLowerCase().includes(s) ||
        String(e.amount).includes(s)
      ) {
        out.push({ kind: "expense", item: e });
      }
    });
    income.forEach((i) => {
      if (
        (i.description || "").toLowerCase().includes(s) ||
        (i.source || "").toLowerCase().includes(s) ||
        i.category.toLowerCase().includes(s) ||
        String(i.amount).includes(s)
      ) {
        out.push({ kind: "income", item: i });
      }
    });
    return out.slice(0, 50);
  }, [q, customers, txns, expenses, income]);

  return (
    <Stack spacing={2}>
      <TextField
        autoFocus
        placeholder="Search customers, entries, expenses…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          endAdornment: q ? (
            <IconButton size="small" onClick={() => setQ("")}><CloseIcon /></IconButton>
          ) : undefined,
        }}
      />

      {q.length > 0 && q.length < 2 && (
        <Typography variant="body2" color="text.secondary" textAlign="center">Type at least 2 characters…</Typography>
      )}

      {loading && q.length >= 2 && (
        <Stack spacing={1}>{[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={64} />)}</Stack>
      )}

      {!loading && q.length >= 2 && results.length === 0 && (
        <Card><CardContent>
          <Typography textAlign="center" color="text.secondary">No results for "{q}"</Typography>
        </CardContent></Card>
      )}

      {results.map((r, idx) => {
        if (r.kind === "customer") {
          return (
            <Card key={`c-${r.item.id}-${idx}`} onClick={() => nav(`/customers/${r.item.id}`)} sx={{ cursor: "pointer" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ bgcolor: "primary.main", width: 36, height: 36, fontSize: 16 }}>{r.item.name[0]?.toUpperCase()}</Avatar>
                  <Box flex={1}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontWeight={600}>{r.item.name}</Typography>
                      <Chip label="Customer" size="small" color="primary" variant="outlined" />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{r.item.phone || "No phone"}</Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        }
        if (r.kind === "transaction") {
          return (
            <Card key={`t-${r.item.id}-${idx}`} onClick={() => nav(`/customers/${r.item.customerId}`)} sx={{ cursor: "pointer" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={r.item.type === "credit" ? "Credit" : "Payment"}
                        size="small"
                        color={r.item.type === "credit" ? "error" : "success"}
                        variant="outlined"
                      />
                      <Typography variant="body2">{r.customer.name}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {r.item.description || ""} · {fmtDate(r.item.date)}
                    </Typography>
                  </Box>
                  <Typography fontWeight={700} color={r.item.type === "credit" ? "error.main" : "success.main"}>
                    {fmtMoney(r.item.amount)}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          );
        }
        if (r.kind === "expense") {
          return (
            <Card key={`e-${r.item.id}-${idx}`}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label="Expense" size="small" color="error" variant="outlined" />
                      <Typography variant="body2">{r.item.category}</Typography>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      {r.item.vendor || ""} {r.item.description || ""} · {fmtDate(r.item.date)}
                    </Typography>
                  </Box>
                  <Typography fontWeight={700} color="error.main">{fmtMoney(r.item.amount)}</Typography>
                </Stack>
              </CardContent>
            </Card>
          );
        }
        return (
          <Card key={`i-${r.item.id}-${idx}`}>
            <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip label="Income" size="small" color="success" variant="outlined" />
                    <Typography variant="body2">{r.item.category}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {r.item.source || ""} {r.item.description || ""} · {fmtDate(r.item.date)}
                  </Typography>
                </Box>
                <Typography fontWeight={700} color="success.main">{fmtMoney(r.item.amount)}</Typography>
              </Stack>
            </CardContent>
          </Card>
        );
      })}

      {q.length === 0 && (
        <Box textAlign="center" pt={4}>
          <SearchIcon sx={{ fontSize: 64, color: "text.disabled" }} />
          <Typography color="text.secondary" mt={1}>Search customers, transactions, expenses and income</Typography>
        </Box>
      )}
    </Stack>
  );
}
