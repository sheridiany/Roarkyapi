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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { GatewayFaq } from '../components/gateway-faq'

describe('Homepage questions', () => {
  it('opens an answer with the keyboard and closes the previous answer', async () => {
    const user = userEvent.setup()
    render(<GatewayFaq />)
    const first = screen.getByRole('button', {
      name: 'Who is this gateway for?',
    })
    const second = screen.getByRole('button', {
      name: 'Which models are supported?',
    })
    expect(first).toHaveAttribute('aria-expanded', 'true')
    second.focus()
    await user.keyboard('{Enter}')
    expect(second).toHaveAttribute('aria-expanded', 'true')
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.getByText(
        'The model list above shows the models currently available on this platform. Availability depends on the selected group.'
      )
    ).toBeVisible()
    await user.keyboard(' ')
    expect(second).toHaveAttribute('aria-expanded', 'false')
  })
})
