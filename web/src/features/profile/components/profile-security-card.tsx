/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { PasswordInput } from '@/components/password-input'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { TitledCard } from '@/components/ui/titled-card'
import { SecureVerificationDialog } from '@/features/auth/secure-verification'
import { useAccountSecurity } from '@/features/security/hooks/use-account-security'

import { changeAccountPassword } from '../api'
import {
  createChangePasswordSchema,
  type ChangePasswordValues,
} from '../lib/change-password-schema'
import type { UserProfile } from '../types'

interface ProfileSecurityCardProps {
  profile: UserProfile | null
  loading: boolean
  onProfileUpdate?: () => void
}

export function ProfileSecurityCard(props: ProfileSecurityCardProps) {
  const { t } = useTranslation()
  const [passwordSet, setPasswordSet] = useState(false)
  const hasPassword = passwordSet || props.profile?.has_password !== false
  const form = useForm<ChangePasswordValues>({
    resolver: zodResolver(createChangePasswordSchema(hasPassword)),
    defaultValues: {
      originalPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })
  const security = useAccountSecurity()
  const submitting = form.formState.isSubmitting || security.pending

  async function onSubmit(values: ChangePasswordValues) {
    try {
      const response = await security.run(async (signal) => {
        const proof = await security.verify(
          {
            scope: !hasPassword
              ? 'account.password.set'
              : 'account.password.change',
          },
          signal,
          !hasPassword ? undefined : values.originalPassword
        )
        return changeAccountPassword(
          {
            password: values.newPassword,
            ...(!hasPassword
              ? {}
              : { original_password: values.originalPassword }),
          },
          proof,
          signal
        )
      })
      if (!response) return
      setPasswordSet(true)
      props.onProfileUpdate?.()
      form.reset()
      toast.success(t('Password changed successfully'))
    } catch {
      form.setError('root', { message: t('Failed to change password') })
    }
  }

  return (
    <>
      <SecureVerificationDialog {...security.verificationDialogProps} />
      <TitledCard
        title={hasPassword ? t('Change Password') : t('Set Password')}
        disableHoverEffect
        headerClassName='!pb-0 sm:!pb-0'
      >
        {props.loading ? (
          <Skeleton className='h-48 w-full' />
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-5'
              noValidate
            >
              <input
                type='text'
                name='username'
                autoComplete='username'
                value={props.profile?.username || ''}
                readOnly
                hidden
              />
              <fieldset
                disabled={submitting || !props.profile}
                className='grid min-w-0 gap-5 sm:grid-cols-2'
              >
                {hasPassword && (
                  <FormField
                    control={form.control}
                    name='originalPassword'
                    render={({ field }) => (
                      <FormItem className='sm:col-span-2 sm:max-w-[calc(50%-0.625rem)]'>
                        <FormLabel>{t('Current Password')}</FormLabel>
                        <FormControl>
                          <PasswordInput
                            {...field}
                            className='h-10 [&_input]:h-10'
                            autoComplete='current-password'
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name='newPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('New Password')}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          className='h-10 [&_input]:h-10'
                          autoComplete='new-password'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='confirmPassword'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Confirm New Password')}</FormLabel>
                      <FormControl>
                        <PasswordInput
                          {...field}
                          className='h-10 [&_input]:h-10'
                          autoComplete='new-password'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </fieldset>
              {(form.formState.errors.root || security.error) && (
                <p role='alert' className='text-destructive text-sm'>
                  {form.formState.errors.root?.message ||
                    security.error?.message}
                </p>
              )}
              <div className='flex flex-wrap items-center justify-between gap-4 border-t pt-5'>
                <p className='text-muted-foreground text-xs'>
                  {t('Password must be between 8 and 128 characters')}
                </p>
                <Button
                  type='submit'
                  disabled={submitting || !props.profile}
                  className='h-10 [&_input]:h-10'
                >
                  {submitting && <Loader2 className='size-4 animate-spin' />}
                  {submitting
                    ? t('Changing...')
                    : t(hasPassword ? 'Change Password' : 'Set Password')}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </TitledCard>
    </>
  )
}
