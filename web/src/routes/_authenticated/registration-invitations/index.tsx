import { createFileRoute, redirect } from '@tanstack/react-router'

import { RegistrationInvitations } from '@/features/registration-invitations'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute(
  '/_authenticated/registration-invitations/'
)({
  beforeLoad: () => {
    const { auth } = useAuthStore.getState()
    if (!auth.user || auth.user.role < ROLE.ADMIN) {
      throw redirect({ to: '/403' })
    }
  },
  component: RegistrationInvitations,
})
