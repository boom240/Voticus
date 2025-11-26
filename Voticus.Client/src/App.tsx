// src/App.tsx
import { useMemo, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";

import { AppLayout } from "./components/layout/AppLayout";
import { PollListPage } from "./pages/PollListPage";
import { PollDetailPage } from "./pages/PollDetailPage";
import { CreatePollPage } from "./pages/CreatePollPage";

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
        <AppLayout colorMode={mode} onToggleColorMode={toggleMode}>
          <Routes>
            <Route path="/" element={<PollListPage />} />
            <Route path="/polls/new" element={<CreatePollPage />} />
            <Route path="/polls/:id" element={<PollDetailPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
