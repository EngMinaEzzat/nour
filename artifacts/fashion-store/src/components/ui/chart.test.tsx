import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ChartContainer } from './chart'

// Mock ResizeObserver for Recharts ResponsiveContainer
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

describe('ChartContainer', () => {
  it('prevents CSS injection in color configs', () => {
    const maliciousConfig = {
      malicious: {
        label: 'Malicious',
        color: 'red; } body { display: none; }',
      },
    }

    const { container } = render(
      <ChartContainer id="test" config={maliciousConfig}>
        <div />
      </ChartContainer>
    )

    const styleTag = container.querySelector('style')
    expect(styleTag).toBeDefined()
    // Semicolon and closing braces are stripped out
    expect(styleTag?.innerHTML).not.toContain('red; }')
    expect(styleTag?.innerHTML).toContain('red  body { display: none ')
  })
})
