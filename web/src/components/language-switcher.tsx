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
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { Languages, Globe } from '@/components/navigation-icons'
import { Button } from '@/components/ui/button'
import { normalizeInterfaceLanguage } from '@/i18n/languages'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

export function LanguageSwitcher(props: { showLabel?: boolean }) {
  const { i18n, t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const currentLanguage = normalizeInterfaceLanguage(i18n.language)
  const handleChangeLanguage = useCallback(
    async (code: string) => {
      await i18n.changeLanguage(code)
      if (user) {
        try {
          await api.put('/api/user/self', { language: code })
        } catch {
          // Best-effort persistence; don't block the UI on failure
        }
      }
    },
    [i18n, user]
  )

  return (
    <Button
      variant='ghost'
      aria-label={t('Change language')}
      className={props.showLabel ? 'h-9 gap-1.5 px-2' : 'h-9 w-9'}
      onClick={() =>
        handleChangeLanguage(currentLanguage === 'zhCN' ? 'en' : 'zhCN')
      }
    >
      {props.showLabel ? (
        <>
          <Globe className='size-4' aria-hidden='true' />
          <span className='text-xs font-normal uppercase'>
            {currentLanguage === 'zhCN' ? 'ZH' : 'EN'}
          </span>
        </>
      ) : (
        <Languages className='size-[1.2rem]' aria-hidden='true' />
      )}
      <span className='sr-only'>{t('Change language')}</span>
    </Button>
  )
}
