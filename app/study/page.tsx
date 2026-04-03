'use client'
import dynamic from 'next/dynamic'

const StudyClient = dynamic(() => import('@/components/StudyClient'), { ssr: false })

export default function StudyPage() {
  return <StudyClient />
}
