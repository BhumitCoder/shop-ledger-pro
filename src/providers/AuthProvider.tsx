import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Box, CircularProgress, Fade, Typography } from "@mui/material";

interface AuthCtx {
  user: User | null;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, loading: true });
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return (
      <Fade in timeout={200}>
        <Box
          sx={{
            minHeight: "100dvh",
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg,#1976d2 0%,#26a69a 100%)",
            color: "white",
          }}
        >
          <Box textAlign="center">
            <Typography variant="h4" fontWeight={800} letterSpacing={0.5} mb={2}>
              Khata Book
            </Typography>
            <CircularProgress sx={{ color: "white" }} />
            <Typography variant="caption" display="block" mt={2} sx={{ opacity: 0.85 }}>
              Loading your account…
            </Typography>
          </Box>
        </Box>
      </Fade>
    );
  }

  return <Ctx.Provider value={{ user, loading }}>{children}</Ctx.Provider>;
}
