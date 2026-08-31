// Registers toHaveTextContent and the rest of the jest-dom matchers, which the form
// tests assert against. Without this they do not exist on `expect`.
import '@testing-library/jest-dom/vitest'
