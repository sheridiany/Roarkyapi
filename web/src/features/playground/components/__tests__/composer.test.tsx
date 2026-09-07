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
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'

import { PlaygroundEmptyState } from '../chat/playground-empty-state'
import { PlaygroundInput } from '../input/playground-input'
import { PlaygroundInputTools } from '../input/playground-input-tools'

it('shows model testing instructions without starter prompt buttons', () => {
  render(<PlaygroundEmptyState />)
  expect(screen.getByRole('heading', { name: 'Model Testing' })).toBeInTheDocument()
  expect(screen.queryAllByRole('button')).toHaveLength(0)
})

it('keeps only clear history and disables it for an empty conversation', () => {
  const { rerender } = render(<PlaygroundInputTools onClearMessages={() => {}} />)
  expect(screen.getAllByRole('button')).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Clear chat history' })).toBeDisabled()
  rerender(<PlaygroundInputTools hasMessages onClearMessages={() => {}} />)
  expect(screen.getByRole('button', { name: 'Clear chat history' })).toBeEnabled()
})

it('keeps the composer border neutral when its textarea receives focus', () => {
  render(<PlaygroundInput onSubmit={() => {}} models={[]} modelValue='' onModelChange={() => {}} groups={[]} groupValue='' onGroupChange={() => {}} />)
  const input = screen.getByRole('textbox')
  fireEvent.focus(input)
  const box = input.closest('[data-slot="input-group"]')
  expect(box).toHaveClass('has-[[data-slot=input-group-control]:focus-visible]:ring-0')
  expect(box).toHaveClass('has-[[data-slot=input-group-control]:focus-visible]:border-border/70')
  expect(box).not.toHaveClass('focus-within:border-primary/45')
})
