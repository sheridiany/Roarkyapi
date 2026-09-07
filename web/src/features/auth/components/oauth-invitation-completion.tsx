import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { api, isAuthBundle } from '@/lib/api'

import { AuthLayout } from '../auth-layout'
import { useAuthRedirect } from '../hooks/use-auth-redirect'
import { InvitationGate } from './invitation-gate'
import { LegalConsent } from './legal-consent'

export interface PendingOAuthRegistration {
  action: 'invitation_required'
  flow_token: string
  expires_at: number
  provider: string
}

export function OAuthInvitationCompletion(props: {
  pending: PendingOAuthRegistration
  redirect?: string
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { handleLoginSuccess } = useAuthRedirect()
  const [agreed, setAgreed] = useState(false)
  const [expired, setExpired] = useState(false)
  const requiresConsent = Boolean(
    status?.user_agreement_enabled || status?.privacy_policy_enabled
  )

  async function complete(code: string) {
    try {
      const response = await api.post(
        '/api/oauth/registration/complete',
        { flow_token: props.pending.flow_token, invitation_code: code },
        { skipAuthRefresh: true, skipBusinessError: true }
      )
      if (!response.data.success || !isAuthBundle(response.data.data)) {
        throw new Error(response.data.message || t('Registration failed'))
      }
      await handleLoginSuccess(response.data.data, props.redirect)
    } catch (error) {
      if (
        (error as { response?: { status?: number } }).response?.status === 410
      ) {
        setExpired(true)
      }
      throw error
    }
  }

  return (
    <AuthLayout modalTitle={t('Complete registration')}>
      <div className='grid gap-4'>
        <p className='text-muted-foreground text-sm'>
          {t(
            'Your {{provider}} account is verified. Enter an invitation code to finish creating your account.',
            { provider: props.pending.provider }
          )}
        </p>
        {expired ? (
          <p role='alert'>
            {t('Your authorization has expired. Please sign in again.')}
          </p>
        ) : (
          <InvitationGate
            onVerified={complete}
            disabled={!status || (requiresConsent && !agreed)}
          >
            <LegalConsent
              status={status}
              checked={agreed}
              onCheckedChange={setAgreed}
            />
          </InvitationGate>
        )}
        <Link to='/sign-in' className='text-center text-sm underline'>
          {t('Back to sign in')}
        </Link>
      </div>
    </AuthLayout>
  )
}
