# Comprehensive React/TypeScript Testing Standards for AI Coding Assistants (2025)

## Core Testing Philosophy for AI Agents

**Primary Directive**: Always test user-observable behavior, never implementation details. Focus on what users see, interact with, and experience. Generate tests that provide confidence while remaining maintainable and readable.

**TypeScript-First Approach**: Leverage TypeScript's type system for test safety, better IDE support, and self-documenting test code. Every test should be properly typed to catch errors early and improve maintainability.

**Modern Stack Alignment**: Embrace 2025 standards with Vitest's lightning-fast execution, Storybook 9's enhanced testing capabilities, and MSW 2.0's improved developer experience.

## Testing Framework Integration Patterns

### React Testing Library with TypeScript Best Practices

**Modern User Event Setup (2025 Standard)**

```typescript
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ✅ Always use userEvent.setup() for optimal interactions
test("modern user interaction pattern", async () => {
  const user = userEvent.setup();
  render(<LoginForm />);

  await user.type(screen.getByLabelText(/email/i), "user@example.com");
  await user.click(screen.getByRole("button", { name: /submit/i }));

  await waitFor(() => {
    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });
});
```

**TypeScript-Safe Component Testing**

```typescript
interface ButtonProps {
  variant: "primary" | "secondary";
  size: "sm" | "md" | "lg";
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
}

const renderButton = (props: Partial<ButtonProps> = {}) => {
  const defaultProps: ButtonProps = {
    variant: "primary",
    size: "md",
    children: "Click me",
  };
  return render(<Button {...defaultProps} {...props} />);
};

// Test with proper typing enforcement
test("handles click events with type safety", async () => {
  const handleClick = vi.fn<[MouseEvent<HTMLButtonElement>], void>();
  renderButton({ onClick: handleClick });

  await user.click(screen.getByRole("button"));
  expect(handleClick).toHaveBeenCalledWith(
    expect.objectContaining({ type: "click" })
  );
});
```

### Vitest Configuration for Maximum Performance

**Production-Ready Setup**

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],

    // Performance optimizations
    pool: "threads",
    poolOptions: {
      threads: { maxThreads: 4, minThreads: 1 },
    },

    // Coverage with meaningful thresholds
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
```

### MSW 2.0 Handler Patterns

**Modern API Mocking with TypeScript**

```typescript
// handlers.ts
import { http, HttpResponse } from "msw";

interface User {
  id: string;
  name: string;
  email: string;
}

interface ApiResponse<T> {
  data: T;
  status: "success" | "error";
  message?: string;
}

export const handlers = [
  http.get<never, never, ApiResponse<User[]>>("/api/users", () => {
    return HttpResponse.json({
      data: [
        { id: "1", name: "John Doe", email: "john@example.com" },
        { id: "2", name: "Jane Smith", email: "jane@example.com" },
      ],
      status: "success",
    });
  }),

  // Error scenario handler
  http.get("/api/users/error", () => {
    return HttpResponse.json(
      { status: "error", message: "Internal server error" },
      { status: 500 }
    );
  }),
];
```

## Advanced Testing Strategies

### Performance Testing with Vitest Benchmarks

```typescript
import { bench } from "vitest";

// Component performance benchmarking
bench(
  "large list rendering",
  async () => {
    const { container } = render(
      <DataTable data={generateLargeDataset(1000)} />
    );
    await findByTestId(container, "data-table-rendered");
  },
  { time: 1000, iterations: 10 }
);

// Hook performance testing
bench("useOptimizedSearch performance", () => {
  const { result } = renderHook(() => useOptimizedSearch(largeDataset));
  act(() => {
    result.current.search("complex query");
  });
});
```

### Accessibility Testing Integration

**Comprehensive A11y Test Pattern**

```typescript
import { axe } from "jest-axe";

