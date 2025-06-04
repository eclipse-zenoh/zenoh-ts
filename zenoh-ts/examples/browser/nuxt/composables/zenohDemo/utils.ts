// Utility functions for working with TypeScript enums and creating option arrays

export interface OptionItem {
  value: number | string;
  label: string;
}

/**
 * Converts an enum key from UPPER_SNAKE_CASE to Title Case
 * Example: "REAL_TIME" -> "Real Time"
 */
export function enumKeyToLabel(key: string): string {
  return key
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Creates an option array from a numeric TypeScript enum
 * @param enumObj - The enum object to iterate over
 * @param excludeKeys - Array of enum keys to exclude (e.g., 'DEFAULT' values)
 * @param customLabels - Optional mapping of enum keys to custom labels
 * @returns Array of options suitable for HTML select elements
 */
export function createOptionsFromEnum<T extends Record<string, string | number>>(
  enumObj: T,
  excludeKeys: string[] = [],
  customLabels: Record<string, string> = {}
): OptionItem[] {
  return Object.entries(enumObj)
    .filter(([key, value]) => 
      typeof value === 'number' && 
      !excludeKeys.includes(key)
    )
    .map(([key, value]) => ({
      value: value as number,
      label: customLabels[key] || enumKeyToLabel(key)
    }))
    .sort((a, b) => (a.value as number) - (b.value as number)); // Sort by numeric value
}
