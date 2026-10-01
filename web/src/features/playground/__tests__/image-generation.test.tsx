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
import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { isImageGenerationModel, sendChatCompletion } from '../api'
import { PlaygroundMessageContent } from '../components/message/playground-message-content'
import { GENERATED_IMAGE_PLACEHOLDER } from '../lib/message/generated-image'
import { saveMessages, loadMessages } from '../lib/storage/storage'

afterEach(() => vi.restoreAllMocks())

describe('image generation in playground', () => {
  it('routes image models to Images API with the selected group and renders the returned image', async () => {
    const post = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ data: { data: [{ b64_json: 'aW1hZ2U=' }] } })
    const result = await sendChatCompletion({
      model: 'gpt-image-2.5-flare',
      group: 'Codex',
      stream: true,
      messages: [{ role: 'user', content: 'A blue circle' }],
    })
    expect(post).toHaveBeenCalledWith(
      '/pg/images/generations',
      {
        model: 'gpt-image-2.5-flare',
        group: 'Codex',
        prompt: 'A blue circle',
        n: 1,
        response_format: 'b64_json',
      },
      expect.objectContaining({ timeout: 180000 })
    )
    expect(result.choices[0].message.content).toContain(
      'data:image/png;base64,aW1hZ2U='
    )
  })
  it('does not show an empty image response as a successful generation', async () => {
    vi.spyOn(api, 'post').mockResolvedValue({ data: { data: [] } })
    await expect(
      sendChatCompletion({
        model: 'grok-imagine-image',
        stream: false,
        messages: [{ role: 'user', content: 'circle' }],
      })
    ).rejects.toThrow()
  })
  it('keeps text and video models out of the image endpoint', () => {
    for (const model of [
      'gpt-image-2',
      'gemini-3-pro-image-preview',
      'grok-imagine',
      'grok-imagine-image-2.0',
    ]) {
      expect(isImageGenerationModel(model)).toBe(true)
    }
    for (const model of [
      'codex/gpt-6-sol',
      'gemini-3.8-flash',
      'grok-4.7',
      'grok-imagine-video',
    ]) {
      expect(isImageGenerationModel(model)).toBe(false)
    }
  })
})

it('displays a generated image and a download link instead of its base64 text', () => {
  const content = '![Generated image](data:image/png;base64,aW1hZ2U=)'
  render(
    <PlaygroundMessageContent
      actions={null}
      alignment='left'
      message={{
        key: 'image',
        from: 'assistant',
        versions: [{ id: 'v1', content }],
        status: 'complete',
      }}
      versionContent={content}
    />
  )
  expect(screen.getByRole('img', { name: 'Generated image' })).toHaveAttribute(
    'src',
    'data:image/png;base64,aW1hZ2U='
  )
  expect(screen.getByRole('button', { name: 'Download' })).toHaveAttribute(
    'download',
    'image.png'
  )
  expect(screen.queryByText(content)).not.toBeInTheDocument()
})

it('keeps image data out of text history without changing the displayed result', () => {
  localStorage.clear()
  const content = '![Generated image](data:image/png;base64,aW1hZ2U=)'
  const message = {
    key: 'image',
    from: 'assistant' as const,
    versions: [{ id: 'v', content }],
    status: 'complete' as const,
  }
  saveMessages([message])
  expect(message.versions[0].content).toBe(content)
  expect(loadMessages()?.[0].versions[0].content).toBe(
    GENERATED_IMAGE_PLACEHOLDER
  )
  localStorage.clear()
})
