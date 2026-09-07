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
import { act, renderHook, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { requestPayment } from '../api'
import { PAYMENT_TYPES } from '../constants'
import { requestPaymentAmount, usePayment } from './use-payment'

describe('payment amount routing', () => {
  test('uses the dedicated Waffo amount calculator', async () => {
    const calls: string[] = []
    const amount = await requestPaymentAmount(120, PAYMENT_TYPES.WAFFO, {
      regular: async () => {
        calls.push('regular')
        return { success: true, data: '1' }
      },
      stripe: async () => {
        calls.push('stripe')
        return { success: true, data: '2' }
      },
      waffo: async (request) => {
        calls.push(`waffo:${request.amount}`)
        return { success: true, data: '18.75' }
      },
      waffoPancake: async () => {
        calls.push('pancake')
        return { success: true, data: '4' }
      },
    })

    expect(amount).toBe(18.75)
    expect(calls).toEqual(['waffo:120'])
  })
})

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  requestPayment: vi.fn(),
}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
test('Alipay returns an inline QR checkout without opening another page and prevents duplicate submission', async () => {
  const checkout = {
    trade_no: 'order-1',
    amount: 10,
    money: 10,
    payment_method: 'alipay',
    qrcode: 'https://qr.alipay.com/test',
  }
  let resolveRequest: (value: {
    message: string
    checkout: typeof checkout
  }) => void = () => {}
  vi.mocked(requestPayment).mockReturnValue(
    new Promise((resolve) => {
      resolveRequest = resolve
    })
  )
  const open = vi.spyOn(window, 'open')
  const { result } = renderHook(() => usePayment())
  let payment: Promise<boolean>
  await act(async () => {
    payment = result.current.processPayment(10, 'alipay')
    expect(await result.current.processPayment(10, 'alipay')).toBe(false)
    resolveRequest({ message: 'success', checkout })
    await payment
  })
  expect(requestPayment).toHaveBeenCalledTimes(1)
  expect(requestPayment).toHaveBeenCalledWith({
    amount: 10,
    payment_method: 'alipay',
    inline_qr: true,
  })
  expect(result.current.checkout).toEqual(checkout)
  expect(open).not.toHaveBeenCalled()
  open.mockRestore()
})
