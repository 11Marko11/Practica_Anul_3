// The server stores numbers as "+37369123456"; show Moldovan ones as "+373 69 123 456".
export function formatPhone(phone: string | null | undefined) {
  if (!phone) return ''
  const m = /^\+373(\d{2})(\d{3})(\d{3})$/.exec(phone)
  return m ? `+373 ${m[1]} ${m[2]} ${m[3]}` : phone
}
