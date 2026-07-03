import { useEffect, useState } from "react";
import { Card, CardContent, Chip, Stack, Typography, Box } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import PeopleIcon from "@mui/icons-material/People";
import { useAuth } from "@/providers/AuthProvider";
import { subscribeCustomers, Customer, Transaction, txnsRef } from "@/lib/db";
import { fmtMoney, startOfDay, endOfDay } from "@/lib/format";
import { getDocs, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
          {icon}
          <Typography variant="body2" color="text.secondary">{label}</Typography>
        </Stack>
        <Typography variant="h6" fontWeight={800} sx={{ color }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [today, setToday] = useState({ collection: 0, given: 0 });

  useEffect(() => {
    if (!user) return;
    return subscribeCustomers(user.uid, setCustomers);
  }, [user]);

  // Compute balances + today's totals from all transactions
  useEffect(() => {
    if (!user || customers.length === 0) { setBalances({}); setToday({ collection: 0, given: 0 }); return; }
    let cancelled = false;
    (async () => {
      const bals: Record<string, number> = {};
      let collection = 0, given = 0;
      const tsStart = Timestamp.fromDate(startOfDay());
      const tsEnd = Timestamp.fromDate(endOfDay());
      await Promise.all(customers.map(async (c) => {
        const snap = await getDocs(txnsRef(user.uid, c.id));
        let bal = c.openingBalance || 0;
        snap.forEach((d) => {
          const t = d.data() as Transaction;
          bal += t.type === "credit" ? t.amount : -t.amount;
          if (t.date && t.date.toMillis() >= tsStart.toMillis() && t.date.toMillis() <= tsEnd.toMillis()) {
            if (t.type === "payment") collection += t.amount;
            else given += t.amount;
          }
        });
        bals[c.id] = bal;
      }));
      if (!cancelled) { setBalances(bals); setToday({ collection, given }); }
    })();
    return () => { cancelled = true; };
  }, [user, customers]);

  const toReceive = Object.values(balances).filter((b) => b > 0).reduce((a, b) => a + b, 0);
  const toPay = Object.values(balances).filter((b) => b < 0).reduce((a, b) => a + Math.abs(b), 0);

  return (
    <Stack spacing={2}>
      <Card sx={{ background: "linear-gradient(135deg, #1976d2 0%, #26a69a 100%)", color: "white" }}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>Net position</Typography>
          <Typography variant="h4" fontWeight={800}>{fmtMoney(toReceive - toPay)}</Typography>
          <Stack direction="row" spacing={1} mt={1}>
            <Chip size="small" label={`Receive ${fmtMoney(toReceive)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
            <Chip size="small" label={`Pay ${fmtMoney(toPay)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 6 }}><StatCard label="You will get" value={fmtMoney(toReceive)} color="success.main" icon={<ArrowDownwardIcon color="success" fontSize="small" />} /></Grid>
        <Grid size={{ xs: 6 }}><StatCard label="You will give" value={fmtMoney(toPay)} color="error.main" icon={<ArrowUpwardIcon color="error" fontSize="small" />} /></Grid>
        <Grid size={{ xs: 6 }}><StatCard label="Today collected" value={fmtMoney(today.collection)} color="success.main" /></Grid>
        <Grid size={{ xs: 6 }}><StatCard label="Today given" value={fmtMoney(today.given)} color="error.main" /></Grid>
        <Grid size={{ xs: 12 }}><StatCard label="Total customers" value={String(customers.length)} color="text.primary" icon={<PeopleIcon fontSize="small" />} /></Grid>
      </Grid>

      <Box>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>Recent customers</Typography>
        <Stack spacing={1}>
          {customers.slice(0, 5).map((c) => {
            const b = balances[c.id] ?? c.openingBalance ?? 0;
            return (
              <Card key={c.id} onClick={() => nav(`/customers/${c.id}`)} sx={{ cursor: "pointer" }}>
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Typography fontWeight={600}>{c.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.phone || "—"}</Typography>
                    </Box>
                    <Typography fontWeight={700} color={b > 0 ? "success.main" : b < 0 ? "error.main" : "text.secondary"}>
                      {b === 0 ? "Settled" : `${b > 0 ? "Get" : "Give"} ${fmtMoney(b)}`}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
          {customers.length === 0 && (
            <Card><CardContent><Typography color="text.secondary" textAlign="center">No customers yet. Add your first customer from the Customers tab.</Typography></CardContent></Card>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
