"use client"

import { Badge } from "@/components/atoms"
import { MessageIcon } from "@/icons"
import LocalizedClientLink from "../LocalizedLink/LocalizedLink"
import { useUnreads } from "@talkjs/react"

function MessageButtonWithTalkJs({ locale }: { locale: string }) {
  const unreads = useUnreads()

  return (
    <LocalizedClientLink href="/user/messages" locale={locale} className="relative">
      <MessageIcon size={20} />
      {Boolean(unreads?.length) && (
        <Badge className="absolute -top-2 -right-2 w-4 h-4 p-0">
          {unreads?.length}
        </Badge>
      )}
    </LocalizedClientLink>
  )
}

/** Senza TalkJS configurato non usare useUnreads (niente Session → hydration mismatch). */
export function MessageButton({ locale }: { locale: string }) {
  const appId = process.env.NEXT_PUBLIC_TALKJS_APP_ID
  if (!appId?.trim()) {
    return (
      <LocalizedClientLink href="/user/messages" locale={locale} className="relative">
        <MessageIcon size={20} />
      </LocalizedClientLink>
    )
  }

  return <MessageButtonWithTalkJs locale={locale} />
}
