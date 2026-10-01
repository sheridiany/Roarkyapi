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
import { t } from 'i18next'

import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

import { API_ENDPOINTS } from './constants'
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ModelOption,
  GroupOption,
} from './types'

export function isImageGenerationModel(model: string): boolean {
  return (
    model.startsWith('gpt-image-') ||
    /^gemini-.*-image(?:-|$)/.test(model) ||
    model === 'grok-imagine' ||
    /^grok-imagine-image(?:-|$)/.test(model)
  )
}

/**
 * Send chat completion request (non-streaming)
 */
export async function sendChatCompletion(
  payload: ChatCompletionRequest,
  signal?: AbortSignal
): Promise<ChatCompletionResponse> {
  if (isImageGenerationModel(payload.model)) {
    const content = [...payload.messages]
      .reverse()
      .find((message) => message.role === 'user')?.content
    if (typeof content !== 'string') {
      throw new Error(t('{{modality}} not supported', { modality: t('Image') }))
    }
    const response = await api.post(
      '/pg/images/generations',
      {
        model: payload.model,
        group: payload.group,
        prompt: content,
        n: 1,
        response_format: 'b64_json',
      },
      { signal, timeout: 180000, skipErrorHandler: true } as Record<
        string,
        unknown
      >
    )
    const images: { b64_json?: string }[] = response.data?.data ?? []
    if (
      !images.length ||
      images.some(
        (image) => !image.b64_json || !/^[A-Za-z0-9+/=]+$/.test(image.b64_json)
      )
    ) {
      throw new Error(t('Image not available'))
    }
    return {
      id: `image-${Date.now()}`,
      object: 'chat.completion',
      created: Date.now() / 1000,
      model: payload.model,
      choices: [
        {
          index: 0,
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: images
              .map((image) => {
                const mime = image.b64_json?.startsWith('/9j/')
                  ? 'image/jpeg'
                  : 'image/png'
                return `![${t('Generated image')}](data:${mime};base64,${image.b64_json})`
              })
              .join('\n\n'),
          },
        },
      ],
    }
  }
  const res = await api.post(API_ENDPOINTS.CHAT_COMPLETIONS, payload, {
    signal,
    skipErrorHandler: true,
  } as Record<string, unknown>)
  return res.data
}

/**
 * Get user available models
 */
export async function getUserModels(group: string): Promise<ModelOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_MODELS, {
    params: { group },
  })
  const { data } = res
  requireServerSuccess(data)

  if (!data.success || !Array.isArray(data.data)) {
    return []
  }

  return data.data.map((model: string) => ({
    label: model,
    value: model,
  }))
}

/**
 * Get user groups
 */
export async function getUserGroups(): Promise<GroupOption[]> {
  const res = await api.get(API_ENDPOINTS.USER_GROUPS)
  const { data } = res
  requireServerSuccess(data)

  if (!data.success || !data.data) {
    return []
  }

  const groupData = data.data as Record<string, { desc: string; ratio: number }>

  // label is for button display (name only); desc is for dropdown content
  return Object.entries(groupData).map(([group, info]) => ({
    label: group,
    value: group,
    ratio: info.ratio,
    desc: info.desc,
  }))
}
