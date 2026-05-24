interface ToggleProps {
  on: boolean
  onToggle: () => void
  disabled?: boolean
  color?: 'green' | 'amber'
}

export default function Toggle({ on, onToggle, disabled, color = 'green' }: ToggleProps) {
  const bg = on
    ? color === 'amber' ? 'bg-amber-400' : 'bg-green-600'
    : 'bg-gray-300'

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none shrink-0 ${bg} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  )
}
