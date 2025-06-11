/**
 * Common test utilities module
 * 
 * This module contains shared utility classes and functions used across multiple test files.
 */

/**
 * A deterministic pseudo-random number generator using Linear Congruential Generator (LCG).
 * This provides reproducible random sequences for consistent test results.
 */
class StableRandom {
  private seed: number;
  
  constructor(seed: number = 12345) {
    this.seed = seed >>> 0; // Ensure 32-bit unsigned integer
  }
  
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296; // Convert to [0, 1)
  }
  
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

export { StableRandom };
