import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ColorModeProvider } from './theme/ColorModeContext'
import { ToastProvider } from './components/common/ToastProvider'
import { AuthProvider } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'
import { RequireAdmin } from './components/admin/RequireAdmin'
import { PageHeaderSkeleton, TableSkeleton } from './components/common/Skeletons'
import { CompetitionListPage } from './pages/CompetitionListPage'
import { CompetitionDetailPage } from './pages/CompetitionDetailPage'
import { EntryDetailPage } from './pages/EntryDetailPage'
import { EnterEntryPage } from './pages/EnterEntryPage'
import { EditEntryPage } from './pages/EditEntryPage'
import { AccountPage } from './pages/AccountPage'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { NotFoundPage } from './pages/NotFoundPage'

// Results (charts) and admin screens load on demand to keep the first bundle small.
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })))
const AdminCompetitionsPage = lazy(() =>
  import('./pages/admin/AdminCompetitionsPage').then((m) => ({ default: m.AdminCompetitionsPage })),
)
const AdminCompetitionPage = lazy(() =>
  import('./pages/admin/AdminCompetitionPage').then((m) => ({ default: m.AdminCompetitionPage })),
)
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))

const fallback = (
  <>
    <PageHeaderSkeleton />
    <TableSkeleton />
  </>
)

function App() {
  return (
    <ColorModeProvider>
      <ToastProvider>
        <BrowserRouter>
          <AuthProvider>
            <AppLayout>
              <Suspense fallback={fallback}>
                <Routes>
                  <Route path="/" element={<CompetitionListPage />} />
                  <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
                  <Route path="/competitions/:id/enter" element={<EnterEntryPage />} />
                  <Route path="/competitions/:id/results" element={<ResultsPage />} />
                  <Route path="/competitions/:id/entries/:entryId" element={<EntryDetailPage />} />
                  <Route path="/competitions/:id/entries/:entryId/edit" element={<EditEntryPage />} />
                  <Route path="/account" element={<AccountPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route
                    path="/admin/competitions"
                    element={
                      <RequireAdmin>
                        <AdminCompetitionsPage />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="/admin/competitions/:id"
                    element={
                      <RequireAdmin>
                        <AdminCompetitionPage />
                      </RequireAdmin>
                    }
                  />
                  <Route
                    path="/admin/users"
                    element={
                      <RequireAdmin>
                        <AdminUsersPage />
                      </RequireAdmin>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AppLayout>
          </AuthProvider>
        </BrowserRouter>
      </ToastProvider>
    </ColorModeProvider>
  )
}

export default App
