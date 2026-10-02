// "3 days" / "3 zile" / "3 дня": picks the grammatical form for n using the language's plural rules.
export function countOf(lang: string, n: number, forms: Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }) {
  const rule = new Intl.PluralRules(lang).select(n)
  return `${n.toLocaleString('en-US')} ${forms[rule] ?? forms.other}`
}
