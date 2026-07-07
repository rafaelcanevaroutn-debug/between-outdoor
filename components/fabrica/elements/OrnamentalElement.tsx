'use client'

import { useEffect, useState, useMemo } from 'react'
import type { RegionTokens } from '@/types/fabrica'

interface OrnamentalElementProps {
  assetUrl?: string
  svgContent?: string              // pass directly to skip fetch (used in forms)
  w?: number
  h?: number
  colorMode?: 'tint' | 'fixed'
  colorMap?: Record<string, string> // { "--var": "tokenRole" | "#hex" }
  tokens?: RegionTokens             // needed to resolve colorMap token roles
}

// Strip script tags and event-handler attributes
function sanitizeSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
}

export function extractCssVars(svgText: string): string[] {
  const matches = [...svgText.matchAll(/var\((--[\w-]+)\)/g)]
  return [...new Set(matches.map(m => m[1]))]
}

export default function OrnamentalElement({
  assetUrl,
  svgContent: svgContentProp,
  w = 200,
  h = 400,
  colorMode = 'tint',
  colorMap,
  tokens,
}: OrnamentalElementProps) {
  const [fetchedSvg, setFetchedSvg] = useState<string | null>(null)

  useEffect(() => {
    if (svgContentProp || !assetUrl) return
    let cancelled = false
    fetch(assetUrl)
      .then(r => r.text())
      .then(text => { if (!cancelled) setFetchedSvg(sanitizeSvg(text)) })
      .catch(() => { if (!cancelled) setFetchedSvg(null) })
    return () => { cancelled = true }
  }, [assetUrl, svgContentProp])

  const svgContent = svgContentProp ?? fetchedSvg

  // Build inline CSS vars from colorMap + tokens
  const inlineVars = useMemo<React.CSSProperties>(() => {
    if (!colorMap || !tokens || Object.keys(colorMap).length === 0) return {}
    const vars: Record<string, string> = {}
    for (const [cssVar, tokenOrHex] of Object.entries(colorMap)) {
      // If the value is a token role, resolve it; otherwise treat as literal color
      vars[cssVar] = tokens[tokenOrHex] ?? tokenOrHex
    }
    return vars as React.CSSProperties
  }, [colorMap, tokens])

  if (!svgContent) {
    return (
      <div
        style={{
          width: w,
          height: h,
          backgroundColor: 'rgba(255,255,255,0.04)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.25)',
        }}
      >
        {assetUrl ? '…' : '—'}
      </div>
    )
  }

  return (
    <div
      style={{
        width: w,
        height: h,
        display: 'block',
        ...inlineVars,
      }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  )
}
