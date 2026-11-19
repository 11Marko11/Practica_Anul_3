import { useI18n } from '../i18n/I18nContext'
import { toggleFavorite, useIsFavorite } from '../lib/favorites'

// A heart: an outline, filled when `filled`.
export function HeartIcon({ size = 20, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.7 4 7.3 4c2 0 3.6 1.1 4.7 2.7C13.1 5.1 14.7 4 16.7 4c3.6 0 5.9 3.6 4.6 7.1-1.8 4.8-9.3 9.4-9.3 9.4z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Adds or removes a car from the favourites. Works inside a link (the car cards): the click
// stays on the heart.
export function FavoriteButton({ carId, className, size = 22 }: { carId: number; className?: string; size?: number }) {
  const { t } = useI18n()
  const on = useIsFavorite(carId)
  return (
    <button
      type="button"
      className={`fav-button${on ? ' fav-button--on' : ''}${className ? ` ${className}` : ''}`}
      aria-pressed={on}
      aria-label={on ? t.favorites.remove : t.favorites.add}
      title={on ? t.favorites.remove : t.favorites.add}
      onClick={e => { e.preventDefault(); e.stopPropagation(); toggleFavorite(carId) }}
    >
      <HeartIcon size={size} filled={on} />
    </button>
  )
}
