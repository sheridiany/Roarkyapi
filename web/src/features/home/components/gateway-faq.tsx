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
import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function GatewayFaq() {
  const { t } = useTranslation()
  const [active, setActive] = useState<number | null>(0)
  const questions = [
    [
      t('Who is this gateway for?'),
      t(
        'For developers and teams using Claude Code, Codex or OpenAI-compatible clients. Keep your tools and update the API endpoint and key.'
      ),
    ],
    [
      t('Which models are supported?'),
      t(
        'The model list above shows the models currently available on this platform. Availability depends on the selected group.'
      ),
    ],
    [
      t('What is a group multiplier?'),
      t(
        'A group multiplier adjusts the model base price for the selected group. Check the displayed price before sending requests.'
      ),
    ],
    [
      t('Do I need to change my code?'),
      t(
        'For compatible clients, update the API base URL and API key. Check the documentation for provider-specific settings.'
      ),
    ],
    [
      t('How is availability maintained?'),
      t(
        'The gateway selects available channels and can retry or switch channels when an upstream request fails.'
      ),
    ],
  ]
  return (
    <section className='gateway-faq'>
      <div className='gateway-section-heading'>
        <p className='gateway-eyebrow'>Support</p>
        <h2>{t('Before you get started')}</h2>
        <p>
          {t(
            'A short guide to model access, billing and service availability.'
          )}
        </p>
      </div>
      <div className='gateway-faq-list'>
        {questions.map(([question, answer], index) => (
          <div key={question}>
            <h3>
              <button
                type='button'
                aria-expanded={active === index}
                aria-controls={`gateway-answer-${index}`}
                onClick={() => setActive(active === index ? null : index)}
              >
                {question}
                <ChevronDown size={16} aria-hidden='true' />
              </button>
            </h3>
            <div id={`gateway-answer-${index}`} hidden={active !== index}>
              <p>{answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
