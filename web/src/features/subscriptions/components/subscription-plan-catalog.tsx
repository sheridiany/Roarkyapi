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
import { Link } from '@tanstack/react-router'
import { Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button, buttonVariants } from '@/components/ui/button'
import { formatQuota } from '@/lib/format'

import { formatDuration, formatResetPeriod } from '../lib'
import type { PlanRecord, SubscriptionPlan } from '../types'

interface CatalogProps {
  plans: PlanRecord[]
  purchaseCounts: Map<number, number>
  preview?: boolean
  canPurchase: (plan: SubscriptionPlan) => boolean
  onSelect: (plan: PlanRecord) => void
}

export function SubscriptionPlanCatalog(props: CatalogProps) {
  const { t, i18n } = useTranslation()
  return (
    <section aria-label={t('Available Plans')}>
      <div className='grid grid-cols-1 gap-5 lg:grid-cols-3'>
        <article className='bg-card flex min-h-[440px] min-w-0 flex-col rounded-xl border p-6 xl:p-8'>
          <div className='pt-3 pb-7 text-center'>
            <h2 className='text-lg font-semibold'>{t('Pay as you go')}</h2>
            <p className='mt-7 text-4xl font-semibold tracking-tight'>
              {t('Usage based')}
            </p>
            <p className='text-muted-foreground mt-3 text-sm'>
              {t('No subscription required')}
            </p>
          </div>
          <ul className='flex-1 space-y-4 border-t py-7 text-sm'>
            {[
              t('Billed by actual token usage'),
              t('Paid from your balance'),
              t('No subscription required'),
            ].map((label) => (
              <li key={label} className='flex items-start gap-3'>
                <Check
                  aria-hidden='true'
                  className='text-primary mt-0.5 size-4 shrink-0'
                />
                <span>{label}</span>
              </li>
            ))}
          </ul>
          <Link
            to='/wallet'
            className={buttonVariants({
              variant: 'outline',
              className: 'h-11 w-full',
            })}
          >
            {t('Top Up Balance')}
          </Link>
        </article>
        {props.plans.map((record) => {
          const plan = record.plan
          const reached =
            plan.max_purchase_per_user > 0 &&
            (props.purchaseCounts.get(plan.id) || 0) >=
              plan.max_purchase_per_user
          const disabled =
            !!props.preview ||
            reached ||
            !plan.enabled ||
            !props.canPurchase(plan)
          let action = t('Subscribe Now')
          if (!plan.enabled || !props.canPurchase(plan))
            {action = t('Not available')}
          if (reached) action = t('Limit Reached')
          if (props.preview) action = t('Preview only')
          const benefits = [
            `${t('Total Quota')}: ${plan.total_amount > 0 ? formatQuota(plan.total_amount) : t('Unlimited')}`,
            `${t('Quota Reset')}: ${formatResetPeriod(plan, t)}`,
            `${t('Validity Period')}: ${formatDuration(plan, t)}`,
          ]
          if (plan.upgrade_group)
            {benefits.push(`${t('Upgrade Group')}: ${plan.upgrade_group}`)}
          if (plan.max_purchase_per_user > 0)
            {benefits.push(
              `${t('Purchase Limit')}: ${plan.max_purchase_per_user}`
            )}
          return (
            <article
              key={plan.id}
              className='bg-card relative flex min-h-[440px] min-w-0 flex-col rounded-xl border p-6 xl:p-8'
            >
              {props.preview && (
                <span className='bg-muted text-muted-foreground absolute top-4 right-4 rounded-md px-2 py-1 text-xs'>
                  {t('Demo plan')}
                </span>
              )}
              <div className='pt-3 pb-7 text-center'>
                <h2 className='text-lg font-semibold break-words'>
                  {plan.title}
                </h2>
                <p className='mt-7 text-4xl font-semibold tracking-tight break-words'>
                  {new Intl.NumberFormat(
                    i18n.language.replace(/^zh(CN|TW)$/, 'zh-$1'),
                    {
                      style: 'currency',
                      currency: plan.currency || 'USD',
                      maximumFractionDigits: 2,
                    }
                  ).format(plan.price_amount)}
                </p>
                <p className='text-muted-foreground mt-3 text-sm'>
                  / {formatDuration(plan, t)}
                </p>
              </div>
              <ul className='flex-1 space-y-4 border-t py-7 text-sm'>
                {benefits.map((label) => (
                  <li key={label} className='flex items-start gap-3'>
                    <Check
                      aria-hidden='true'
                      className='text-primary mt-0.5 size-4 shrink-0'
                    />
                    <span className='break-words'>{label}</span>
                  </li>
                ))}
              </ul>
              {plan.subtitle && (
                <p className='text-muted-foreground mb-4 text-xs leading-relaxed break-words'>
                  {plan.subtitle}
                </p>
              )}
              <Button
                className='h-11 w-full'
                variant='outline'
                disabled={disabled}
                onClick={() => props.onSelect(record)}
              >
                {action}
              </Button>
            </article>
          )
        })}
      </div>
      {props.plans.length === 0 && (
        <p className='text-muted-foreground mt-5 text-sm'>
          {t('No plans available')}
        </p>
      )}
    </section>
  )
}
