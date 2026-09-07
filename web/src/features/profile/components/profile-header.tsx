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
import { useTranslation } from 'react-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { formatCompactNumber, formatQuota } from '@/lib/format'
import { getRoleLabel } from '@/lib/roles'

import type { UserProfile } from '../types'

interface ProfileHeaderProps {
  profile: UserProfile | null
  loading: boolean
}

export function ProfileHeader(props: ProfileHeaderProps) {
  const { t } = useTranslation()
  if (props.loading) return <Skeleton className='h-48 w-full rounded-lg' />
  if (!props.profile) return null
  const profile = props.profile
  const fields = [
    [t('User ID'), String(profile.id)],
    [t('Username'), profile.username],
    [t('Display Name'), profile.display_name || profile.username],
    [t('Role'), t(getRoleLabel(profile.role))],
    [t('Email'), profile.email || '—'],
    [t('Group'), profile.group || '—'],
  ]
  return (
    <section className='gateway-profile-account'>
      <h2>{t('Account Information')}</h2>
      <dl className='grid gap-x-10 gap-y-4 sm:grid-cols-2'>
        {fields.map(([label, value]) => (
          <div
            key={label}
            className='grid grid-cols-[7rem_minmax(0,1fr)] gap-3 text-sm'
          >
            <dt className='text-muted-foreground'>{label}</dt>
            <dd className='min-w-0 break-words'>{value}</dd>
          </div>
        ))}
      </dl>
      <dl className='mt-6 flex flex-wrap gap-x-8 gap-y-3 border-t pt-4 text-sm'>
        {[
          [t('Current Balance'), formatQuota(profile.quota)],
          [t('Total Usage'), formatQuota(profile.used_quota)],
          [t('API Requests'), formatCompactNumber(profile.request_count)],
        ].map(([label, value]) => (
          <div key={label} className='flex items-center gap-3'>
            <dt className='text-muted-foreground'>{label}</dt>
            <dd className='font-mono tabular-nums'>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
