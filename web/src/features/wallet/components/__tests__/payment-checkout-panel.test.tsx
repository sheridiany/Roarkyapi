import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { getUserBillingHistory } from '../../api'
import { PaymentCheckoutPanel } from '../payment-checkout-panel'

vi.mock('../../api', () => ({ getUserBillingHistory: vi.fn() }))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
const order = {
  trade_no: 'order-1',
  amount: 10,
  money: 10,
  payment_method: 'alipay',
  qrcode: 'https://qr.alipay.com/checkout-test',
}

function renderCheckout(onPaid = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <PaymentCheckoutPanel
        checkout={order}
        method={{ name: 'Alipay', type: 'alipay' }}
        amount={20}
        credit='$10'
        currency='¥'
        disabled={false}
        calculating={false}
        processing={false}
        error=''
        onPay={vi.fn()}
        onReset={vi.fn()}
        onPaid={onPaid}
      />
    </QueryClientProvider>
  )
  return { client, onPaid }
}

test('checking an unpaid QR order cannot mark it paid; confirmed server settlement updates the balance', async () => {
  vi.mocked(getUserBillingHistory).mockResolvedValue({
    success: true,
    data: { items: [], total: 0 },
  })
  const { client, onPaid } = renderCheckout()
  expect(screen.getByTitle('Payment QR code')).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  const check = await screen.findByRole('button', {
    name: 'I have paid, check status',
  })
  await waitFor(() => expect(check).toBeEnabled())
  fireEvent.click(check)
  await screen.findByText(
    'No payment confirmation yet. Please check again shortly.'
  )
  expect(onPaid).not.toHaveBeenCalled()
  vi.mocked(getUserBillingHistory).mockResolvedValue({
    success: true,
    data: {
      items: [
        { ...order, id: 1, user_id: 1, create_time: 1, status: 'success' },
      ],
      total: 1,
    },
  })
  fireEvent.click(check)
  await screen.findByText('Payment received')
  expect(onPaid).toHaveBeenCalledTimes(1)
  expect(screen.queryByTitle('Payment QR code')).not.toBeInTheDocument()
  client.clear()
})

test('an expired server order hides its QR code and offers a new order', async () => {
  vi.mocked(getUserBillingHistory).mockResolvedValue({
    success: true,
    data: {
      items: [
        { ...order, id: 1, user_id: 1, create_time: 1, status: 'expired' },
      ],
      total: 1,
    },
  })
  const { client, onPaid } = renderCheckout()
  await screen.findByText('Payment order closed')
  expect(screen.queryByTitle('Payment QR code')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Top up again' })).toBeEnabled()
  expect(onPaid).not.toHaveBeenCalled()
  client.clear()
})
