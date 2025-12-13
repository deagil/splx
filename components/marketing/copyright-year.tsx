'use client'
import { useEffect, useState } from 'react'

export default function CopyrightYear() {
  const [year, setYear] = useState<number | null>(null)

  useEffect(() => {
    setYear(new Date().getFullYear())
  }, [])

  // Fallback to static year during SSR
  return <>{year ?? 2025}</>
}
