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
import { describe, expect, test } from 'vitest'

import { isVisibleModel, isServicePageVisible } from '../service-visibility'

describe('service visibility', () => {
  test.each([
    'gpt-5',
    'codex-mini-latest',
    'claude-sonnet-4',
    'gemini-2.5-pro',
    'grok-4',
    'gpt-image-1',
    'whisper-1',
    'tts-1',
    'sora-2',
    'imagen-4',
    'veo-3',
    'lyria-2',
  ])('keeps native model %s including media capabilities', (model_name) => {
    expect(isVisibleModel({ model_name })).toBe(true)
  })
  test('uses provider metadata for custom aliases and hides other providers', () => {
    expect(
      isVisibleModel({ model_name: 'company-assistant', vendor_name: 'OpenAI' })
    ).toBe(true)
    expect(
      isVisibleModel({ model_name: 'deepseek-chat', vendor_name: 'DeepSeek' })
    ).toBe(false)
    expect(isVisibleModel({ model_name: 'qwen-plus' })).toBe(false)
  })
  test('hides independent service routes while preserving core pages', () => {
    for (const path of [
      '/usage-logs/drawing',
      '/usage-logs/task/',
      '/task-plugins/123?tab=settings',
      '/models/deployments',
      '/system-settings/content/drawing',
    ]) {
      expect(isServicePageVisible(path)).toBe(false)
    }
    for (const path of [
      '/keys',
      '/wallet',
      '/profile',
      '/channels',
      '/models',
      '/usage-logs/common',
    ]) {
      expect(isServicePageVisible(path)).toBe(true)
    }
  })
})
