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
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { Moon, Sun } from '@/components/navigation-icons'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/theme-provider'

export function ThemeSwitch() {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  useEffect(() => {
    document
      .querySelector("meta[name='theme-color']")
      ?.setAttribute('content', resolvedTheme === 'dark' ? '#020817' : '#fff')
  }, [resolvedTheme])
  return (
    <Button
      variant='ghost'
      size='icon'
      className='h-9 w-9'
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? (
        <Moon className='size-[1.2rem]' aria-hidden='true' />
      ) : (
        <Sun className='size-[1.2rem]' aria-hidden='true' />
      )}
      <span className='sr-only'>{t('Toggle theme')}</span>
    </Button>
  )
}