describe("Accessible Component Tests", () => {
  it("should not have accessibility violations", async () => {
    const { container } = render(<InteractiveComponent />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("supports keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<ModalComponent />);

    // Test focus management
    await user.tab();
    expect(screen.getByRole("dialog")).toHaveFocus();

    // Test escape functionality
    await user.keyboard("{Escape}");
    expect(screen.getByText("Open Modal")).toHaveFocus();
  });
});
```

### Visual Regression Testing with Chromatic

**Storybook Visual Testing Setup**

```typescript
// Button.stories.ts
export const AllVariants: Story = {
  parameters: {
    chromatic: {
      viewports: [320, 768, 1200], // Multi-viewport testing
      delay: 300, // Wait for animations
      modes: {
        "dark-theme": { theme: "dark" },
        "high-contrast": { theme: "high-contrast" },
      },
    },
  },
  render: () => (
    <div className="variant-grid">
      {variants.map((variant) => (
        <Button key={variant} variant={variant}>
          {variant} Button
        </Button>
      ))}
    </div>
  ),
};
```

### Async Testing Patterns and Race Condition Prevention

```typescript
describe("Async Component Tests", () => {
  it("prevents race conditions in rapid requests", async () => {
    const user = userEvent.setup();
    render(<SearchComponent />);

    const searchInput = screen.getByRole("textbox");

    // Simulate rapid typing
    await user.type(searchInput, "john");
    await user.clear(searchInput);
    await user.type(searchInput, "jane");

    // Only latest result should be shown
    await waitFor(() => {
      expect(screen.getByText("Jane Smith")).toBeInTheDocument();
      expect(screen.queryByText("John Doe")).not.toBeInTheDocument();
    });
  });
});
```

## Storybook 9 Advanced Testing Patterns

### Interaction Testing with Play Functions

```typescript
export const ComplexInteraction: Story = {
  args: { onSubmit: fn(), onError: fn() },
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);

    await step("Fill form with validation errors", async () => {
      await userEvent.click(canvas.getByRole("button", { name: /submit/i }));
      await expect(canvas.getByText(/email is required/i)).toBeInTheDocument();
    });

    await step("Complete successful submission", async () => {
      await userEvent.type(canvas.getByLabelText(/email/i), "user@example.com");
      await userEvent.click(canvas.getByRole("button", { name: /submit/i }));

      await expect(args.onSubmit).toHaveBeenCalledWith({
        email: "user@example.com",
      });
    });
  },
};
```

### Component vs Integration vs E2E Testing Boundaries

**Decision Matrix for AI Agents**

| Test Type       | Use When                          | Tools                     | Speed  | Example                                |
| --------------- | --------------------------------- | ------------------------- | ------ | -------------------------------------- |
| **Component**   | Single component logic, UI states | Storybook + Vitest        | Fast   | Button click handlers, form validation |
| **Integration** | Component interactions, data flow | Cypress Component Testing | Medium | Form submission with API calls         |
| **E2E**         | Complete user workflows           | Cypress E2E               | Slow   | Full checkout process                  |

```typescript
// Component Test Example
test("button handles loading state correctly", () => {
  render(<Button loading={true}>Submit</Button>);
  expect(screen.getByRole("button")).toHaveAttribute("aria-busy", "true");
});

// Integration Test Example
cy.mount(<CheckoutForm />);
cy.get('[data-cy="credit-card"]').type("4111111111111111");
cy.get('[data-cy="submit"]').click();
cy.get('[data-cy="success-message"]').should("be.visible");

// E2E Test Example
cy.visit("/checkout");
cy.completeCheckoutFlow(testUser, testPayment);
cy.url().should("include", "/order-confirmation");
```

## Testing Anti-Patterns and Solutions

### Critical Anti-Patterns to Avoid

**❌ Testing Implementation Details**

```typescript
// DON'T: Test internal state
expect(component.instance().state.isVisible).toBe(true);

// ✅ DO: Test user-observable behavior
expect(screen.getByText("Content is visible")).toBeInTheDocument();
```

**❌ Using fireEvent Instead of userEvent**

```typescript
// DON'T: Direct DOM events
fireEvent.change(input, { target: { value: "hello" } });

