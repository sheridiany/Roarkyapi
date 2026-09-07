import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { INVITATION_CODE_REGEX } from '@/features/auth/constants'
import { api } from '@/lib/api'

interface InvitationGateProps {
  initialCode?: string
  onVerified: (code: string) => void | Promise<void>
  disabled?: boolean
  children?: ReactNode
}

export function InvitationGate(props: InvitationGateProps) {
  const { t } = useTranslation()
  const onVerified = props.onVerified
  const [code, setCode] = useState(props.initialCode ?? '')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const started = useRef(false)

  const verify = useCallback(
    async (value: string) => {
      if (props.disabled) return
      if (!INVITATION_CODE_REGEX.test(value.trim())) {
        setError(t('Please enter a valid invitation code'))
        return
      }
      setPending(true)
      setError('')
      try {
        const response = await api.post(
          '/api/registration-invitations/verify',
          { invitation_code: value.trim() },
          { skipAuthRefresh: true, skipBusinessError: true }
        )
        if (!response.data.success) {
          setError(
            response.data.message ||
              t('Invitation code is invalid, expired, or already used')
          )
          return
        }
        await onVerified(value.trim())
      } catch (cause) {
        const message = (
          cause as { response?: { data?: { message?: string } } }
        ).response?.data?.message
        setError(
          message ||
            (cause instanceof Error
              ? cause.message
              : t('Failed to verify invitation code'))
        )
      } finally {
        setPending(false)
      }
    },
    [props.disabled, onVerified, t]
  )

  useEffect(() => {
    if (
      started.current ||
      props.disabled ||
      !props.initialCode ||
      !INVITATION_CODE_REGEX.test(props.initialCode.trim())
    ) {
      return
    }
    started.current = true
    void verify(props.initialCode)
  }, [props.initialCode, props.disabled, verify])

  return (
    <form
      className='grid gap-4'
      onSubmit={(event) => {
        event.preventDefault()
        void verify(code)
      }}
    >
      <p className='text-muted-foreground text-sm'>
        {t(
          'Registration is by invitation only. Ask the administrator for an invitation code.'
        )}
      </p>
      <div className='grid gap-2'>
        <Label htmlFor='registration-invitation'>{t('Invitation code')}</Label>
        <Input
          id='registration-invitation'
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            setError('')
          }}
          autoComplete='off'
          maxLength={64}
          placeholder={t('Enter your invitation code')}
          disabled={pending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'invitation-error' : undefined}
        />
        {error && (
          <p
            id='invitation-error'
            role='alert'
            className='text-destructive text-sm'
          >
            {error}
          </p>
        )}
      </div>
      {props.children}
      <Button type='submit' disabled={pending || props.disabled}>
        {pending ? t('Verifying invitation code...') : t('Verify and continue')}
      </Button>
    </form>
  )
}
