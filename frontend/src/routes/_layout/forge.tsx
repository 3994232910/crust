import { useEffect } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ForgeList } from "@/components/Forge/ForgeList"
import { useSidebar } from "@/components/ui/sidebar"

export const Route = createFileRoute("/_layout/forge")({
  component: Forge,
})

function Forge() {
  const { setOpen } = useSidebar()

  useEffect(() => {
    setOpen(false)

    const handleRouteChange = () => {
      setOpen(true)
    }

    window.addEventListener('popstate', handleRouteChange)

    return () => {
      window.removeEventListener('popstate', handleRouteChange)
      setOpen(true)
    }
  }, [setOpen])

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <ForgeList />
    </div>
  )
}

export default Forge
