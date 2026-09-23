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
import { ChevronDownIcon } from 'lucide-react'
import * as React from 'react'
import { enUS, fr, ja, ru, vi, zhCN, zhTW } from 'react-day-picker/locale'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toIntlLocale } from '@/i18n/languages'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

const calendarLocales = {
  en: enUS,
  zh: zhCN,
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  fr,
  ru,
  ja,
  vi,
} as const

interface DateTimePickerProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  compact?: boolean
  allowClear?: boolean
  minDate?: Date
  maxDate?: Date
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  className,
  compact = false,
  allowClear = true,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const { t, i18n } = useTranslation()
  const placeholderText = placeholder ?? t('Select date')
  const calendarLocale =
    calendarLocales[
      toIntlLocale(
        i18n.language || i18n.resolvedLanguage
      ) as keyof typeof calendarLocales
    ] ?? enUS
  const currentYear = new Date().getFullYear()
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(value)
  const [month, setMonth] = React.useState<Date | undefined>(value)
  const [time, setTime] = React.useState<string>('00:00')

  React.useEffect(() => {
    setDate(value)
    setMonth(value)
    if (value) {
      const hours = value.getHours().toString().padStart(2, '0')
      const minutes = value.getMinutes().toString().padStart(2, '0')
      setTime(`${hours}:${minutes}`)
    }
  }, [value])

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes] = time.split(':').map(Number)
      const newDate = new Date(selectedDate)
      newDate.setHours(hours, minutes, 0, 0)
      if (minDate && newDate < minDate) newDate.setTime(minDate.getTime())
      if (maxDate && newDate > maxDate) newDate.setTime(maxDate.getTime())
      setTime(dayjs(newDate).format('HH:mm'))
      setDate(newDate)
      setMonth(newDate)
      onChange?.(newDate)
      setOpen(false)
    } else {
      setDate(undefined)
      setMonth(undefined)
      onChange?.(undefined)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    if (!/^\d{2}:\d{2}$/.test(newTime)) return
    setTime(newTime)

    if (date) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDate = new Date(date)
      newDate.setHours(hours, minutes, 0, 0)
      if (minDate && newDate < minDate) newDate.setTime(minDate.getTime())
      if (maxDate && newDate > maxDate) newDate.setTime(maxDate.getTime())
      setTime(dayjs(newDate).format('HH:mm'))
      setDate(newDate)
      onChange?.(newDate)
    }
  }

  const handleClear = () => {
    setDate(undefined)
    setMonth(undefined)
    setTime('00:00')
    onChange?.(undefined)
  }

  const timeInput = (
    <Input
      type='time'
      aria-label={`${placeholderText} ${t('Time')}`}
      value={time}
      onChange={handleTimeChange}
      className='w-32 appearance-none [&::-webkit-calendar-picker-indicator]:hidden'
      disabled={!date}
    />
  )
  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              type='button'
              aria-label={placeholderText}
              variant='outline'
              className={cn(
                'flex-1 justify-between font-normal',
                !date && 'text-muted-foreground'
              )}
            />
          }
        >
          {date
            ? dayjs(date).format(compact ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD')
            : placeholderText}
          <ChevronDownIcon className='h-4 w-4 opacity-50' />
        </PopoverTrigger>
        <PopoverContent
          className='w-auto max-w-[calc(100vw-2rem)] overflow-hidden p-0'
          align='start'
        >
          <Calendar
            mode='single'
            required={!allowClear}
            disabled={(day) =>
              Boolean(
                (minDate && dayjs(day).isBefore(minDate, 'day')) ||
                (maxDate && dayjs(day).isAfter(maxDate, 'day'))
              )
            }
            selected={date}
            month={month}
            onMonthChange={setMonth}
            captionLayout='dropdown'
            onSelect={handleDateSelect}
            locale={calendarLocale}
            startMonth={new Date(currentYear - 100, 0)}
            endMonth={new Date(currentYear + 100, 11)}
          />
          {compact && (
            <div className='flex items-center justify-between gap-3 border-t p-3'>
              <span className='text-sm'>{t('Time')}</span>
              {timeInput}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {!compact && timeInput}
      {date && allowClear && (
        <Button
          type='button'
          variant='outline'
          size='icon'
          onClick={handleClear}
          className='shrink-0'
          aria-label={t('Clear')}
        >
          <span aria-hidden='true'>✕</span>
        </Button>
      )}
    </div>
  )
}
