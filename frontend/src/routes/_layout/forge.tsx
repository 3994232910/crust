import { createFileRoute } from "@tanstack/react-router"
import { ForgeList } from "@/components/Forge/ForgeList"

export const Route = createFileRoute("/_layout/forge")({
  component: Forge,
})

function Forge() {
  return (
    <div className="flex flex-col">
      <ForgeList />
    </div>
  )
}

export default Forge
