import { useEffect, useRef, useState } from "react";
import {
  Card, CardContent, Chip, Skeleton, Stack, Typography,
  Box, Button, Fade,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import PeopleIcon from "@mui/icons-material/People";
import AddIcon from "@mui/icons-material/Add";
import { useAuth } from "@/providers/AuthProvider";
import {
  Customer, Expense, Income, Transaction,
  subscribeCustomers, subscribeExpenses, subscribeIncome, txnsRef,
} from "@/lib/db";
import { fmtMoney, startOfDay, endOfDay } from "@/lib/format";
import { getDocs, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

function StatCard({
  label, value, color, icon,
}: {
  label: string; value: string; color: string; icon?: React.ReactNode;
}) {
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

function StatSkeleton() {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Skeleton animation="wave" width="60%" height={16} sx={{ mb: 0.5 }} />
        <Skeleton animation="wave" width="75%" height={28} />
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const nav = useNavigate();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [today, setToday] = useState({ collection: 0, given: 0 });
  // loading stays true until customers subscription fires AND balances are fetched
  const [loading, setLoading] = useState(true);
  const customersReady = useRef(false);

  // Subscribe to customers — mark ready on first fire
  useEffect(() => {
    if (!user) return;
    return subscribeCustomers(user.uid, (rows) => {
      setCustomers(rows);
      customersReady.current = true;
    });
  }, [user]);

  useEffect(() => {
    if (!user) return subscribeExpenses(user.uid, setExpenses);
  }, [user]);

  useEffect(() => {
    if (!user) return subscribeIncome(user.uid, setIncome);
  }, [user]);

  // Fetch balances — only after subscription has fired at least once
  useEffect(() => {
    if (!user || !customersReady.current) return;
    if (customers.length === 0) {
      setBalances({});
      setToday({ collection: 0, given: 0 });
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const bals: Record<string, number> = {};
      let collection = 0, given = 0;
      const tsStart = Timestamp.fromDate(startOfDay());
      const tsEnd = Timestamp.fromDate(endOfDay());

      await Promise.all(
        customers.map(async (c) => {
          const snap = await getDocs(txnsRef(user.uid, c.id));
          let bal = c.openingBalance || 0;
          snap.forEach((d) => {
            const t = d.data() as Transaction;
            bal += t.type === "credit" ? t.amount : -t.amount;
            const ms = t.date?.toMillis?.() ?? 0;
            if (ms >= tsStart.toMillis() && ms <= tsEnd.toMillis()) {
              if (t.type === "payment") collection += t.amount;
              else given += t.amount;
            }
          });
          bals[c.id] = bal;
        })
      );

      if (!cancelled) {
        setBalances(bals);
        setToday({ collection, given });
        setLoading(false);
      }
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
      {/* Net position hero — always visible immediately */}
      <Card sx={{ background: "linear-gradient(135deg, #1976d2 0%, #26a69a 100%)", color: "white" }}>
        <CardContent>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>Net position</Typography>
          {loading ? (
            <>
              <Skeleton animation="wave" width={140} height={44} sx={{ bgcolor: "rgba(255,255,255,0.25)", borderRadius: 1 }} />
              <Stack direction="row" spacing={1} mt={1}>
                <Skeleton animation="wave" width={90} height={24} sx={{ bgcolor: "rgba(255,255,255,0.2)", borderRadius: 4 }} />
                <Skeleton animation="wave" width={90} height={24} sx={{ bgcolor: "rgba(255,255,255,0.2)", borderRadius: 4 }} />
              </Stack>
            </>
          ) : (
            <Fade in timeout={300}>
              <Box>
                <Typography variant="h4" fontWeight={800}>{fmtMoney(toReceive - toPay)}</Typography>
                <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                  <Chip size="small" label={`Get ${fmtMoney(toReceive)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
                  <Chip size="small" label={`Give ${fmtMoney(toPay)}`} sx={{ bgcolor: "rgba(255,255,255,0.2)", color: "white" }} />
                </Stack>
              </Box>
            </Fade>
          )}
        </CardContent>
      </Card>

      {/* Stats grid */}
      {loading ? (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => <StatSkeleton key={i} />)}
          <Box sx={{ gridColumn: "1 / -1" }}><StatSkeleton /></Box>
        </Box>
      ) : (
        <Fade in timeout={300}>
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
        </Fade>
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

        {loading ? (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Box>
                      <Skeleton animation="wave" width={120} height={20} />
                      <Skeleton animation="wave" width={80} height={14} sx={{ mt: 0.5 }} />
                    </Box>
                    <Skeleton animation="wave" width={80} height={20} />
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <Fade in timeout={300}>
            <Stack spacing={1}>
              {customers.length === 0 ? (
                <Card>
                  <CardContent>
                    <Typography color="text.secondary" textAlign="center">
                      No customers yet. Add your first customer from the Customers tab.
                    </Typography>
                  </CardContent>
                </Card>
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
          </Fade>
        )}
      </Box>
    </Stack>
  );
}
