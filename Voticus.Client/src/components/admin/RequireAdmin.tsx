import type { PropsWithChildren } from 'react'
import { EmptyState } from '../common/EmptyState'
import { TableSkeleton } from '../common/Skeletons'
import { useAuth } from '../../context/AuthContext'

// The API enforces the role. This just avoids rendering admin screens to the wrong person.
export function RequireAdmin({ children }: PropsWithChildren) {
  const { user, loading } = useAuth()
  if (loading) return <TableSkeleton />
  if (!user) return <EmptyState title="Log in to continue" action={{ label: 'Log in', to: '/login' }} />
  if (!user.isAdmin) return <EmptyState title="Admins only" description="This area is for admins." action={{ label: 'Back to competitions', to: '/' }} />
  return <>{children}</>
}
