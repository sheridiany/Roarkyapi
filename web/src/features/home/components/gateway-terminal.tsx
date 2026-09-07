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
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function GatewayTerminal() {
  const { t } = useTranslation()
  const [cycle, setCycle] = useState(0)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (media.matches) return
    const timer = window.setInterval(
      () => setCycle((value) => value + 1),
      14000
    )
    return () => window.clearInterval(timer)
  }, [])
  const claude = cycle % 2 === 1
  const lines = claude
    ? [
        ['◆', 'plan: inspect application, locate authentication flow'],
        ['›', 'Read(src/auth/session.ts)'],
        ['›', 'Edit(src/auth/session.ts)'],
        [
          '◇',
          t('Keep the existing session checks and handle expired credentials.'),
        ],
        ['›', 'Run(auth/session.test.ts)'],
        ['•', 'session validation and refresh tests passed'],
        ['✓', t('Session checks updated. Tests passed.')],
      ]
    : [
        ['◆', 'plan: inspect webhook handler, find idempotency boundary'],
        ['›', 'rg(stripe.webhooks.constructEvent|event.id)'],
        ['›', 'open(app/api/webhooks/stripe/route.ts)'],
        [
          '◇',
          t(
            'Fulfillment runs before the event ID is saved, so replayed events create duplicate orders.'
          ),
        ],
        ['›', 'patch(save processed event id before fulfillment)'],
        ['•', 'duplicate event returns 200 without creating another order'],
        [
          '✓',
          t(
            'Save the event before fulfillment. Repeated webhooks now return safely.'
          ),
        ],
      ]
  return (
    <div
      className={`gateway-terminal ${claude ? 'gateway-terminal-claude' : ''}`}
      aria-label={t('Coding workflow demo')}
    >
      <div className='gateway-terminal-bar'>
        <div className='gateway-terminal-dots' aria-hidden='true'>
          <i />
          <i />
          <i />
        </div>
        <span>
          {claude ? 'Claude Code — workspace' : 'Codex — patch workspace'}
        </span>
        <small>LIVE</small>
      </div>
      <div className='gateway-terminal-body' key={cycle}>
        <div className='gateway-terminal-prompt'>
          <span>$</span>
          <code>
            {claude
              ? 'claude "improve session validation"'
              : 'codex "fix duplicate Stripe webhook processing"'}
          </code>
          <i className='gateway-cursor' aria-hidden='true' />
        </div>
        <div className='gateway-thinking'>
          <span aria-hidden='true'>▣</span>
          {claude
            ? t('Claude is reviewing the code')
            : t('Codex is planning a patch')}
          <span className='gateway-thinking-dots' aria-hidden='true'>
            •••
          </span>
        </div>
        <div className='gateway-terminal-lines'>
          {lines.map(([prefix, line], index) => (
            <div
              className='gateway-terminal-line'
              key={line}
              style={{ animationDelay: `${1.18 + index * 1.05}s` }}
            >
              <span aria-hidden='true'>{prefix}</span>
              <code>{line}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
