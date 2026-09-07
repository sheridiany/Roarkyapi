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
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { RechargeFormCard } from '../recharge-form-card'

test('wallet without online payment directs users to an administrator without redemption or order-history entries', () => {
  render(
    <RechargeFormCard
      topupInfo={null}
      presetAmounts={[]}
      selectedPreset={null}
      onSelectPreset={vi.fn()}
      topupAmount={0}
      onTopupAmountChange={vi.fn()}
      paymentAmount={0}
      calculating={false}
      onPaymentMethodSelect={vi.fn()}
      paymentLoading={null}
    />
  )
  expect(screen.getByRole('region', { name: 'Add Funds' })).toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent(
    'Online topup is not enabled. Please contact the administrator.'
  )
  expect(
    screen.queryByRole('tab', { name: 'Redemption Code' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Order History' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByPlaceholderText('Enter your redemption code')
  ).not.toBeInTheDocument()
})

afterEach(cleanup)

test('preset selection labels credits separately from CNY payment and exposes its selected state', () => {
  const onSelect = vi.fn()
  render(
    <RechargeFormCard
      topupInfo={{
        enable_online_topup: true,
        enable_stripe_topup: false,
        stripe_min_topup: 1,
        amount_options: [10, 20],
        discount: {},
        pay_methods: [{ name: 'Alipay', type: 'alipay' }],
        min_topup: 10,
      }}
      presetAmounts={[{ value: 10 }, { value: 20 }]}
      selectedPreset={10}
      onSelectPreset={onSelect}
      topupAmount={10}
      onTopupAmountChange={vi.fn()}
      paymentAmount={10}
      calculating={false}
      onPaymentMethodSelect={vi.fn()}
      paymentLoading={null}
      selectedPaymentType='alipay'
    />
  )
  expect(screen.getByRole('group', { name: 'Choose an amount' })).toHaveClass(
    'grid-cols-3'
  )
  const preset = screen.getByRole('button', { name: /\$10/ })
  expect(preset).toHaveAttribute('aria-pressed', 'true')
  expect(preset).toHaveTextContent('¥10')
  fireEvent.click(screen.getByRole('button', { name: /\$20/ }))
  expect(onSelect).toHaveBeenCalledWith({ value: 20 })
  expect(screen.getByRole('button', { name: 'Alipay' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})
