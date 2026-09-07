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
import { beforeEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'

import { getVisibleModelCatalog } from '../api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))
beforeEach(() => vi.clearAllMocks())
test('loads later pages before filtering so hidden providers do not create empty visible pages', async () => {
  vi.mocked(api.get)
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: { total: 3, items: [{ id: 1, model_name: 'deepseek-chat' }] },
      },
    })
    .mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          total: 3,
          items: [
            {
              id: 2,
              model_name: 'gpt-image-1',
              bound_channels: [
                { name: 'OpenAI', type: 1 },
                { name: 'Other', type: 33 },
              ],
            },
            { id: 3, model_name: 'veo-3' },
          ],
        },
      },
    })
  const result = await getVisibleModelCatalog({}, [])
  expect(result.map((model) => model.model_name)).toEqual([
    'gpt-image-1',
    'veo-3',
  ])
  expect(result[0].bound_channels).toEqual([{ name: 'OpenAI', type: 1 }])
  expect(api.get).toHaveBeenNthCalledWith(2, '/api/models/search', {
    params: { p: 2, page_size: 1000 },
  })
})
test('does not return an incomplete catalog after a failed page', async () => {
  vi.mocked(api.get).mockResolvedValueOnce({
    data: { success: false, message: 'Unavailable' },
  })
  await expect(getVisibleModelCatalog({}, [])).rejects.toThrow('Unavailable')
})
