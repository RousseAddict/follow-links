import { useState } from 'react'
import { imageUrl } from '../lib/tmdb'

// Some TMDB logos are black or very dark, which disappears on our dark artwork.
// Sample the logo once (TMDB images allow CORS) and fall back to text when it is too dark.
const verdicts = new Map<string, boolean>()

function isLightEnough(img: HTMLImageElement): boolean {
  try {
    const size = 48
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return true
    ctx.drawImage(img, 0, 0, size, size)
    const { data } = ctx.getImageData(0, 0, size, size)
    let sum = 0
    let weight = 0
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] / 255
      if (a < 0.2) continue
      const lum = (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255
      sum += lum * a
      weight += a
    }
    // Black and navy logos sit well under 0.2; coloured ones (orange, red) stay readable above ~0.3.
    return weight === 0 ? false : sum / weight > 0.28
  } catch {
    return false
  }
}

interface Props {
  logoPath: string | null | undefined
  title: string
  /** Classes for the text fallback (size, weight). */
  textClassName: string
  /** Classes for the logo image (max height and width). */
  logoClassName: string
  as?: 'h1' | 'h2' | 'h3'
}

export function TitleLogo({ logoPath, title, textClassName, logoClassName, as: Tag = 'h2' }: Props) {
  const src = logoPath ? imageUrl(logoPath, 'w500') : ''
  const [verdict, setVerdict] = useState<{ src: string; ok: boolean } | null>(null)
  const known = src ? verdicts.get(src) : undefined
  const ok = known ?? (verdict?.src === src ? verdict.ok : undefined)

  if (!src || ok === false) {
    return <Tag className={textClassName}>{title}</Tag>
  }

  return (
    <Tag className="m-0">
      <span className="sr-only">{title}</span>
      <img
        key={src}
        src={src}
        alt=""
        crossOrigin="anonymous"
        decoding="async"
        onLoad={e => {
          const light = isLightEnough(e.currentTarget)
          verdicts.set(src, light)
          setVerdict({ src, ok: light })
        }}
        onError={() => { verdicts.set(src, false); setVerdict({ src, ok: false }) }}
        className={`block h-auto w-auto object-contain object-left-bottom drop-shadow-[0_4px_24px_rgb(0_0_0/0.45)] transition-opacity duration-300 ${ok ? 'opacity-100' : 'opacity-0'} ${logoClassName}`}
      />
    </Tag>
  )
}
