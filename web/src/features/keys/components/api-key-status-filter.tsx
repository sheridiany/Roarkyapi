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

import { Button } from '@/components/ui/button'

import { API_KEY_STATUS_OPTIONS } from '../constants'

export function ApiKeyStatusFilter(props: {
  value: string
  onChange: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div
      role='group'
      aria-label={t('Status')}
      className='bg-muted/50 flex max-w-full shrink-0 flex-nowrap items-center gap-1 overflow-x-auto rounded-lg p-1'
    >
      <Button
        variant={props.value === '' ? 'secondary' : 'ghost'}
        size='sm'
        aria-pressed={props.value === ''}
        onClick={() => props.onChange('')}
      >
        {t('All')}
      </Button>
      {API_KEY_STATUS_OPTIONS.map((option) => (
        <Button
          key={option.value}
          variant={props.value === option.value ? 'secondary' : 'ghost'}
          size='sm'
          aria-pressed={props.value === option.value}
          onClick={() => props.onChange(option.value)}
        >
          {t(option.label)}
        </Button>
      ))}
    </div>
  )
}
