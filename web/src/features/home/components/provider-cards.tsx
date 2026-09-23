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
import Anthropic from '@lobehub/icons/es/Anthropic/components/Mono'
import Gemini from '@lobehub/icons/es/Gemini/components/Mono'
import OpenAI from '@lobehub/icons/es/OpenAI/components/Mono'
import XAI from '@lobehub/icons/es/XAI/components/Mono'

import { ProviderCardArtwork } from './provider-card-artwork'

// Official text/reasoning/coding model releases checked on 2026-09-23.
// Includes the enabled image generation model; excludes audio-only models,
// aliases, and restricted cybersecurity models.
// Sources: https://developers.openai.com/api/docs/models/all
// https://platform.claude.com/docs/en/release-notes/overview
// https://ai.google.dev/gemini-api/docs/models
// https://docs.x.ai/developers/release-notes
const providers = [
  {
    name: 'OpenAI',
    models: [
      'GPT-6 Astra',
      'GPT-6 Sol',
      'GPT-6 Luna',
      'GPT-5.6 Sol',
      'GPT-5.6 Terra',
      'GPT-5.5',
      'GPT Image 2',
      'GPT Image 2.5 Flare',
      'GPT Image 2.5 Sunburst',
    ],
    family: 'ChatGPT',
    icon: OpenAI,
    tone: 'openai',
    alphabet: 'OPENAI01{}',
    phase: 0,
  },
  {
    name: 'Anthropic',
    models: [
      'Claude Fable 5.1',
      'Claude Opus 5.5',
      'Claude Opus 5',
      'Claude Sonnet 5',
      'Claude Fable 5',
      'Claude Opus 4.8',
    ],
    family: 'Claude',
    icon: Anthropic,
    tone: 'anthropic',
    alphabet: 'CLAUDE01<>',
    phase: 2.4,
  },
  {
    name: 'Gemini',
    models: [
      'Gemini 3.8 Flash',
      'Gemini 3.7 Flash',
      'Gemini 3.5 Flash-Lite',
      'Gemini 3 Pro Image',
      'Gemini 3 Pro Image Preview',
      'Gemini 3.1 Flash Image',
      'Gemini 3.1 Flash Image Preview',
      'Gemini 3.1 Flash-Lite Image',
    ],
    family: 'Gemini',
    icon: Gemini,
    tone: 'gemini',
    alphabet: 'GEMINI01*+',
    phase: 4.8,
  },
  {
    name: 'xAI',
    models: ['Grok 4.7', 'Grok 4.6', 'Grok 4.5'],
    family: 'Grok',
    icon: XAI,
    tone: 'xai',
    alphabet: 'GROK01/+=',
    phase: 7.2,
  },
]

export function ProviderCards() {
  return (
    <div className='mono-provider-grid'>
      {providers.map((provider) => (
        <article
          className={`mono-provider-card mono-provider-${provider.tone}`}
          aria-label={provider.name}
          key={provider.name}
        >
          <ProviderCardArtwork
            variant={provider.tone}
            alphabet={provider.alphabet}
            phase={provider.phase}
          />
          <h2 className='mono-provider-brand'>
            <provider.icon size={26} aria-hidden='true' />
            <span>{provider.name}</span>
          </h2>
          <ul className='mono-provider-models'>
            {provider.models.map((model) => (
              <li key={model} aria-label={model}>
                <span className='mono-model-lettering' aria-hidden='true'>
                  {model}
                </span>
              </li>
            ))}
          </ul>
          <p className='mono-provider-family'>{provider.family}</p>
        </article>
      ))}
    </div>
  )
}
