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
import { expect, test } from 'vitest'

import { getUserAvatarSrc } from '../avatar'

test('new usernames receive matching A–Z avatars regardless of case and surrounding spaces', () => {
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    expect(getUserAvatarSrc(`${letter}ser`)).toBe(
      `/avatars/riso/${letter}.webp`
    )
    expect(getUserAvatarSrc(`  ${letter.toLowerCase()}ser  `)).toBe(
      `/avatars/riso/${letter}.webp`
    )
  }
})

test.each([
  ['Élodie', 'E'],
  ['小明', 'Z'],
  ['123user', 'D'],
  ['😀', 'L'],
  ['', 'A'],
])('username %s receives the stable avatar %s', (username, letter) => {
  expect(getUserAvatarSrc(username)).toBe(`/avatars/riso/${letter}.webp`)
})