// ✅ DO: User-like interactions
await userEvent.type(input, "hello");
```

**❌ Arbitrary Waits**

```typescript
// DON'T: Hard-coded delays
await new Promise((resolve) => setTimeout(resolve, 1000));

// ✅ DO: Wait for specific conditions
await waitFor(() => expect(element).toBeVisible());
```

## Optimal Test Structure and Organization

### Project Structure Template

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   └── index.ts
├── hooks/
│   ├── useApi/
│   │   ├── useApi.ts
│   │   ├── useApi.test.ts
│   │   └── index.ts
├── test/
│   ├── setup.ts
│   ├── mocks/handlers.ts
│   └── utils/test-utils.tsx
```

### Test Naming Conventions for AI Generation

```typescript
describe("ComponentName", () => {
  describe("Rendering", () => {
    it("renders with default props", () => {});
    it("renders with custom variants", () => {});
  });

  describe("User Interactions", () => {
    it("handles click events correctly", async () => {});
    it("supports keyboard navigation", async () => {});
  });

  describe("Edge Cases", () => {
    it("handles loading states gracefully", () => {});
    it("displays error states appropriately", () => {});
  });

  describe("Accessibility", () => {
    it("meets WCAG 2.1 standards", async () => {});
    it("provides proper ARIA labels", () => {});
  });
});
```

## CI/CD Integration Patterns

### GitHub Actions Testing Pipeline

```yaml
name: Testing Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run Storybook tests
        run: npm run test-storybook

      - name: Run E2E tests
        uses: cypress-io/github-action@v6
        with:
          start: npm start
          wait-on: "http://localhost:3000"

      - name: Visual regression tests
        run: npx chromatic --project-token=${{ secrets.CHROMATIC_PROJECT_TOKEN }}
```

## AI-Optimized Testing Templates for Continue.dev

### Component Test Generation Template

```typescript
/**
 * AI TEMPLATE: Generate comprehensive component test
 *
 * USAGE: Apply this template when generating tests for React components
 * CONTEXT REQUIRED: Component props interface, expected behaviors, edge cases
 */

describe('[ComponentName] Component', () => {
  // Setup with typed props
  const defaultProps: [ComponentProps] = {
    // Define sensible defaults for required props
  }

  const render[ComponentName] = (props: Partial<[ComponentProps]> = {}) => {
    return render(<[ComponentName] {...defaultProps} {...props} />)
  }

  describe('Rendering', () => {
    it('renders with default props', () => {
      render[ComponentName]()
      expect(screen.getByRole('[expected-role]')).toBeInTheDocument()
    })

    it('applies custom props correctly', () => {
      render[ComponentName]({ customProp: 'value' })
      expect(screen.getByText('value')).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('handles [interaction] correctly', async () => {
      const user = userEvent.setup()
      const mockHandler = vi.fn()
      render[ComponentName]({ on[Event]: mockHandler })

      await user.[interaction](screen.getByRole('[role]'))
      expect(mockHandler).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles [edge-case] gracefully', () => {
      render[ComponentName]({ problematicProp: null })
      expect(screen.getByText('fallback')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('provides proper accessibility attributes', () => {
      render[ComponentName]()
      expect(screen.getByRole('[role]')).toHaveAccessibleName()
    })
  })
})
```

### Custom Hook Testing Template

```typescript
/**
 * AI TEMPLATE: Custom hook testing
 *
 * Use this pattern for testing React hooks with proper TypeScript integration
 */

describe('use[HookName]', () => {
  it('initializes with correct default values', () => {
    const { result } = renderHook(() => use[HookName]())

    expect(result.current.[property]).toBe([expectedValue])
    expectTypeOf(result.current.[method]).toBeFunction()
  })

  it('updates state correctly when [action] occurs', () => {
    const { result } = renderHook(() => use[HookName]())

    act(() => {
      result.current.[method]([argument])
    })

    expect(result.current.[property]).toBe([newValue])
  })

  it('handles edge cases appropriately', () => {
    const { result } = renderHook(() => use[HookName]([problematicInput]))
    expect(result.current.[property]).toBe([fallbackValue])
  })
})
```

