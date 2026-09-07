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
/** Services exposed by this installation. Other adapters remain available in the backend. */
export const VISIBLE_CHANNEL_TYPES: readonly number[] = [1, 57, 14, 24, 48]

export function isVisibleChannelType(type: number): boolean {
  return VISIBLE_CHANNEL_TYPES.includes(type)
}

export function isVisibleVendor(name: string): boolean {
  return /^(openai|openai api|chatgpt|codex|chatgpt subscription \(codex\)|anthropic|anthropic api|claude|google|google gemini|google gemini api|gemini|xai|x\.ai|grok|grok api)$/i.test(
    name.trim()
  )
}

export function isVisibleModel(model: {
  model_name: string
  vendor_name?: string
}): boolean {
  if (model.vendor_name) return isVisibleVendor(model.vendor_name)
  // Native model names also work when the administrator has not assigned vendor metadata.
  const name = model.model_name
    .trim()
    .replace(/^(openai|anthropic|google|xai)\//i, '')
  return /^(gpt(?:[-.]|$)|chatgpt(?:[-.]|$)|o[1-9](?:[-.]|$)|codex(?:[-.]|$)|claude(?:[-.]|$)|gemini(?:[-.]|$)|grok(?:[-.]|$)|text-(?:embedding|davinci|curie|babbage|ada)|dall-e(?:[-.]|$)|whisper(?:[-.]|$)|tts(?:[-.]|$)|omni-moderation(?:[-.]|$)|sora(?:[-.]|$)|imagen(?:[-.]|$)|veo(?:[-.]|$)|lyria(?:[-.]|$))/i.test(
    name
  )
}

const HIDDEN_SERVICE_PAGES = [
  '/usage-logs/drawing',
  '/usage-logs/task',
  '/task-plugins',
  '/models/deployments',
  '/system-settings/models/model-deployment',
  '/system-settings/content/drawing',
]

export function isServicePageVisible(path: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0].replace(/\/+$/, '')
  return !HIDDEN_SERVICE_PAGES.some(
    (hidden) => pathname === hidden || pathname.startsWith(`${hidden}/`)
  )
}

export function isSidebarServiceModuleVisible(
  section: string,
  module: string
): boolean {
  return section !== 'console' || !['midjourney', 'task'].includes(module)
}
