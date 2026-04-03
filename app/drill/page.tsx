'use client'
import dynamic from 'next/dynamic'

const DrillClient = dynamic(() => import('@/components/DrillClient'), { ssr: false })

export default function DrillPage() {
  return <DrillClient />
}
