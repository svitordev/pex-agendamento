import * as React from "react"
import * as ReactPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
)

const Label = React.forwardRef<
  React.ElementRef<typeof ReactPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof ReactPrimitive.Label> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <ReactPrimitive.Label
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
))
Label.displayName = "Label"

export { Label }