### API Integration Testing Template

```typescript
/**
 * AI TEMPLATE: API integration testing
 *
 * Use for components that interact with external APIs
 */

describe('[ComponentName] API Integration', () => {
  beforeEach(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('displays data when API call succeeds', async () => {
    server.use(
      http.get('/api/[endpoint]', () => HttpResponse.json([mockData]))
    )

    render(<[ComponentName] />)
    expect(await screen.findByText('[expected-content]')).toBeInTheDocument()
  })

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/[endpoint]', () => new HttpResponse(null, { status: 500 }))
    )

    render(<[ComponentName] />)
    expect(await screen.findByText(/error/i)).toBeInTheDocument()
  })

  it('shows loading state during API calls', () => {
    server.use(
      http.get('/api/[endpoint]', async () => {
        await delay(1000)
        return HttpResponse.json([mockData])
      })
    )

    render(<[ComponentName] />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})
```

## Error Boundary and Error Scenario Coverage

```typescript
describe("ErrorBoundary", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => consoleSpy.mockClear());
  afterAll(() => consoleSpy.mockRestore());

  it("catches and displays errors appropriately", () => {
    render(
      <ErrorBoundary fallback="Something went wrong">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("provides error recovery mechanisms", async () => {
    const user = userEvent.setup();
    render(
      <RetryableErrorBoundary>
        <BuggyComponent />
      </RetryableErrorBoundary>
    );

    await user.click(screen.getByText("Retry"));
    expect(screen.getByText("Component working")).toBeInTheDocument();
  });
});
```

## Snapshot Testing Guidelines

### When to Use Snapshots

```typescript
// ✅ GOOD: Error messages and data transformations
it("formats error messages correctly", () => {
  const error = validateUserInput(invalidData);
  expect(error).toMatchSnapshot();
});

// ✅ GOOD: Complex data transformations with custom serializers
it("transforms API response correctly", () => {
  const result = transformApiData(mockApiResponse);
  expect(result).toMatchSnapshot();
});
```

### When to Avoid Snapshots

```typescript
// ❌ AVOID: Large DOM snapshots
// Instead of: expect(container).toMatchSnapshot()
expect(screen.getByRole("heading")).toHaveTextContent("Expected Title");
expect(screen.getByRole("button")).toBeEnabled();
```

## Mock Data Management and Organization

```typescript
// factories/user.factory.ts
export const createUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: "user",
  ...overrides,
});

// Test usage with proper isolation
beforeEach(() => {
  // Reset mock data for each test
  resetAllFactories();
});

test("displays user profile correctly", () => {
  const testUser = createUser({ name: "John Doe", role: "admin" });
  render(<UserProfile user={testUser} />);

  expect(screen.getByText("John Doe")).toBeInTheDocument();
  expect(screen.getByText("Admin")).toBeInTheDocument();
});
```

## Custom Testing Utilities and Helpers

```typescript
// test-utils.tsx
interface CustomRenderOptions extends RenderOptions {
  preloadedState?: Partial<RootState>;
  user?: ReturnType<typeof userEvent.setup>;
}

export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  const {
    preloadedState = {},
    user = userEvent.setup(),
    ...renderOptions
  } = options;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>
        <Provider store={setupStore(preloadedState)}>{children}</Provider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  return {
    user,
    ...render(ui, { wrapper, ...renderOptions }),
  };
};

// Usage in tests
test("component with full provider setup", async () => {
  const { user } = renderWithProviders(<MyComponent />, {
    preloadedState: { auth: { user: testUser } },
  });

  await user.click(screen.getByRole("button"));
  expect(screen.getByText("Action completed")).toBeInTheDocument();
});
```

