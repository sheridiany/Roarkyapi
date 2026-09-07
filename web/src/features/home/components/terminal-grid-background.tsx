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

export function TerminalGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )
    let width = 0
    const height = 192
    const spacing = 7
    const rows = Math.ceil(height / spacing)
    let columns = 0
    let cells = new Float32Array(0)
    let frame = 0
    let lastFrame = 0

    const paint = () => {
      context.clearRect(0, 0, width, height)
      context.strokeStyle = 'rgba(235, 238, 241, 0.06)'
      context.lineWidth = 1
      for (let row = 0; row < rows; row++) {
        for (let column = 0; column < columns; column++) {
          const index = row * columns + column
          const x = column * spacing
          const y = row * spacing
          const opacity = cells[index] * 0.28
          if (opacity > 0.02) {
            context.fillStyle = `rgba(235, 238, 241, ${opacity})`
            context.fillRect(x, y, 6, 6)
          }
          context.strokeRect(x + 0.5, y + 0.5, 5, 5)
        }
      }
    }

    const resize = () => {
      width = canvas.getBoundingClientRect().width
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.ceil(width * scale)
      canvas.height = height * scale
      context.setTransform(scale, 0, 0, scale, 0, 0)
      columns = Math.ceil(width / spacing)
      cells = Float32Array.from({ length: columns * rows }, () =>
        Math.random() < 0.12 ? Math.random() * 0.35 : 0
      )
      paint()
    }

    const animate = (time: number) => {
      frame = requestAnimationFrame(animate)
      if (time - lastFrame < 33) return
      lastFrame = time
      const pulseRow =
        Math.random() < 0.00035 ? Math.floor(Math.random() * rows) : -1
      for (let index = 0; index < cells.length; index++) {
        if (Math.random() < 0.0018) {
          cells[index] = Math.min(1, cells[index] + 0.25 + Math.random() * 0.75)
        }
        if (Math.floor(index / columns) === pulseRow) {
          cells[index] = Math.max(
            cells[index],
            0.55 * (0.35 + Math.random() * 0.65)
          )
        }
        cells[index] *= 0.93
      }
      paint()
    }

    const syncAnimation = () => {
      cancelAnimationFrame(frame)
      if (!motionPreference.matches && !document.hidden) {
        frame = requestAnimationFrame(animate)
      }
    }

    resize()
    syncAnimation()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    motionPreference.addEventListener('change', syncAnimation)
    document.addEventListener('visibilitychange', syncAnimation)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      motionPreference.removeEventListener('change', syncAnimation)
      document.removeEventListener('visibilitychange', syncAnimation)
    }
  }, [])

  return (
    <div className='mono-home-grid' aria-hidden='true'>
      <canvas ref={canvasRef} />
    </div>
  )
}
