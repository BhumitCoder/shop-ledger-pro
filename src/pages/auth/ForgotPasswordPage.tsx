import { useForm } from "react-hook-form";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, Card, CardContent, Link, Stack, TextField, Typography } from "@mui/material";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSnackbar } from "notistack";
import { AuthShell } from "./AuthShell";

interface FormData { email: string }

export default function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm<FormData>();
  const { enqueueSnackbar } = useSnackbar();

  const onSubmit = async (data: FormData) => {
    try {
      await sendPasswordResetEmail(auth, data.email.trim());
      enqueueSnackbar("Password reset link sent to your email.", { variant: "success" });
    } catch (e: any) {
      enqueueSnackbar(e?.message || "Failed to send reset email", { variant: "error" });
    }
  };

  return (
    <AuthShell>
      <Card sx={{ width: "100%", maxWidth: 420 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom fontWeight={800}>Reset password</Typography>
          <Typography color="text.secondary" mb={3}>We'll email you a reset link</Typography>
          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={2}>
              <TextField label="Email" type="email" error={!!errors.email} helperText={errors.email?.message}
                {...register("email", { required: "Email is required" })} />
              <Button type="submit" variant="contained" size="large" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send reset link"}
              </Button>
              <Link component={RouterLink} to="/login" textAlign="center">Back to sign in</Link>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
