import { DataPlanet } from '../planet/DataPlanet'
import type { EvolutionStage } from '@/types/dashboard'

interface CenterTopProps {
  stage: EvolutionStage
}

export function CenterTop({ stage }: CenterTopProps) {
  return (
    <div className="h-72 w-full flex items-center justify-center bg-background">
      <DataPlanet stage={stage} />
    </div>
  )
}