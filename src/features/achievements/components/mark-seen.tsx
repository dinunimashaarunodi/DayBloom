"use client"

import { useEffect, useRef } from "react"

import { markAchievementsSeen } from "../actions"

/** Once the page is shown, remembers its new achievements as seen. */
export function MarkSeen({ codes }: { codes: string[] }) {
  const sent = useRef(false)
  useEffect(() => {
    if (sent.current || codes.length === 0) return
    sent.current = true
    void markAchievementsSeen(codes)
  }, [codes])
  return null
}
