import { EmptyState } from '../components/common/EmptyState'

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="That link does not go anywhere."
      action={{ label: 'Back to competitions', to: '/' }}
    />
  )
}
