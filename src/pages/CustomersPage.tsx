import { useEffect, useMemo, useState } from "react";
import { Avatar, Box, Card, CardContent, Fab, IconButton, InputAdornment, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { useAuth } from "@/providers/AuthProvider";
import { Customer, subscribeCustomers, txnsRef, Transaction } from "@/lib/db";
import { useNavigate } from "react-router-dom";
import { fmtMoney } from "@/lib/format";
import { CustomerFormDialog } from "@/components/CustomerFormDialog";
import { getDocs } from "firebase/firestore";

export default function CustomersPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [openAdd, setOpenAdd] = useState(false);

  useEffect(() => { if (user) return subscribeCustomers(user.uid, setCustomers); }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const bals: Record<string, number> = {};
      await Promise.all(customers.map(async (c) => {
        const snap = await getDocs(txnsRef(user.uid, c.id));
        let b = c.openingBalance || 0;
        snap.forEach((d) => { const t = d.data() as Transaction; b += t.type === "credit" ? t.amount : -t.amount; });
        bals[c.id] = b;
      }));
      if (!cancelled) setBalances(bals);
    })();
    return () => { cancelled = true; };
  }, [user, customers]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(s) || (c.phone || "").includes(s));
  }, [customers, q]);

  return (
    <Stack spacing={2}>
      <TextField
        placeholder="Search by name or phone"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
          endAdornment: q ? <IconButton size="small" onClick={() => setQ("")}><CloseIcon /></IconButton> : undefined,
        }}
      />

      <Stack spacing={1}>
        {filtered.map((c) => {
          const b = balances[c.id] ?? c.openingBalance ?? 0;
          return (
            <Card key={c.id} onClick={() => nav(`/customers/${c.id}`)} sx={{ cursor: "pointer" }}>
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{ bgcolor: "primary.main" }}>{c.name.charAt(0).toUpperCase()}</Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={600} noWrap>{c.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{c.phone || "No phone"}</Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography fontWeight={700} color={b > 0 ? "success.main" : b < 0 ? "error.main" : "text.secondary"}>
                      {b === 0 ? "Settled" : fmtMoney(b)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {b > 0 ? "you get" : b < 0 ? "you give" : ""}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card><CardContent><Typography textAlign="center" color="text.secondary">
            {q ? "No customers match your search." : "No customers yet. Tap + to add your first."}
          </Typography></CardContent></Card>
        )}
      </Stack>

      <Fab color="primary" onClick={() => setOpenAdd(true)} sx={{ position: "fixed", right: 20, bottom: 88, zIndex: 20 }} aria-label="add customer">
        <AddIcon />
      </Fab>

      <CustomerFormDialog open={openAdd} onClose={() => setOpenAdd(false)} />
    </Stack>
  );
}
