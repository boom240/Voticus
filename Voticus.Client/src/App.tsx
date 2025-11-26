// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { AppLayout } from "./components/layout/AppLayout";
import { PollListPage } from "./pages/PollListPage";
import { PollDetailPage } from "./pages/PollDetailPage";
import { CreatePollPage } from "./pages/CreatePollPage";

const theme = createTheme({
  palette: {
    mode: "light",
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<PollListPage />} />
            <Route path="/polls/:id" element={<PollDetailPage />} />
            <Route path="/polls/new" element={<CreatePollPage />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
