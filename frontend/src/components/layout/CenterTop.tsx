import { DataPlanet } from '../planet/DataPlanet'
import type { EvolutionStage } from '@/types/dashboard'

interface CenterTopProps {
  stage: EvolutionStage
}

export function CenterTop({ stage }: CenterTopProps) {
  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-background to-panel/50 rounded-lg border border-border/50">
      <div className="relative w-full h-full max-w-md max-h-md">
        <DataPlanet stage={stage} />
      </div>
    </div>
  )
}