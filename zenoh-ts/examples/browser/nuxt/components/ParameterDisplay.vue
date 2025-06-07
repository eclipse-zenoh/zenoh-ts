<template>
  <div class="parameter-display" v-html="formattedData"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

// Define props interface
interface Props {
  type: string;
  data: Record<string, any>;
}

// Define component props
const props = defineProps<Props>();

// Color constants for different log types
const LOG_COLORS: Record<string, string> = {
  info: "#2563eb",      // blue
  success: "#16a34a",   // green
  error: "#dc2626",     // red
  data: "#7c3aed",      // purple
  warning: "#ea580c",   // orange
  neutral: "#6b7280",   // gray
};

// Color constants for JSON syntax highlighting
const JSON_COLORS = {
  key: "#059669",       // emerald
  string: "#dc2626",    // red
  number: "#2563eb",    // blue
  boolean: "#7c3aed",   // purple
  null: "#6b7280",      // gray
  bracket: "#374151",   // dark gray
};

/**
 * Pretty formats JSON with syntax highlighting for browser display
 */
function formatJSONWithColors(obj: any, indent: number = 0): string {
  const indentStr = "  ".repeat(indent);
  const nextIndentStr = "  ".repeat(indent + 1);

  if (obj === null) {
    return `<span style="color: ${JSON_COLORS.null}">null</span>`;
  }

  if (typeof obj === "string") {
    return `<span style="color: ${JSON_COLORS.string}">"${obj}"</span>`;
  }

  if (typeof obj === "number") {
    return `<span style="color: ${JSON_COLORS.number}">${obj}</span>`;
  }

  if (typeof obj === "boolean") {
    return `<span style="color: ${JSON_COLORS.boolean}">${obj}</span>`;
  }

  if (Array.isArray(obj)) {
    if (obj.length === 0) {
      return `<span style="color: ${JSON_COLORS.bracket}">[]</span>`;
    }

    const items = obj.map((item, index) => {
      const formattedItem = formatJSONWithColors(item, indent + 1);
      const comma = index < obj.length - 1 ? "," : "";
      return `${nextIndentStr}${formattedItem}${comma}`;
    }).join('\n');

    return `<span style="color: ${JSON_COLORS.bracket}">[</span>\n${items}\n${indentStr}<span style="color: ${JSON_COLORS.bracket}">]</span>`;
  }

  if (typeof obj === "object") {
    const keys = Object.keys(obj);
    if (keys.length === 0) {
      return `<span style="color: ${JSON_COLORS.bracket}">{}</span>`;
    }

    const items = keys.map((key, index) => {
      const formattedKey = `<span style="color: ${JSON_COLORS.key}">"${key}"</span>`;
      const formattedValue = formatJSONWithColors(obj[key], indent + 1);
      const comma = index < keys.length - 1 ? "," : "";
      return `${nextIndentStr}${formattedKey}: ${formattedValue}${comma}`;
    }).join('\n');

    return `<span style="color: ${JSON_COLORS.bracket}">{</span>\n${items}\n${indentStr}<span style="color: ${JSON_COLORS.bracket}">}</span>`;
  }

  return String(obj);
}

/**
 * Returns appropriate styling for JSON pre elements based on type
 */
function getJsonPreStyles(typeColor: string): string {
  return props.type === 'neutral' 
    ? '' // Neutral mode: no styling at all (no padding, no background, no borders)
    : `background: #f8f9fa; padding: 8px; border-radius: 4px; border-left: 3px solid ${typeColor}`; // Normal mode: full box styling
}

/**
 * Formats a single parameter entry with proper styling
 */
function formatSingleParameter(title: string, value: any, typeColor: string): string {
  if (typeof value === 'string') {
    return `<div style="display: flex; align-items: flex-start; gap: 8px; margin: 0;">
      <div style="font-weight: bold; color: ${typeColor}; font-size: 0.9em; white-space: nowrap;">${title}:</div>
      <div style="font-family: 'Courier New', monospace; color: #2e7d32;">"${value}"</div>
    </div>`;
  } else if (typeof value === 'number') {
    return `<div style="display: flex; align-items: flex-start; gap: 8px; margin: 0;">
      <div style="font-weight: bold; color: ${typeColor}; font-size: 0.9em; white-space: nowrap;">${title}:</div>
      <div style="font-family: 'Courier New', monospace; color: #1976d2;">${value}</div>
    </div>`;
  } else if (typeof value === 'boolean') {
    return `<div style="display: flex; align-items: flex-start; gap: 8px; margin: 0;">
      <div style="font-weight: bold; color: ${typeColor}; font-size: 0.9em; white-space: nowrap;">${title}:</div>
      <div style="font-family: 'Courier New', monospace; color: #7c3aed;">${value}</div>
    </div>`;
  } else {
    // For objects, arrays, etc., format as JSON
    return `<div style="display: flex; align-items: flex-start; gap: 8px; margin: 0;">
      <div style="font-weight: bold; color: ${typeColor}; font-size: 0.9em; white-space: nowrap;">${title} =</div>
      <pre style="flex: 1; margin: 0; font-family: 'Courier New', monospace; ${getJsonPreStyles(typeColor)}; font-size: 0.9em;">${formatJSONWithColors(value)}</pre>
    </div>`;
  }
}

/**
 * Formats data with support for different types and multiple key-value records
 */
function formatData(type: string, data: Record<string, any>): string {
  const typeColor: string = LOG_COLORS[type] ?? LOG_COLORS["info"] ?? "#2563eb";
  
  const entries = Object.entries(data);
  
  if (entries.length === 0) {
    return '';
  } else if (entries.length === 1) {
    // Single parameter - maintain backward compatibility
    const [title, value] = entries[0]!;
    return `<div style="margin: 0;">${formatSingleParameter(title, value, typeColor)}</div>`;
  } else {
    // Multiple parameters - format each individually
    const formattedEntries = entries.map(([title, value]) => formatSingleParameter(title, value, typeColor)).join('');
    return `<div style="margin: 0;">
      ${formattedEntries}
    </div>`;
  }
}

// Computed property that formats the data
const formattedData = computed(() => {
  return formatData(props.type, props.data);
});
</script>

<style scoped>
.parameter-display {
  /* Base styles for the component */
  line-height: 1.4;
}

/* Ensure proper spacing for nested elements */
.parameter-display :deep(div) {
  word-break: break-word;
}

/* Ensure proper font rendering for code elements */
.parameter-display :deep(pre) {
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow-x: auto;
}
</style>
