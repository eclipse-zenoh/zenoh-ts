// This class is used to ensure that the methods of the derived class
// are bound to the correct `this` context when the instance is deconstructed.
// It is not intended to be instantiated directly.
export class Deconstructable {
  constructor() {
    const proto = Object.getPrototypeOf(this);
    for (const name of Object.getOwnPropertyNames(proto)) {
      if (name === "constructor") continue;
      const fn = (this as any)[name];
      if (typeof fn === "function") {
        (this as any)[name] = fn.bind(this);
      }
    }
  }
}

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

/**
 * Creates option items from static constants of a class using reflection
 * @param classRef - The class reference containing static constants
 * @param excludeKeys - Array of property names to exclude from the options
 * @returns Array of option items with labels generated from toString()
 */
export function createOptionsFromStaticConstants(classRef: any, excludeKeys: string[] = []): OptionItem[] {
  return Object.getOwnPropertyNames(classRef)
    .filter(prop => {
      const value = classRef[prop];
      const isUpperCase = prop === prop.toUpperCase();
      const hasToString = value && typeof value.toString === 'function';
      const isObject = typeof value === 'object';
      
      // Filter for static constants (uppercase properties that are object instances with toString)
      // and exclude any keys specified in excludeKeys
      return isUpperCase && value && isObject && hasToString && !excludeKeys.includes(prop);
    })
    .map(prop => {
      const constant = classRef[prop];
      const stringValue = constant.toString();
      return {
        value: stringValue,
        label: stringValue
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label)); // Sort alphabetically by label
}
