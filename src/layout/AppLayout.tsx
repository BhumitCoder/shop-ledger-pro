import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar, Box, BottomNavigation, BottomNavigationAction,
  Container, IconButton, Paper, Toolbar, Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";
import SearchIcon from "@mui/icons-material/Search";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useThemeMode } from "@/theme/ThemeModeProvider";

const tabs = [
  { to: "/", label: "Home", icon: <DashboardIcon /> },
  { to: "/customers", label: "Customers", icon: <PeopleIcon /> },
  { to: "/expenses", label: "Expenses", icon: <AccountBalanceWalletIcon /> },
  { to: "/reports", label: "Reports", icon: <AssessmentIcon /> },
  { to: "/settings", label: "Settings", icon: <SettingsIcon /> },
];

export default function AppLayout() {
  const nav = useNavigate();
  const loc = useLocation();
  const { mode, toggle } = useThemeMode();

  const currentTab = (() => {
    if (loc.pathname === "/") return 0;
    if (loc.pathname.startsWith("/customers")) return 1;
    if (loc.pathname.startsWith("/expenses")) return 2;
    if (loc.pathname.startsWith("/reports")) return 3;
    if (loc.pathname.startsWith("/settings")) return 4;
    return false;
  })();

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="primary" elevation={0} sx={{ pt: "env(safe-area-inset-top)" }}>
        <Toolbar sx={{ minHeight: 56 }}>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 800, letterSpacing: 0.3 }}>
            Khata Book
          </Typography>
          <IconButton color="inherit" onClick={() => nav("/search")} aria-label="search" size="large">
            <SearchIcon />
          </IconButton>
          <IconButton color="inherit" onClick={toggle} aria-label="toggle theme" size="large">
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          py: 1.5,
          px: { xs: 1.5, sm: 2 },
          pb: "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
        <Outlet />
      </Container>

      <Paper
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          pb: "env(safe-area-inset-bottom)",
        }}
        elevation={8}
      >
        <BottomNavigation
          showLabels
          value={currentTab}
          onChange={(_, v) => nav(tabs[v].to)}
          sx={{ height: 64 }}
        >
          {tabs.map((t) => (
            <BottomNavigationAction key={t.to} label={t.label} icon={t.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
