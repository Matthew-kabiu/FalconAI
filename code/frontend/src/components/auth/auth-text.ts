// Fills `{name}` slots in a dictionary sentence, e.g. fill(t('auth.verify.lead'), { email }).
export function fill(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((result, [name, value]) => result.replace(`{${name}}`, String(value)), text);
}
