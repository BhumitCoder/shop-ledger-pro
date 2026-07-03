import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from "react";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";

type Mode = "light" | "dark";
const Ctx = createContext<{ mode: Mode; toggle: () => void }>({ mode: "light", toggle: () => {} });
export const useThemeMode = () => useContext(Ctx);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem("theme") as Mode) || "light");
  useEffect(() => { localStorage.setItem("theme", mode); }, [mode]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: "#1976d2" },
          secondary: { main: "#26a69a" },
          success: { main: "#2e7d32" },
          error: { main: "#c62828" },
          background:
            mode === "light"
              ? { default: "#f5f7fa", paper: "#ffffff" }
              : { default: "#0f1419", paper: "#1a222c" },
        },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize: 15,
          h4: { fontWeight: 800, fontSize: "1.75rem" },
          h5: { fontWeight: 700, fontSize: "1.35rem" },
          h6: { fontWeight: 700, fontSize: "1.1rem" },
          subtitle1: { fontWeight: 600, fontSize: "1rem" },
          body1: { fontSize: "0.97rem" },
          body2: { fontSize: "0.875rem" },
          caption: { fontSize: "0.78rem" },
          button: { textTransform: "none", fontWeight: 600, fontSize: "0.95rem" },
        },
        components: {
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: {
                borderRadius: 12,
                paddingBlock: 12,
                minHeight: 48,
              },
              sizeSmall: { minHeight: 36, paddingBlock: 6 },
              sizeLarge: { minHeight: 54, paddingBlock: 14, fontSize: "1rem" },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                padding: 10,
                minWidth: 44,
                minHeight: 44,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: { borderRadius: 16, boxShadow: mode === "light" ? "0 1px 4px rgba(0,0,0,0.08)" : "0 1px 4px rgba(0,0,0,0.3)" },
            },
          },
          MuiCardContent: {
            styleOverrides: {
              root: { padding: "14px 16px", "&:last-child": { paddingBottom: "14px" } },
            },
          },
          MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
          MuiTextField: {
            defaultProps: { variant: "outlined", fullWidth: true },
            styleOverrides: { root: { "& .MuiInputBase-root": { minHeight: 52 } } },
          },
          MuiBottomNavigationAction: {
            styleOverrides: {
              root: { minWidth: 48, paddingTop: 8 },
              label: { fontSize: "0.7rem", "&.Mui-selected": { fontSize: "0.72rem" } },
            },
          },
          MuiFab: {
            styleOverrides: { root: { width: 58, height: 58, boxShadow: "0 4px 16px rgba(0,0,0,0.22)" } },
          },
          MuiChip: {
            styleOverrides: { root: { fontWeight: 600 } },
          },
          MuiDialogContent: {
            styleOverrides: { root: { paddingTop: "16px !important" } },
          },
          MuiTab: {
            styleOverrides: { root: { minHeight: 48, fontWeight: 600 } },
          },
        },
      }),
    [mode],
  );

  return (
    <Ctx.Provider value={{ mode, toggle: () => setMode((m) => (m === "light" ? "dark" : "light")) }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </Ctx.Provider>
  );
}
