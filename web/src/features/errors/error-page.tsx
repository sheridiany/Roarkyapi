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
import { Astronaut01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useRouter } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import '@/styles/not-found.css'

const DIGIT_ROWS: Record<string, string[]> = {
  '0': ['00100', '01010', '10001', '10001', '10001', '01010', '00100'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
}
const SPACE_MARKS = ['+', '.', ':', '*', '·', '°']

function SpaceDrifter() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const astronaut = ref.current
    const page = astronaut?.parentElement
    if (!astronaut || !page) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0
    let pointer: { x: number; y: number } | null = null
    let x = page.clientWidth * 0.7
    let y = page.clientHeight * 0.65
    let previous = 0

    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const bounds = page.getBoundingClientRect()
      pointer = {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }
    }
    const leave = () => {
      pointer = null
    }
    const draw = (time: number) => {
      const width = page.clientWidth
      const height = page.clientHeight
      const dt = Math.min(time - previous, 50)
      previous = time
      const targetX = pointer
        ? pointer.x - 30
        : width * (0.5 + Math.sin(time / 8500) * 0.26)
      const targetY = pointer
        ? pointer.y + 34
        : height * (0.59 + Math.cos(time / 6500) * 0.14)
      const follow = 1 - Math.exp(-dt / 450)
      x += (Math.max(24, Math.min(width - 48, targetX)) - x) * follow
      y += (Math.max(72, Math.min(height - 64, targetY)) - y) * follow
      astronaut.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${Math.sin(time / 2100) * 18}deg)`
      frame = requestAnimationFrame(draw)
    }
    const resume = () => {
      cancelAnimationFrame(frame)
      if (document.hidden || reducedMotion.matches) {
        astronaut.style.transform = 'translate3d(70vw, 65vh, 0) rotate(-15deg)'
        return
      }
      previous = performance.now()
      frame = requestAnimationFrame(draw)
    }
    page.addEventListener('pointermove', move)
    page.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', resume)
    reducedMotion.addEventListener('change', resume)
    resume()
    return () => {
      cancelAnimationFrame(frame)
      page.removeEventListener('pointermove', move)
      page.removeEventListener('pointerleave', leave)
      document.removeEventListener('visibilitychange', resume)
      reducedMotion.removeEventListener('change', resume)
    }
  }, [])

  return (
    <div className='lost-space-astronaut' ref={ref} aria-hidden='true'>
      <HugeiconsIcon icon={Astronaut01Icon} size={28} strokeWidth={1.6} />
    </div>
  )
}

interface ErrorPageProps {
  code: number
  className?: string
  minimal?: boolean
}

export function ErrorPage(props: ErrorPageProps) {
  const { t } = useTranslation()
  const { history } = useRouter()
  const messages: Record<number, { title: string; description: string }> = {
    401: {
      title: t('Please sign in'),
      description: t('Sign in to Roark API to continue.'),
    },
    403: {
      title: t('This area is restricted.'),
      description: t('You do not have permission to view this page.'),
    },
    404: {
      title: t('Houston, we have a problem.'),
      description: t('This page may have moved, or drifted into a black hole.'),
    },
    429: {
      title: t('Too many requests'),
      description: t('Please wait a moment before trying again.'),
    },
    500: {
      title: t('We lost the signal.'),
      description: t('Refresh this page to reconnect to Roark API.'),
    },
    502: {
      title: t('Connection interrupted'),
      description: t('The service did not respond. Please try again shortly.'),
    },
    503: {
      title: t('Service temporarily unavailable'),
      description: t(
        'Roark API is temporarily unavailable. Please try again shortly.'
      ),
    },
    504: {
      title: t('The request timed out.'),
      description: t('The service did not respond. Please try again shortly.'),
    },
  }
  const message = messages[props.code] ?? messages[500]
  const digits = [...String(props.code)].map((digit, index) => ({
    id: `${index}:${digit}`,
    pixels: DIGIT_ROWS[digit].flatMap((row, y) =>
      [...row].map((value, x) => ({ id: `${x}:${y}`, lit: value === '1' }))
    ),
  }))

  return (
    <main
      className={cn(
        'lost-space',
        props.minimal && 'lost-space-compact',
        props.className
      )}
    >
      <div className='lost-space-stars' aria-hidden='true'>
        {Array.from({ length: 32 }, (_, index) => (
          <span
            key={index}
            className='lost-space-star'
            style={{
              left: `${(index * 37 + 7) % 100}%`,
              top: `${(index * 23 + 11) % 100}%`,
              animationDelay: `${-index * 3.7}s`,
              animationDuration: `${56 + (index % 5) * 13}s`,
            }}
          >
            {SPACE_MARKS[index % SPACE_MARKS.length]}
          </span>
        ))}
        {Array.from({ length: 6 }, (_, index) => (
          <span
            key={index}
            className='lost-space-cluster'
            style={{
              left: `${12 + ((index * 19) % 76)}%`,
              top: `${20 + ((index * 29) % 66)}%`,
              animationDelay: `${-index * 9}s`,
            }}
          >
            {'. . . . .\n . . . .\n  . . .\n   . .'}
          </span>
        ))}
      </div>

      <nav className='lost-space-nav' aria-label={t('Main navigation')}>
        <Link to='/' className='lost-space-brand'>
          Roark API
        </Link>
        <span aria-hidden='true' />
        <Link to='/dashboard'>
          {t('Console')}
          <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
        </Link>
      </nav>

      <div className='lost-space-content'>
        <h1 className='lost-space-number' aria-label={String(props.code)}>
          {digits.map((digit) => (
            <span
              className='lost-space-digit'
              key={digit.id}
              aria-hidden='true'
            >
              {digit.pixels.map((pixel) => (
                <span
                  key={pixel.id}
                  className={pixel.lit ? 'is-lit' : undefined}
                />
              ))}
            </span>
          ))}
        </h1>
        <h2>{message.title}</h2>
        <p className='lost-space-description'>{message.description}</p>
        <div className='lost-space-actions'>
          {props.code === 401 && (
            <Link className='lost-space-home' to='/sign-in'>
              {t('Sign in')}
            </Link>
          )}
          {(props.code >= 500 || props.code === 429) && (
            <button
              className='lost-space-home'
              type='button'
              onClick={() => window.location.reload()}
            >
              {t('Refresh page')}
            </button>
          )}
          {props.code === 403 && (
            <button
              className='lost-space-secondary'
              type='button'
              onClick={() => history.go(-1)}
            >
              {t('Go Back')}
            </button>
          )}
          <Link
            className={
              props.code === 404 || props.code === 403
                ? 'lost-space-home'
                : 'lost-space-secondary'
            }
            to='/'
          >
            <span className='lost-space-home-dot' aria-hidden='true' />
            {props.code === 404 ? t('Beam me home') : t('Back to Home')}
          </Link>
        </div>
        {props.code === 404 && (
          <p className='lost-space-note'>
            {t('Even in an infinite universe, some pages are still missing.')}
          </p>
        )}
      </div>

      <footer className='lost-space-footer'>
        @ {new Date().getFullYear()} RoarkAPI
      </footer>
      <SpaceDrifter />
    </main>
  )
}
