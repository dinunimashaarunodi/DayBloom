import type * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function AuthCard({
  title,
  description,
  footer,
  children,
}: {
  title: string
  description: string
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">
          <h1>{title}</h1>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer && (
        <CardFooter className="justify-center py-4 text-sm text-muted-foreground">
          {footer}
        </CardFooter>
      )}
    </Card>
  )
}
