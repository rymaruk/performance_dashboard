import * as React from "react"
import { cn } from "@/lib/utils"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn("space-y-4", className)}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      className={cn(
        variant === "label"
          ? "text-sm leading-none font-medium"
          : "text-base font-semibold",
        className,
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn("space-y-4", className)}
      {...props}
    />
  )
}

function Field({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "vertical" | "horizontal" | "responsive"
}) {
  return (
    <div
      data-slot="field"
      role="group"
      className={cn(
        "flex gap-2",
        orientation === "vertical" && "flex-col",
        orientation === "horizontal" && "flex-row items-center",
        orientation === "responsive" &&
          "flex-col @sm/field-group:flex-row @sm/field-group:items-center",
        className,
      )}
      {...props}
    />
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="field-label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-title"
      className={cn("text-sm leading-none font-medium", className)}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn("text-muted-foreground text-xs text-balance", className)}
      {...props}
    />
  )
}

function FieldSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  if (children) {
    return (
      <div
        data-slot="field-separator"
        className={cn(
          "flex items-center gap-3 text-xs text-muted-foreground",
          className,
        )}
        {...props}
      >
        <div className="bg-border h-px flex-1" />
        <span>{children}</span>
        <div className="bg-border h-px flex-1" />
      </div>
    )
  }

  return (
    <div
      data-slot="field-separator"
      className={cn("bg-border h-px", className)}
      {...props}
    />
  )
}

function FieldError({
  className,
  errors,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const messages = errors
    ?.map((e) => e?.message)
    .filter((m): m is string => Boolean(m))

  if (!children && (!messages || messages.length === 0)) return null

  return (
    <div
      data-slot="field-error"
      className={cn("text-destructive text-xs", className)}
      {...props}
    >
      {children ??
        (messages && messages.length === 1 ? (
          messages[0]
        ) : (
          <ul className="list-disc pl-4 space-y-0.5">
            {messages?.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        ))}
    </div>
  )
}

export {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
}
