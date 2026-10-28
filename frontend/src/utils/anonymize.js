// Utility to deterministically anonymize student names into "Random 1", "Random 2", etc.

const KNOWN_STUDENT_MAP = {
  'aarav sharma': 'Random 1',
  'priya verma': 'Random 2',
  'dev mukherjee': 'Random 3',
  'dev m': 'Random 3',
  'dev m.': 'Random 3',
  'rohan patel': 'Random 4',
  'rohan k': 'Random 4',
  'rohan k.': 'Random 4',
  'ankit verma': 'Random 5',
  'sneha rao': 'Random 6',
  'kavya sharma': 'Random 7',
  'vikram joshi': 'Random 8',
  'ananya sen': 'Random 9',
  'bhandaridaksh07': 'Random 10',
  'student9756': 'Random 11',
  'alice cooper': 'Random 12',
  'bob dylan': 'Random 13',
}

const dynamicMap = new Map()
let dynamicCounter = 14

export function anonymizeName(name) {
  if (!name || typeof name !== 'string') return 'Random 1'
  const trimmed = name.trim()

  // If already in "Random X" format, keep it
  if (/^random\s+\d+$/i.test(trimmed)) {
    return trimmed
  }

  // Preserve AI Assistant name
  if (trimmed.includes('Spidyy AI') || trimmed.includes('AI Academic')) {
    return trimmed
  }

  // Preserve explicit faculty titles if preferred, or anonymize regular names
  if (trimmed.startsWith('Prof.') || trimmed.startsWith('Dr.')) {
    return trimmed
  }

  const lower = trimmed.toLowerCase()
  if (KNOWN_STUDENT_MAP[lower]) {
    return KNOWN_STUDENT_MAP[lower]
  }

  if (dynamicMap.has(lower)) {
    return dynamicMap.get(lower)
  }

  const assigned = `Random ${dynamicCounter++}`
  dynamicMap.set(lower, assigned)
  return assigned
}

export function getAnonymousAvatar(name) {
  const anon = anonymizeName(name)
  const match = anon.match(/^Random\s+(\d+)$/i)
  if (match) {
    return `R${match[1]}`
  }
  if (anon.includes('AI')) return 'AI'
  if (anon.startsWith('Prof.')) return 'PR'
  if (anon.startsWith('Dr.')) return 'DR'
  return anon.slice(0, 2).toUpperCase()
}
