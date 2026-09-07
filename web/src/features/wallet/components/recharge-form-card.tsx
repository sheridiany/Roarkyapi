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
import { Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

import { formatCurrency, getPaymentIcon, getMinTopupAmount } from '../lib'
import type {
  PaymentMethod,
  PresetAmount,
  TopupInfo,
  CreemProduct,
  WaffoPayMethod,
} from '../types'
import { CreemProductsSection } from './creem-products-section'

interface RechargeFormCardProps {
  topupInfo: TopupInfo | null
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  onPaymentMethodSelect: (method: PaymentMethod) => void
  paymentLoading: string | null
  selectedPaymentType?: string
  locked?: boolean
  formatCredit?: (amount: number) => string
  paymentCurrency?: string
  loading?: boolean
  priceRatio?: number
  usdExchangeRate?: number
  creemProducts?: CreemProduct[]
  enableCreemTopup?: boolean
  onCreemProductSelect?: (product: CreemProduct) => void
  enableWaffoTopup?: boolean
  waffoPayMethods?: WaffoPayMethod[]
  waffoMinTopup?: number
  onWaffoMethodSelect?: (method: WaffoPayMethod, index: number) => void
  enableWaffoPancakeTopup?: boolean
}

export function RechargeFormCard(props: RechargeFormCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState(String(props.topupAmount))
  useEffect(() => {
    setLocalAmount((prev) =>
      prev === '' && props.topupAmount === 0 ? prev : String(props.topupAmount)
    )
  }, [props.topupAmount])
  const hasStandard =
    props.topupInfo?.enable_online_topup ||
    props.topupInfo?.enable_stripe_topup ||
    props.enableWaffoTopup ||
    props.enableWaffoPancakeTopup
  const minTopup = getMinTopupAmount(props.topupInfo)
  const invalidAmount =
    props.topupAmount < minTopup || !Number.isSafeInteger(props.topupAmount)
  const credit =
    props.formatCredit ?? ((amount: number) => `$${formatCurrency(amount)}`)
  if (props.loading) {
    return (
      <section aria-label={t('Add Funds')} className='space-y-5'>
        <Skeleton className='h-6 w-32' />
        <div
          role='group'
          aria-label={t('Choose an amount')}
          className='grid grid-cols-3 gap-2 sm:gap-3'
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Skeleton key={n} className='h-24 rounded-xl' />
          ))}
        </div>
        <Skeleton className='h-12 w-full' />
      </section>
    )
  }
  return (
    <section aria-label={t('Add Funds')} className='min-w-0 space-y-8'>
      {!hasStandard && !props.enableCreemTopup && (
        <Alert>
          <AlertDescription>
            {t(
              'Online topup is not enabled. Please contact the administrator.'
            )}
          </AlertDescription>
        </Alert>
      )}
      {hasStandard && (
        <fieldset
          disabled={props.locked || !!props.paymentLoading}
          className='min-w-0 space-y-7'
        >
          <div>
            <h2 className='mb-4 text-sm font-semibold'>
              {t('Choose an amount')}
            </h2>
            <div
              role='group'
              aria-label={t('Choose an amount')}
              className='grid grid-cols-3 gap-2 sm:gap-3'
            >
              {props.presetAmounts.map((preset) => {
                const selected = props.topupAmount === preset.value
                const price =
                  preset.value *
                  (props.priceRatio ?? 1) *
                  (preset.discount ??
                    props.topupInfo?.discount?.[preset.value] ??
                    1)
                return (
                  <Button
                    key={preset.value}
                    variant='outline'
                    aria-pressed={selected}
                    disabled={preset.value < minTopup}
                    onClick={() => props.onSelectPreset(preset)}
                    className={cn(
                      'relative h-auto min-h-20 min-w-0 sm:min-h-24 flex-col items-start justify-center gap-2 rounded-xl px-3 py-3 text-left sm:px-4 sm:py-4 whitespace-normal transition-colors',
                      selected
                        ? 'border-primary bg-primary/5 ring-primary/15 ring-1 hover:bg-primary/8'
                        : 'border-border/80 hover:border-foreground/30'
                    )}
                  >
                    <span className='font-mono text-xl font-semibold tracking-tight tabular-nums sm:text-2xl'>
                      {credit(preset.value)}
                    </span>
                    <span className='text-muted-foreground text-xs font-normal'>
                      {t('Pay {{amount}}', {
                        amount: `${props.paymentCurrency ?? '¥'}${formatCurrency(price)}`,
                      })}
                    </span>
                    {selected && (
                      <Check
                        aria-hidden='true'
                        className='text-primary absolute top-3 right-3 size-3.5'
                      />
                    )}
                  </Button>
                )
              })}
            </div>
          </div>
          <div className='space-y-2.5'>
            <Label htmlFor='topup-amount' className='text-sm'>
              {t('Custom Amount')}
            </Label>
            <Input
              id='topup-amount'
              type='number'
              inputMode='numeric'
              min={minTopup}
              step={1}
              value={localAmount}
              aria-invalid={invalidAmount}
              aria-describedby='topup-amount-hint'
              className='h-11 max-w-xs font-mono text-base tabular-nums'
              onChange={(event) => {
                const value = event.target.value
                setLocalAmount(value)
                props.onTopupAmountChange(value === '' ? 0 : Number(value))
              }}
            />
            <p
              id='topup-amount-hint'
              className={cn(
                'text-xs leading-relaxed',
                invalidAmount ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {t('Minimum {{amount}}. Enter a whole number.', {
                amount: credit(minTopup),
              })}
            </p>
          </div>
          <div className='space-y-3 border-t pt-6'>
            <h2 className='text-sm font-semibold'>{t('Payment Method')}</h2>
            <div className='flex flex-wrap gap-3'>
              {props.topupInfo?.pay_methods?.map((method) => (
                <Button
                  key={method.type}
                  variant='outline'
                  aria-label={method.name}
                  aria-pressed={props.selectedPaymentType === method.type}
                  disabled={
                    invalidAmount || props.topupAmount < (method.min_topup ?? 0)
                  }
                  onClick={() => props.onPaymentMethodSelect(method)}
                  className={cn(
                    'h-12 min-w-36 justify-start gap-3 rounded-xl px-4',
                    props.selectedPaymentType === method.type &&
                      'border-primary bg-primary/5'
                  )}
                >
                  {getPaymentIcon(
                    method.type,
                    'size-5',
                    method.icon,
                    method.name
                  )}
                  <span>{method.name}</span>
                  {props.selectedPaymentType === method.type && (
                    <Check
                      aria-hidden='true'
                      className='text-primary ml-auto size-3.5'
                    />
                  )}
                </Button>
              ))}
              {props.enableWaffoTopup &&
                props.waffoPayMethods?.map((method, index) => (
                  <Button
                    key={`${method.payMethodType}-${method.payMethodName}-${method.name}`}
                    variant='outline'
                    disabled={
                      invalidAmount ||
                      props.topupAmount < (props.waffoMinTopup ?? 0)
                    }
                    onClick={() => props.onWaffoMethodSelect?.(method, index)}
                    className='h-12 rounded-xl px-4'
                  >
                    {method.name}
                  </Button>
                ))}
            </div>
            {!props.topupInfo?.pay_methods?.length &&
              !props.waffoPayMethods?.length && (
                <p className='text-muted-foreground text-sm'>
                  {t(
                    'No payment methods available. Please contact administrator.'
                  )}
                </p>
              )}
          </div>
        </fieldset>
      )}
      {props.enableCreemTopup &&
        !!props.creemProducts?.length &&
        props.onCreemProductSelect && (
          <CreemProductsSection
            products={props.creemProducts}
            onProductSelect={props.onCreemProductSelect}
          />
        )}
    </section>
  )
}