## Test Coverage Strategies and Meaningful Metrics

### Beyond Line Coverage Configuration

```typescript
// vitest.config.ts coverage with meaningful thresholds
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'cobertura'],
  thresholds: {
    global: {
      branches: 80,    // Decision coverage
      functions: 85,   // Function coverage
      lines: 80,      // Line coverage
      statements: 80   // Statement coverage
    }
  },
  exclude: [
    'src/**/*.test.{ts,tsx}',
    'src/**/*.stories.{ts,tsx}',
    'src/test/**/*'
  ]
}
```

### Mutation Testing Integration

```bash
# Install Stryker for mutation testing
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner

# stryker.conf.json
{
  "mutate": ["src/**/*.{ts,tsx}", "!src/**/*.test.{ts,tsx}"],
  "testRunner": "vitest",
  "reporters": ["html", "progress"],
  "thresholds": { "high": 90, "low": 70, "break": 60 }
}
```

## Debugging Strategies for Flaky Tests

### Common Issues and Solutions

```typescript
// ❌ Race condition in async operations
test("flaky async test", async () => {
  render(<AsyncComponent />);
  await waitFor(() => expect(screen.getByText("loaded")).toBeInTheDocument());
  // Race condition: component might still be updating
  fireEvent.click(screen.getByRole("button"));
});

// ✅ Proper async handling
test("reliable async test", async () => {
  const user = userEvent.setup();
  render(<AsyncComponent />);

  // Wait for component to be fully ready
  const button = await screen.findByRole("button", { name: /action/i });
  await user.click(button);

  expect(await screen.findByText("success")).toBeInTheDocument();
});
```

### Test Isolation Patterns

```typescript
beforeEach(() => {
  // Complete state reset
  vi.clearAllMocks();
  cleanup();
  server.resetHandlers();

  // Reset any global state
  resetGlobalStore();

  // Clear any side effects
  document.body.innerHTML = "";
});
```

## Continue.dev System Prompt Optimization

### Core Directives for AI Test Generation

```
TESTING PHILOSOPHY:
- Always test user-observable behavior, never implementation details
- Use semantic queries (getByRole, getByLabelText) over test IDs
- Prioritize async patterns with proper waiting strategies
- Generate TypeScript-safe tests with explicit typing

REQUIRED PATTERNS:
- Use userEvent.setup() for all user interactions
- Include accessibility testing for interactive components
- Mock external dependencies with MSW for API calls
- Structure tests with clear describe blocks: Rendering, Interactions, Edge Cases

ANTI-PATTERNS TO AVOID:
- Never use fireEvent instead of userEvent
- Never test component internal state or props directly
- Never use arbitrary timeouts or delays
- Never create interdependent tests

OUTPUT REQUIREMENTS:
- Complete, runnable test files with proper imports
- TypeScript types for all test data and mocks
- Clear test descriptions explaining expected behavior
- Appropriate cleanup and setup patterns
```

### Decision Tree for Test Type Selection

```
Component Testing Decision Tree for AI:

1. Does component handle user interactions?
   YES → Include userEvent interaction tests
   NO → Focus on rendering and prop tests

2. Does component make API calls?
   YES → Add MSW handlers and async testing patterns
   NO → Skip network-related tests

3. Does component manage complex state?
   YES → Test state transitions and edge cases
   NO → Basic prop validation sufficient

4. Are there accessibility requirements?
   YES → Include a11y tests with axe-core
   NO → Standard semantic testing sufficient

5. Does component handle errors?
   YES → Include error boundary and error state tests
   NO → Focus on happy path scenarios
```

This comprehensive framework provides AI coding assistants with the structure, patterns, and guidelines needed to generate high-quality, maintainable tests for React/TypeScript applications in 2025. The emphasis on TypeScript safety, modern testing patterns, and accessibility ensures that generated tests are both reliable and future-proof.
