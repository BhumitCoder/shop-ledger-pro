import { useEffect, useState } from "react";
import { Card, CardContent, Chip, Skeleton, Stack, Typography, Box, Button } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import PeopleIcon from "@mui/icons-material/People";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "@/providers/AuthProvider";
import { Customer, Expense, Income, Transaction, subscribeCustomers, subscribeExpenses, subscribeIncome, txnsRef } from "@/lib/db";
import { fmtMoney, startOfDay, endOfDay } from "@/lib/format";
import { getDocs, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Stack direction="row" spacing={0.5} alignItems="center" mb={0.5}>
          {icon}
          <Typography variant="caption" color="text.secondary">{label}</Typography>
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
    if (!user) return;
    if (customers.length === 0) { setBalances({}); setToday({ collection: 0, given: 0 }); setLoading(false); return; }
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
      if (!cancelled) { setBalances(bals); setToday({ collection, given }); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, customers]);

  const toReceive = Object.values(balances).filter((b) => b > 0).reduce((a, b) => a + b, 0);
  const toPay = Object.values(balances).filter((b) => b < 0).reduce((a, b) => a + Math.abs(b), 0);

  const todayStart = startOfDay().getTime();
  const todayExpenses = expenses.filter((e) => e.date.toMillis() >= todayStart).reduce((a, b) => a + b.amount, 0);
  const todayIncome = income.filter((i) => i.date.toMillis() >= todayStart).reduce((a, b) => a + b.amount, 0);
  const todayProfit = today.collection + todayIncome - todayExpenses;

  return (
    <Stack spacing={2}>
      {/* Net position hero card */}
      <Card sx={{ background: "linear-gradient(135deg, #1976d2 0%, #26a69a 100%)", color: "white" }}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>Net position</Typography>
          <Typography variant="h4" fontWeight={800}>{fmtMoney(toReceive - toPay)}</Typography>
          <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
            <Chip size="small" label={`Get ${fmtMoney(toReceive)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
            <Chip size="small" label={`Give ${fmtMoney(toPay)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
          </Stack>
        </CardContent>
      </Card>

      {/* Stats grid */}
      {loading ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} variant="rounded" height={72} />)}
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          <StatCard label="You will get" value={fmtMoney(toReceive)} color="success.main" icon={<ArrowDownwardIcon color="success" fontSize="small" />} />
          <StatCard label="You will give" value={fmtMoney(toPay)} color="error.main" icon={<ArrowUpwardIcon color="error" fontSize="small" />} />
          <StatCard label="Today collected" value={fmtMoney(today.collection)} color="success.main" />
          <StatCard label="Today credit given" value={fmtMoney(today.given)} color="error.main" />
          <StatCard label="Today expenses" value={fmtMoney(todayExpenses)} color="error.main" />
          <StatCard label="Today profit" value={fmtMoney(todayProfit)} color={todayProfit >= 0 ? "success.main" : "error.main"} />
          <Box sx={{ gridColumn: "1 / -1" }}>
            <StatCard label="Total customers" value={String(customers.length)} color="text.primary" icon={<PeopleIcon fontSize="small" />} />
          </Box>
        </Box>
      )}

      {/* Quick actions */}
      <Box>
        <Typography variant="subtitle1" fontWeight={700} mb={1}>Quick Actions</Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => nav("/customers")} sx={{ flex: 1 }}>
            Customer
          </Button>
          <Button variant="outlined" size="small" color="error" startIcon={<AddIcon />} onClick={() => nav("/expenses")} sx={{ flex: 1 }}>
            Expense
          </Button>
          <Button variant="outlined" size="small" color="success" startIcon={<AddIcon />} onClick={() => nav("/expenses", { state: { openIncome: true } })} sx={{ flex: 1 }}>
            Income
          </Button>
        </Stack>
      </Box>

      {/* Recent customers */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
          <Typography variant="subtitle1" fontWeight={700}>Recent customers</Typography>
          <Button size="small" onClick={() => nav("/customers")}>See all</Button>
        </Stack>
        <Stack spacing={1}>
          {loading ? (
            [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={64} />)
          ) : customers.length === 0 ? (
            <Card><CardContent>
              <Typography color="text.secondary" textAlign="center">
                No customers yet. Add your first customer from the Customers tab.
              </Typography>
            </CardContent></Card>
          ) : (
            customers.slice(0, 5).map((c) => {
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
                        {b === 0 ? "Settled" : `${b > 0 ? "Get" : "Give"} ${fmtMoney(Math.abs(b))}`}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
