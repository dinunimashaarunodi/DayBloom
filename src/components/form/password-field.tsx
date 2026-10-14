"use client"

import { Eye, EyeOff } from "lucide-react"
import { useState } from "react"
import type * as React from "react"

import { Button } from "@/components/ui/button"

import { FormField } from "./form-field"

/** A password FormField with a show/hide toggle, so typos are easy to spot. */
export function PasswordField(
  props: Omit<React.ComponentProps<typeof FormField>, "type">,
) {
  const [visible, setVisible] = useState(false)
  const id = props.id ?? props.name

  return (
    <div className="relative">
      <FormField
        {...props}
        type={visible ? "text" : "password"}
        className="h-10 pr-11 md:h-9"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        // Centred on the input: label (14px) + gap (6px) + half the spare height.
        className="absolute top-6 right-1 size-8 md:top-[22px]"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={id}
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? <EyeOff /> : <Eye />}
      </Button>
    </div>
  )
}
