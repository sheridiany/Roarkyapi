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
import i18next from 'i18next'
import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

import {
  calculateAmount,
  calculateStripeAmount,
  calculateWaffoAmount,
  calculateWaffoPancakeAmount,
  requestPayment,
  requestStripePayment,
  isApiSuccess,
} from '../api'
import { isStripePayment, isWaffoPayment, isWaffoPancakePayment } from '../lib'
import type {
  AmountRequest,
  AmountResponse,
  InlineCheckout,
  PaymentResponse,
} from '../types'

// ============================================================================
// Payment Hook
// ============================================================================

type AmountCalculator = (request: AmountRequest) => Promise<AmountResponse>

export interface PaymentAmountCalculators {
  regular: AmountCalculator
  stripe: AmountCalculator
  waffo: AmountCalculator
  waffoPancake: AmountCalculator
}

const defaultPaymentAmountCalculators: PaymentAmountCalculators = {
  regular: calculateAmount,
  stripe: calculateStripeAmount,
  waffo: calculateWaffoAmount,
  waffoPancake: calculateWaffoPancakeAmount,
}

export async function requestPaymentAmount(
  topupAmount: number,
  paymentType: string,
  calculators: PaymentAmountCalculators = defaultPaymentAmountCalculators
): Promise<number> {
  let calculator = calculators.regular
  if (isStripePayment(paymentType)) {
    calculator = calculators.stripe
  } else if (isWaffoPayment(paymentType)) {
    calculator = calculators.waffo
  } else if (isWaffoPancakePayment(paymentType)) {
    calculator = calculators.waffoPancake
  }

  const response = await calculator({ amount: topupAmount })
  if (!isApiSuccess(response) || !response.data) {
    return 0
  }

  return Number.parseFloat(response.data)
}

export function usePayment() {
  const [amount, setAmount] = useState<number>(0)
  const [calculating, setCalculating] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [checkout, setCheckout] = useState<InlineCheckout | null>(null)
  const [paymentError, setPaymentError] = useState('')
  const calculationId = useRef(0)
  const submitting = useRef(false)

  // Calculate payment amount
  const calculatePaymentAmount = useCallback(
    async (topupAmount: number, paymentType: string) => {
      const requestId = ++calculationId.current
      try {
        setCalculating(true)
        const calculatedAmount = await requestPaymentAmount(
          topupAmount,
          paymentType
        )
        if (requestId === calculationId.current) setAmount(calculatedAmount)
        return calculatedAmount
      } catch {
        if (requestId === calculationId.current) setAmount(0)
        return 0
      } finally {
        if (requestId === calculationId.current) setCalculating(false)
      }
    },
    []
  )

  // Process payment
  const processPayment = useCallback(
    async (topupAmount: number, paymentType: string) => {
      if (submitting.current) return false
      submitting.current = true
      try {
        setProcessing(true)
        setPaymentError('')

        const isStripe = isStripePayment(paymentType)
        const amount = Math.floor(topupAmount)

        const response = isStripe
          ? await requestStripePayment({
              amount,
              payment_method: 'stripe',
            })
          : await requestPayment({
              amount,
              payment_method: paymentType,
              inline_qr: true,
            })

        if (!isApiSuccess(response)) {
          setPaymentError(
            i18next.t('Unable to create a payment QR code. Please try again.')
          )
          return false
        }

        // Handle Stripe payment
        if (isStripe && response.data?.pay_link) {
          window.open(response.data.pay_link as string, '_blank')
          toast.success(i18next.t('Redirecting to payment page...'))
          return true
        }

        // Handle non-Stripe payment
        if (!isStripe) {
          const inline = (response as PaymentResponse).checkout
          if (inline && (inline.qrcode || inline.qr_image)) {
            setCheckout(inline)
            return true
          }
        }
        setPaymentError(
          i18next.t('Unable to create a payment QR code. Please try again.')
        )
        return false
      } catch {
        setPaymentError(
          i18next.t('Unable to create a payment QR code. Please try again.')
        )
        return false
      } finally {
        setProcessing(false)
        submitting.current = false
      }
    },
    []
  )

  return {
    amount,
    calculating,
    processing,
    checkout,
    paymentError,
    resetCheckout: () => {
      setCheckout(null)
      setPaymentError('')
    },
    calculatePaymentAmount,
    processPayment,
    setAmount,
  }
}
