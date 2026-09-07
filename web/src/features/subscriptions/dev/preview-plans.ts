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
import type { PlanRecord } from '../types'
// Explicit development preview; never offered for checkout.
export const previewPlans: PlanRecord[] = [
  {
    plan: {
      id: 101,
      title: 'Pro',
      price_amount: 49,
      total_amount: 50000000,
      currency: 'USD',
      duration_unit: 'month',
      duration_value: 1,
      quota_reset_period: 'monthly',
      enabled: true,
      sort_order: 0,
      allow_balance_pay: false,
      allow_wallet_overflow: true,
      max_purchase_per_user: 0,
    },
  },
  {
    plan: {
      id: 102,
      title: 'Team',
      price_amount: 129,
      total_amount: 150000000,
      currency: 'USD',
      duration_unit: 'month',
      duration_value: 1,
      quota_reset_period: 'monthly',
      enabled: true,
      sort_order: 1,
      allow_balance_pay: false,
      allow_wallet_overflow: true,
      max_purchase_per_user: 0,
    },
  },
]
