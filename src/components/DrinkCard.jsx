import { Wine, Beer, GlassWater } from 'lucide-react'

const icons = {
  shot: Wine,
  beer: Beer,
  mixed: GlassWater,
}

export default function DrinkCard({ drinkType, label, standardDrinks, onLog, disabled }) {
  const Icon = icons[drinkType] || Wine

  return (
    <button
      onClick={() => onLog(drinkType)}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-2 p-5 bg-gray-900 border border-gray-700 rounded-xl hover:border-buzz-primary hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none min-h-[100px]"
    >
      <Icon size={32} className="text-buzz-primary" />
      <span className="font-medium text-sm">{label}</span>
      <span className="text-xs text-gray-400">{standardDrinks} std drink{standardDrinks !== 1 ? 's' : ''}</span>
    </button>
  )
}
