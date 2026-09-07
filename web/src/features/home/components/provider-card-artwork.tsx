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
import { useEffect, useRef } from 'react'

interface ProviderCardArtworkProps {
  variant: string
  alphabet: string
  phase: number
}

export function ProviderCardArtwork(props: ProviderCardArtworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )
    let width = 0
    let height = 0
    let frame = 0
    let lastFrame = 0
    let elapsed = props.phase
    let isVisible = true

    const paint = () => {
      context.clearRect(0, 0, width, height)
      context.save()
      if (props.variant === 'openai') {
      const cell = Math.max(7, Math.round(width / 34))
      const columns = Math.ceil(width / cell)
      const rows = Math.ceil(height / cell)
      context.font = `${Math.max(6, cell - 1)}px monospace`
      context.textBaseline = 'top'
      for (let row = 0; row < rows; row++) {
        const y = row / rows
        for (let column = 0; column < columns; column++) {
          const x = column / columns
          const field =
            Math.sin(x * 9 + Math.sin(y * 7 + elapsed * 0.38)) +
            Math.cos(y * 8 - elapsed * 0.32) +
            Math.sin(x * 6 + y * 9 + elapsed * 0.24)
          if (field < 0.25 || field > 1.95) continue
          const edge = Math.min(1, (field - 0.25) * 2, (1.95 - field) * 2)
          const shimmer =
            0.45 + 0.55 * Math.sin(column * 13 + row * 17 + elapsed)
          context.globalAlpha = edge * (0.12 + shimmer * 0.18)
          context.fillStyle = (column + row) % 5 === 0 ? '#8cabff' : '#ffffff'
          const character =
            (column * 7 + row * 11 + Math.floor(elapsed * 2)) %
            props.alphabet.length
          context.fillText(props.alphabet[character], column * cell, row * cell)
        }
      }

        context.globalAlpha = 0.25
        context.strokeStyle = '#a8d6cb'
        context.lineWidth = 0.7
        const scanY = (elapsed * 15) % height
        context.beginPath()
        context.moveTo(0, scanY)
        context.lineTo(width, scanY)
        context.stroke()
      } else if (props.variant === 'anthropic') {
        // Fine ink contours on a warm paper surface.
        context.strokeStyle = '#592b1a'
        context.lineWidth = 0.8
        for (let contour = 0; contour < 24; contour++) {
          context.globalAlpha = 0.12 + contour / 160
          context.beginPath()
          for (let step = 0; step <= 70; step++) {
            const y = step / 70 * height
            const x = width * (0.86 + Math.sin(y / height * 5 + elapsed * 0.12 + contour * 0.07) * 0.23) + contour * 4 - 40
            if (step === 0) context.moveTo(x, y)
            else context.lineTo(x, y)
          }
          context.stroke()
        }
      } else if (props.variant === 'gemini') {
        // Broad translucent facets overlap into an animated spectral prism.
        context.globalCompositeOperation = 'screen'
        for (let facet = 0; facet < 5; facet++) {
          const centerX = width * (0.5 + Math.sin(elapsed * 0.18 + facet) * 0.4)
          const centerY = height * (0.45 + Math.cos(elapsed * 0.13 + facet) * 0.35)
          const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.75)
          glow.addColorStop(0, ['#b3f5ff', '#dc9dff', '#6488ff', '#ffc9e9', '#87dcff'][facet])
          glow.addColorStop(1, '#00000000')
          context.fillStyle = glow
          context.globalAlpha = 0.2
          context.beginPath()
          context.moveTo(centerX, centerY - height * 0.4)
          context.lineTo(centerX + width * 0.6, centerY + height * 0.25)
          context.lineTo(centerX - width * 0.6, centerY + height * 0.4)
          context.closePath()
          context.fill()
        }
      } else {
        // Monochrome orbital geometry with a single travelling light.
        context.translate(width * 0.75, height * 0.6)
        context.rotate(-0.55)
        for (let orbit = 0; orbit < 7; orbit++) {
          context.beginPath()
          context.ellipse(0, 0, width * (0.3 + orbit * 0.13), height * (0.11 + orbit * 0.035), 0, 0, Math.PI * 2)
          context.strokeStyle = '#ffffff'
          context.globalAlpha = orbit === 3 ? 0.55 : 0.12
          context.lineWidth = orbit === 3 ? 1.2 : 0.6
          context.stroke()
        }
        const angle = elapsed * 0.3
        context.beginPath()
        context.arc(Math.cos(angle) * width * 0.69, Math.sin(angle) * height * 0.215, 2.5, 0, Math.PI * 2)
        context.fillStyle = '#ffffff'
        context.globalAlpha = 0.9
        context.shadowColor = '#ffffff'
        context.shadowBlur = 12
        context.fill()
      }
      context.restore()
      context.shadowBlur = 0
      context.globalAlpha = 1
      context.globalCompositeOperation = 'source-over'
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.ceil(width * scale)
      canvas.height = Math.ceil(height * scale)
      context.setTransform(scale, 0, 0, scale, 0, 0)
      paint()
    }

    const animate = (time: number) => {
      frame = requestAnimationFrame(animate)
      if (time - lastFrame < 42) return
      if (lastFrame) elapsed += Math.min(time - lastFrame, 100) / 1000
      lastFrame = time
      paint()
    }

    const syncAnimation = () => {
      cancelAnimationFrame(frame)
      lastFrame = 0
      if (isVisible && !document.hidden && !motionPreference.matches) {
        frame = requestAnimationFrame(animate)
      }
    }

    resize()
    syncAnimation()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(canvas)
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      syncAnimation()
    })
    visibilityObserver.observe(canvas)
    motionPreference.addEventListener('change', syncAnimation)
    document.addEventListener('visibilitychange', syncAnimation)
    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      visibilityObserver.disconnect()
      motionPreference.removeEventListener('change', syncAnimation)
      document.removeEventListener('visibilitychange', syncAnimation)
    }
  }, [props.alphabet, props.phase, props.variant])

  return (
    <canvas
      ref={canvasRef}
      className='mono-provider-artwork'
      aria-hidden='true'
    />
  )
}
