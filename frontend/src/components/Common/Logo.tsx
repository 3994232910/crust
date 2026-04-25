import { Link } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import crustLogo from "/assets/images/crust_logo.svg"

interface LogoProps {
  variant?: "full" | "icon" | "responsive"
  className?: string
  asLink?: boolean
}

export function Logo({
  variant = "full",
  className,
  asLink = true,
}: LogoProps) {
  const content =
    variant === "responsive" ? (
      <>
        {/* expanded: icon + "Crust" text */}
        <span className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <img src={crustLogo} alt="Crust" className={cn("h-9 w-auto", className)} />
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.35rem", lineHeight: 1, letterSpacing: "0.02em" }} className="text-primary select-none">
            Crust
          </span>
        </span>
        {/* collapsed: icon only */}
        <img
          src={crustLogo}
          alt="Crust"
          className={cn("size-8 hidden group-data-[collapsible=icon]:block", className)}
        />
      </>
    ) : (
      <span className={cn("flex items-center gap-2", variant === "icon" && "justify-center")}>
        <img
          src={crustLogo}
          alt="Crust"
          className={cn(variant === "full" ? "h-9 w-auto" : "size-8", className)}
        />
        {variant === "full" && (
          <span style={{ fontFamily: "'Fredoka', sans-serif", fontSize: "1.35rem", lineHeight: 1, letterSpacing: "0.02em" }} className="text-primary select-none">
            Crust
          </span>
        )}
      </span>
    )

  if (!asLink) {
    return content
  }

  return <Link to="/">{content}</Link>
}
