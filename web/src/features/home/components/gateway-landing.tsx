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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  LegalLinks,
  ProjectAttribution,
} from '@/components/layout/components/footer'
import { LayoutDashboard } from '@/components/navigation-icons'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useAuthStore } from '@/stores/auth-store'

import { ProviderCards } from './provider-cards'
import { TerminalGridBackground } from './terminal-grid-background'

export function GatewayLanding() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { systemName, logo } = useSystemConfig()
  const isAuthenticated = useAuthStore((state) => !!state.auth.user)

  return (
    <main className='mono-home' lang='en'>
      <TerminalGridBackground />
      <header className='mono-home-header'>
        <div className='mono-home-brand'>
          <img src={logo} width={45} height={45} alt={systemName} />
          <p>{systemName}</p>
        </div>
        <h1>
          {t('Your models.')} <span>{t('One gateway.')}</span>
        </h1>
        <div className='mono-home-actions'>
          <Link
            className='mono-home-console'
            to={isAuthenticated ? '/dashboard' : '/sign-in'}
          >
            <LayoutDashboard size={18} />
            {t('Console')}
          </Link>
        </div>
      </header>
      <div className='mono-home-stage'>
        <ProviderCards />
      </div>
      <footer className='mono-home-attribution flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs'>
        <LegalLinks />
        <ProjectAttribution currentYear={new Date().getFullYear()} inline />
      </footer>
    </main>
  )
}
