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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { SectionPageLayout } from '@/components/layout'
import { useStatus } from '@/hooks/use-status'

import { ApiKeysDialogs } from './components/api-keys-dialogs'
import { ApiKeysPrimaryButtons } from './components/api-keys-primary-buttons'
import { ApiKeysProvider } from './components/api-keys-provider'
import { ApiKeysTable } from './components/api-keys-table'

export function ApiKeys() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const baseUrl = String(
    status?.server_address || window.location.origin
  ).replace(/\/+$/, '')
  const endpoint = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`
  return (
    <ApiKeysProvider>
      <SectionPageLayout
        fixedContent
        description={
          <span className='flex flex-wrap items-center gap-x-4 gap-y-1'>
            <span>{t('Manage your API access keys.')}</span>
            <span className='inline-flex min-w-0 items-center gap-1.5'>
              <span>{t('Base URL')}</span>
              <code className='text-foreground text-xs break-all'>
                {endpoint}
              </code>
              <CopyButton
                value={endpoint}
                className='size-7'
                iconClassName='size-3.5'
              />
            </span>
          </span>
        }
      >
        <SectionPageLayout.Title>{t('API Keys')}</SectionPageLayout.Title>
        <SectionPageLayout.Actions>
          <ApiKeysPrimaryButtons />
        </SectionPageLayout.Actions>
        <SectionPageLayout.Content>
          <ApiKeysTable />
        </SectionPageLayout.Content>
      </SectionPageLayout>

      <ApiKeysDialogs />
    </ApiKeysProvider>
  )
}
