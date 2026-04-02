// Jest setup file for Next.js middleware testing
// This file runs before each test suite

// Mock Next.js specific globals if needed
globalThis.next = globalThis.next || {}

// Suppress console warnings during tests
const originalWarn = console.warn
const originalError = console.error

beforeAll(() => {
  console.warn = (...args) => {
    // Uncomment to see warnings during tests
    // originalWarn(...args)
  }
  
  console.error = (...args) => {
    // Uncomment to see errors during tests
    // originalError(...args)
  }
})

afterAll(() => {
  console.warn = originalWarn
  console.error = originalError
})
