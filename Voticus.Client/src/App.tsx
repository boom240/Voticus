// src/App.tsx
import { AuthProvider } from "./context/AuthContext";
// React
import { useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// Themes
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";
// Layout
import { AppLayout } from "./components/layout/AppLayout";
// Pages
import { PollListPage } from "./pages/PollListPage";
import { PollDetailPage } from "./pages/PollDetailPage";
import { CreatePollPage } from "./pages/CreatePollPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

function App() {
  const [mode, setMode] = useState<PaletteMode>("light");

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          background: {
            default: mode === "light" ? "#f3f4f6" : "#121212",
          },
        },
        shape: {
          borderRadius: 8,
        },
      }),
    [mode]
  );

  const toggleMode = () =>
    setMode((prev) => (prev === "light" ? "dark" : "light"));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <AppLayout colorMode={mode} onToggleColorMode={toggleMode}>
            <Routes>
              <Route path="/" element={<PollListPage />} />
              <Route path="/polls/new" element={<CreatePollPage />} />
              <Route path="/polls/:id" element={<PollDetailPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </AppLayout>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
