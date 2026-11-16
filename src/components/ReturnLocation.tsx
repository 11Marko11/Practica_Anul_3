import { useI18n } from '../i18n/I18nContext'

// Where the car was left at the end of the trip, with a link to the map.
export function ReturnLocation({ location }: { location: { address: string; lat: number; lng: number; by: string | null } }) {
  const { t } = useI18n()
  const r = t.returnPlace
  const map = `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`
  const who = location.by === 'HOST' ? r.byHost : location.by === 'CUSTOMER' ? r.byCustomer : null
  return (
    <div style={{ fontSize: 13, color: '#424245', marginTop: 4 }}>
      📍 {r.leftAt}: <a href={map} target="_blank" rel="noreferrer" style={{ color: '#0071e3', textDecoration: 'none' }}>{location.address}</a>
      {who && <span style={{ color: '#86868b' }}> · {who}</span>}
    </div>
  )
}
