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
import { afterEach, beforeEach, expect, test } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { STORAGE_KEYS } from '../../../constants'
import type { Message } from '../../../types'
import {
  clearPlaygroundData,
  loadConfig,
  loadMessages,
  loadParameterEnabled,
  saveConfig,
  saveMessages,
  saveParameterEnabled,
} from '../storage'

const messages: Message[] = [
  {
    key: 'a-chat',
    from: 'user',
    versions: [{ id: 'a-version', content: 'Account A private chat' }],
  },
]

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

afterEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
})

test('existing Roark histories and settings survive loading until explicitly cleared', () => {
  localStorage.setItem(
    STORAGE_KEYS.CONFIG,
    JSON.stringify({ model: 'legacy-model' })
  )
  localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages))
  localStorage.setItem(
    STORAGE_KEYS.PARAMETER_ENABLED,
    JSON.stringify({ temperature: true })
  )
  expect(loadConfig()).toEqual({ model: 'legacy-model' })
  expect(loadMessages()).toEqual(messages)
  expect(loadParameterEnabled()).toEqual({ temperature: true })
  saveConfig({ model: 'updated-model' })
  saveMessages(messages)
  saveParameterEnabled({ temperature: false })
  expect(loadConfig()).toEqual({ model: 'updated-model' })
  expect(loadMessages()).toEqual(messages)
  expect(loadParameterEnabled()).toEqual({ temperature: false })
  clearPlaygroundData()
  expect(loadMessages()).toBeNull()
  expect(loadConfig()).toEqual({})
  expect(loadParameterEnabled()).toEqual({})
})
