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
import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { ApiKeyGroupCombobox } from '../api-key-group-combobox'

const options = [
  { value: 'auto', label: 'Automatic grouping', ratio: 'auto' },
  { value: 'ClaudeKiro', label: 'ClaudeKiro', desc: 'Claude Kiro', ratio: 0.5 },
  { value: 'Codex', label: 'Codex', desc: 'Coding models', ratio: 0.5 },
]

function Harness() {
  const [value, setValue] = useState('auto')
  return (
    <ApiKeyGroupCombobox
      options={options}
      value={value}
      onValueChange={setValue}
    />
  )
}

describe('Compact API key group selection', () => {
  it('shows an unembellished automatic default and avoids duplicate descriptions', () => {
    render(<Harness />)
    const trigger = screen.getByRole('combobox')
    expect(trigger).toHaveTextContent('Automatic grouping')
    expect(trigger).not.toHaveAttribute('data-auto-group-effect')
    fireEvent.click(trigger)
    const kiro = screen.getByRole('option', { name: /ClaudeKiro/ })
    expect(kiro).toHaveTextContent('(0.5x)')
    expect(within(kiro).queryByText('Claude Kiro')).not.toBeInTheDocument()
    expect(kiro).not.toHaveTextContent('Ratio')
    expect(kiro).toHaveClass('py-1.5')
    expect(screen.getByRole('option', { name: /Codex/ })).toHaveTextContent(
      'Coding models'
    )
  })

  it('searches descriptions and closes after selecting a compact group item', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.input(screen.getByPlaceholderText('Search...'), {
      target: { value: 'coding' },
    })
    expect(
      screen.queryByRole('option', { name: /ClaudeKiro/ })
    ).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('option', { name: /Codex/ }))
    expect(screen.getByRole('combobox')).toHaveTextContent('Codex')
    expect(screen.getByRole('combobox')).toHaveTextContent('(0.5x)')
    expect(screen.getByRole('combobox')).toHaveAttribute(
      'aria-expanded',
      'false'
    )
  })

  it('prevents opening a disabled group selector', () => {
    render(
      <ApiKeyGroupCombobox
        options={options}
        value='auto'
        disabled
        onValueChange={() => {}}
      />
    )
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
