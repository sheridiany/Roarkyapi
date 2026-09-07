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
import { TitledCard } from '@/components/ui/titled-card'

import type { UserProfile } from '../types'
import { AccountBindingsTab } from './tabs/account-bindings-tab'

interface ProfileSettingsCardProps {
  profile: UserProfile | null
  loading: boolean
  onProfileUpdate: () => void
}

export function ProfileSettingsCard(props: ProfileSettingsCardProps) {
  const { t } = useTranslation()
  return (
    <TitledCard
      title={t('Account Bindings')}
      disableHoverEffect
      headerClassName='!pb-0 sm:!pb-0'
    >
      {props.loading ? (
        <Skeleton className='h-20 w-full' />
      ) : (
        <AccountBindingsTab
          profile={props.profile}
          onUpdate={props.onProfileUpdate}
        />
      )}
    </TitledCard>
  )
}
