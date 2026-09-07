import { useQuery } from '@tanstack/react-query'
import { Check, Loader2, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

import { getUserBillingHistory } from '../api'
import { getPaymentIcon } from '../lib'
import type { InlineCheckout, PaymentMethod } from '../types'

interface PaymentCheckoutPanelProps {
  checkout: InlineCheckout | null
  method?: PaymentMethod
  amount: number
  credit: string
  currency: string
  disabled: boolean
  calculating: boolean
  processing: boolean
  error: string
  onPay: () => void
  onReset: () => void
  onPaid: () => void
}

export function PaymentCheckoutPanel(props: PaymentCheckoutPanelProps) {
  const { t } = useTranslation()
  const [queried, setQueried] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const notifiedOrder = useRef('')
  const onPaid = props.onPaid
  const order = props.checkout
  const paymentQuery = useQuery({
    queryKey: ['wallet', 'payment-status', order?.trade_no],
    enabled: !!order,
    queryFn: async () => {
      if (!order) return null
      const response = await getUserBillingHistory(1, 1, order.trade_no)
      if (!response.success) throw new Error('Payment status unavailable')
      return (
        response.data?.items.find((item) => item.trade_no === order.trade_no) ??
        null
      )
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status && status !== 'pending' ? false : 3000
    },
    retry: 1,
  })
  const status = paymentQuery.data?.status
  const paid = status === 'success'
  const closed = status === 'expired' || status === 'failed'
  useEffect(() => {
    setQueried(false)
    setImageFailed(false)
  }, [order?.trade_no])
  useEffect(() => {
    if (paid && order && notifiedOrder.current !== order.trade_no) {
      notifiedOrder.current = order.trade_no
      onPaid()
    }
  }, [paid, order, onPaid])
  const amount = order?.money ?? props.amount
  const isExternal =
    props.method?.type === 'stripe' || props.method?.type.startsWith('waffo')
  return (
    <aside
      aria-label={t('Payment details')}
      className='bg-muted/35 h-fit min-w-0 rounded-2xl border p-5 sm:p-6'
    >
      <p className='text-muted-foreground text-sm'>{t('You pay')}</p>
      {props.calculating && !order ? (
        <Skeleton className='mt-3 h-11 w-40' />
      ) : (
        <p className='mt-2 font-mono text-4xl leading-tight font-semibold tracking-tight tabular-nums'>
          <span className='mr-1 text-2xl'>{props.currency}</span>
          {amount.toFixed(2)}
        </p>
      )}
      <dl className='mt-6 space-y-3 text-sm'>
        <div className='flex items-center justify-between gap-4'>
          <dt className='text-muted-foreground'>{t('Balance to receive')}</dt>
          <dd className='font-mono font-medium tabular-nums'>{props.credit}</dd>
        </div>
        <div className='flex items-center justify-between gap-4'>
          <dt className='text-muted-foreground'>{t('Payment Method')}</dt>
          <dd className='flex items-center gap-2'>
            {props.method ? (
              <>
                {getPaymentIcon(
                  props.method.type,
                  'size-4',
                  props.method.icon,
                  props.method.name
                )}
                {props.method.name}
              </>
            ) : (
              '—'
            )}
          </dd>
        </div>
      </dl>
      <div className='mt-6 border-t pt-6'>
        {paid ? (
          <div role='status' className='space-y-3 py-6 text-center'>
            <span className='mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'>
              <Check className='size-6' />
            </span>
            <h3 className='text-lg font-semibold'>{t('Payment received')}</h3>
            <p className='text-muted-foreground text-sm'>
              {t('Your balance has been updated.')}
            </p>
          </div>
        ) : null}
        {closed ? (
          <div role='status' className='space-y-3 py-6 text-center'>
            <RefreshCw className='text-muted-foreground mx-auto size-8' />
            <h3 className='font-semibold'>{t('Payment order closed')}</h3>
            <p className='text-muted-foreground text-sm'>
              {t('Create a new order to continue.')}
            </p>
          </div>
        ) : null}
        {!paid && !closed && order && (
          <div className='space-y-4 text-center'>
            <div className='mx-auto flex aspect-square w-full max-w-60 items-center justify-center rounded-xl border bg-white p-4'>
              {order.qrcode && (
                <QRCodeSVG
                  value={order.qrcode}
                  size={208}
                  level='M'
                  marginSize={1}
                  title={t('Payment QR code')}
                  className='h-auto w-full'
                />
              )}
              {!order.qrcode && imageFailed && (
                <p role='alert' className='text-sm text-neutral-600'>
                  {t('QR code could not be loaded.')}
                </p>
              )}
              {!order.qrcode && !imageFailed && (
                <img
                  src={order.qr_image}
                  alt={t('Payment QR code')}
                  onError={() => setImageFailed(true)}
                  className='h-auto w-full'
                />
              )}
            </div>
            <p className='text-sm font-medium'>
              {t('Scan with {{method}} to pay', {
                method: props.method?.name ?? '',
              })}
            </p>
            <p
              role='status'
              className='text-muted-foreground flex items-center justify-center gap-2 text-xs'
            >
              <span className='size-1.5 rounded-full bg-amber-500' />
              {t('Waiting for payment')}
            </p>
            <p className='text-muted-foreground text-xs leading-relaxed'>
              {t('Payment is confirmed automatically. Keep this page open.')}
            </p>
            {(paymentQuery.isError ||
              (queried && !paymentQuery.isFetching)) && (
              <p role='status' className='text-muted-foreground text-xs'>
                {paymentQuery.isError
                  ? t('Unable to check payment. Please retry.')
                  : t(
                      'No payment confirmation yet. Please check again shortly.'
                    )}
              </p>
            )}
            <Button
              variant='outline'
              className='h-10 w-full'
              disabled={paymentQuery.isFetching}
              onClick={() => {
                setQueried(true)
                void paymentQuery.refetch()
              }}
            >
              {paymentQuery.isFetching && (
                <Loader2 className='size-4 animate-spin' />
              )}
              {t('I have paid, check status')}
            </Button>
          </div>
        )}
        {!order && (
          <div className='space-y-5'>
            {!isExternal && (
              <div className='text-muted-foreground flex flex-col items-center gap-3 py-5'>
                <QrCode className='size-12 stroke-1' />
                <p className='text-xs'>
                  {t('Your payment QR code will appear here.')}
                </p>
              </div>
            )}
            {props.error && (
              <p
                role='alert'
                className='text-destructive text-sm leading-relaxed'
              >
                {props.error}
              </p>
            )}
            <Button
              className='h-11 w-full rounded-lg'
              disabled={props.disabled || props.processing || props.calculating}
              onClick={props.onPay}
            >
              {props.processing && <Loader2 className='size-4 animate-spin' />}
              {isExternal
                ? t('Continue to payment')
                : t('Generate payment code')}
            </Button>
            <p className='text-muted-foreground text-center text-xs leading-relaxed'>
              {t(
                'The amount charged is shown above. Credits are added after payment.'
              )}
            </p>
          </div>
        )}
        {order && (
          <Button
            variant='ghost'
            className='mt-4 h-9 w-full text-xs'
            onClick={props.onReset}
          >
            {paid || closed ? t('Top up again') : t('Change amount')}
          </Button>
        )}
      </div>
      {order && (
        <p
          className='text-muted-foreground mt-4 truncate text-center font-mono text-[10px]'
          title={order.trade_no}
        >
          {t('Order')} {order.trade_no}
        </p>
      )}
    </aside>
  )
}
