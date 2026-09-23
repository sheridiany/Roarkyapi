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

import { Main } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'

import { ProfileSecurityCard } from './components/profile-security-card'
import { ProfileSettingsCard } from './components/profile-settings-card'
import { useProfile } from './hooks'

export function Profile() {
  const { t } = useTranslation()
  const { profile, loading, refreshProfile } = useProfile()

  return (
    <Main>
      <div className='gateway-profile min-h-0 flex-1 overflow-auto px-4 py-6 sm:px-8'>
        <CardStaggerContainer className='mx-auto flex w-full max-w-4xl flex-col gap-5'>
          <header>
            <h1 className='text-xl font-semibold'>{t('Profile')}</h1>
            <p className='text-muted-foreground mt-1 text-sm'>
              {t('Manage your account information and security.')}
            </p>
          </header>
          <CardStaggerItem>
            <ProfileSettingsCard
              profile={profile}
              loading={loading}
              onProfileUpdate={refreshProfile}
            />
          </CardStaggerItem>
          <CardStaggerItem>
            <ProfileSecurityCard
              profile={profile}
              loading={loading}
              onProfileUpdate={refreshProfile}
            />
          </CardStaggerItem>
        </CardStaggerContainer>
      </div>
    </Main>
  )
}
