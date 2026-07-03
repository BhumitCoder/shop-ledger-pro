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
          h5: { fontWeight: 700 },
          h6: { fontWeight: 700 },
          button: { textTransform: "none", fontWeight: 600 },
        },
        components: {
          MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 12, paddingBlock: 10 } } },
          MuiCard: { styleOverrides: { root: { borderRadius: 16 } } },
          MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
          MuiTextField: { defaultProps: { variant: "outlined", fullWidth: true } },
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
