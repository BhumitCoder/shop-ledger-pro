import { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2,
      background: "linear-gradient(135deg, #1976d2 0%, #26a69a 100%)" }}>
      <Stack alignItems="center" spacing={2} sx={{ width: "100%", maxWidth: 420 }}>
        <Box sx={{ width: 64, height: 64, bgcolor: "white", borderRadius: 3, display: "grid", placeItems: "center",
          fontSize: 34, fontWeight: 800, color: "#1976d2" }}>₹</Box>
        <Typography color="white" variant="h5" fontWeight={800}>Khata Book</Typography>
        {children}
      </Stack>
    </Box>
  );
}
