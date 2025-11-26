// src/pages/auth/RegisterPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const ok = await register(email, password);

    if (!ok) {
      setError("Registration failed.");
      return;
    }

    setSuccess(true);
    setError(null);
    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <Stack spacing={3} maxWidth={400}>
      <Typography variant="h5">Register</Typography>

      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">Account created!</Alert>}

      <form onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Button variant="contained" type="submit">
            Register
          </Button>
        </Stack>
      </form>
    </Stack>
  );
}
