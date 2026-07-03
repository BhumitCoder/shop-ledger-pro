import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppBar, Box, BottomNavigation, BottomNavigationAction, Container, IconButton, Paper, Toolbar, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import AssessmentIcon from "@mui/icons-material/Assessment";
import SettingsIcon from "@mui/icons-material/Settings";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import { useThemeMode } from "@/theme/ThemeModeProvider";

const tabs = [
  { to: "/", label: "Home", icon: <DashboardIcon /> },
  { to: "/customers", label: "Customers", icon: <PeopleIcon /> },
  { to: "/transactions", label: "Entries", icon: <ReceiptLongIcon /> },
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
    if (loc.pathname.startsWith("/transactions")) return 2;
    if (loc.pathname.startsWith("/reports")) return 3;
    if (loc.pathname.startsWith("/settings")) return 4;
    return 0;
  })();

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", bgcolor: "background.default" }}>
      <AppBar position="sticky" color="primary" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 800 }}>
            Khata Book
          </Typography>
          <IconButton color="inherit" onClick={toggle} aria-label="toggle theme">
            {mode === "light" ? <DarkModeIcon /> : <LightModeIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="sm" sx={{ flex: 1, py: 2, pb: 12 }}>
        <Outlet />
      </Container>
      <Paper sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10 }} elevation={8}>
        <BottomNavigation
          showLabels
          value={currentTab}
          onChange={(_, v) => nav(tabs[v].to)}
          sx={{ height: 68 }}
        >
          {tabs.map((t) => (
            <BottomNavigationAction key={t.to} label={t.label} icon={t.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
}
