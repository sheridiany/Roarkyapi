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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { SubscriptionPlansCard } from '@/features/wallet/components/subscription-plans-card'
import { useTopupInfo } from '@/features/wallet/hooks'
import { getSelf } from '@/lib/api'

export function UserPlans() {
  const { t } = useTranslation()
  const { topupInfo } = useTopupInfo()
  const user = useQuery({
    queryKey: ['subscription-user-balance'],
    queryFn: getSelf,
  })
  return (
    <SectionPageLayout description={t('Choose a plan that fits your usage.')}>
      <SectionPageLayout.Title>
        {t('Subscription Plans')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto w-full max-w-7xl'>
          <SubscriptionPlansCard
            topupInfo={topupInfo}
            userQuota={user.data?.data?.quota}
            onPurchaseSuccess={async () => {
              await user.refetch()
            }}
          />
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
