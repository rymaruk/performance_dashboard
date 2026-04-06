import * as React from "react"
import * as RechartsPrimitive from "recharts"

import { cn } from "@/lib/utils"

const THEMES = { light: "", dark: ".dark" } as const

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>

type ChartContextProps = { config: ChartConfig }

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }
  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
          "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50",
          "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
          "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-radial-bar-background-sector]:fill-muted",
          "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
          "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
          "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
          "flex aspect-square justify-center text-xs",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, c]) => c.theme ?? c.color,
  )

  if (!colorConfig.length) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([, prefix]) =>
              `${prefix} [data-chart=${id}] {\n${colorConfig
                .map(([key, itemConfig]) => {
                  const color =
                    itemConfig.theme?.[
                      prefix === "" ? "light" : "dark"
                    ] ?? itemConfig.color
                  return color ? `  --color-${key}: ${color};` : null
                })
                .filter(Boolean)
                .join("\n")}\n}`,
          )
          .join("\n"),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

interface ChartTooltipContentProps {
  active?: boolean
  payload?: Array<{
    type?: string
    name?: string
    dataKey?: string
    value?: number | string
    color?: string
    fill?: string
    payload?: Record<string, unknown>
  }>
  label?: string
  labelFormatter?: (label: string, payload: unknown[]) => React.ReactNode
  className?: string
  hideLabel?: boolean
  hideIndicator?: boolean
  indicator?: "line" | "dot" | "dashed"
  nameKey?: string
}

function ChartTooltipContent({
  active,
  payload,
  className,
  hideLabel = false,
  hideIndicator = false,
  indicator = "dot",
  label,
  labelFormatter,
  nameKey,
}: ChartTooltipContentProps) {
  const { config } = useChart()

  if (!active || !payload?.length) return null

  return (
    <div
      className={cn(
        "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
        className,
      )}
    >
      {!hideLabel && label && (
        <div className="font-medium">
          {labelFormatter ? labelFormatter(label, payload) : (config[label]?.label ?? label)}
        </div>
      )}
      <div className="grid gap-1.5">
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const resolvedName = nameKey
              ? (item.payload as Record<string, unknown> | undefined)?.[nameKey] as string | undefined
              : undefined
            const key = `${resolvedName ?? item.name ?? item.dataKey ?? "value"}`
            const itemConfig = config[key] ?? config[item.dataKey as string]
            const indicatorColor = (item.payload as Record<string, string> | undefined)?.fill ?? item.color

            return (
              <div key={index} className="flex items-center gap-2 [&>svg]:size-3 [&>svg]:text-muted-foreground">
                {!hideIndicator && (
                  <div
                    className={cn(
                      "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                      indicator === "dot" && "size-2.5",
                      indicator === "line" && "w-1 h-3.5",
                      indicator === "dashed" && "w-0 border-[1.5px] border-dashed h-3.5",
                    )}
                    style={
                      {
                        "--color-bg": indicatorColor,
                        "--color-border": indicatorColor,
                      } as React.CSSProperties
                    }
                  />
                )}
                <div className="flex flex-1 justify-between items-baseline gap-2 leading-none">
                  <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                  {item.value != null && (
                    <span className="font-mono font-medium tabular-nums text-foreground">
                      {typeof item.value === "number" ? item.value.toLocaleString() : String(item.value)}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
      </div>
    </div>
  )
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartStyle,
  useChart,
}
