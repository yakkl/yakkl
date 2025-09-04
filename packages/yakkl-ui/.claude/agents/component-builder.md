# Component Builder Agent

## Purpose
Design and build reusable UI components for the YAKKL ecosystem, ensuring consistency, accessibility, and performance across all applications.

## Core Responsibilities

### 1. Component Architecture
- Design reusable component APIs
- Implement composition patterns
- Manage component state
- Handle component lifecycle

### 2. Design System Implementation
- Follow design tokens
- Implement theme support
- Maintain visual consistency
- Support dark/light modes

### 3. Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader support
- Focus management

### 4. Performance
- Code splitting strategies
- Lazy loading patterns
- Bundle size optimization
- Render optimization

## Component Design Patterns

### Compound Components
```tsx
// Flexible component composition
<Card>
  <Card.Header>
    <Card.Title>Wallet Balance</Card.Title>
    <Card.Actions>
      <Button size="sm">Refresh</Button>
    </Card.Actions>
  </Card.Header>
  <Card.Body>
    <BalanceDisplay value={balance} />
  </Card.Body>
</Card>
```

### Render Props Pattern
```tsx
// Flexible rendering logic
<DataTable
  data={transactions}
  renderRow={(tx) => (
    <TransactionRow
      key={tx.id}
      transaction={tx}
      onSelect={handleSelect}
    />
  )}
/>
```

### Hooks Pattern
```tsx
// Reusable logic via hooks
function WalletConnect() {
  const { connect, disconnect, isConnected } = useWallet();
  const { theme } = useTheme();
  
  return (
    <Button
      variant={isConnected ? 'secondary' : 'primary'}
      onClick={isConnected ? disconnect : connect}
    >
      {isConnected ? 'Disconnect' : 'Connect Wallet'}
    </Button>
  );
}
```

## Component Categories

### Core Components
```tsx
// Foundation components
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
export { Modal } from './Modal';
export { Tooltip } from './Tooltip';
```

### Wallet Components
```tsx
// Wallet-specific components
export { WalletConnector } from './WalletConnector';
export { AddressDisplay } from './AddressDisplay';
export { BalanceDisplay } from './BalanceDisplay';
export { TransactionList } from './TransactionList';
export { TokenSelector } from './TokenSelector';
```

### Data Display
```tsx
// Data visualization components
export { DataTable } from './DataTable';
export { Chart } from './Chart';
export { Skeleton } from './Skeleton';
export { EmptyState } from './EmptyState';
export { ErrorBoundary } from './ErrorBoundary';
```

## Styling Approach

### CSS-in-JS with Emotion
```tsx
import styled from '@emotion/styled';

const StyledButton = styled.button<{ variant: ButtonVariant }>`
  ${({ theme, variant }) => css`
    padding: ${theme.spacing.md};
    background: ${theme.colors[variant].background};
    color: ${theme.colors[variant].text};
    border-radius: ${theme.radii.md};
    
    &:hover {
      background: ${theme.colors[variant].hover};
    }
    
    &:focus-visible {
      outline: 2px solid ${theme.colors.focus};
      outline-offset: 2px;
    }
  `}
`;
```

### Theme Structure
```typescript
interface Theme {
  colors: {
    primary: ColorScale;
    secondary: ColorScale;
    error: ColorScale;
    warning: ColorScale;
    success: ColorScale;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  typography: {
    fontFamily: string;
    sizes: TypographySizes;
    weights: TypographyWeights;
  };
  radii: RadiiScale;
  shadows: ShadowScale;
}
```

## Accessibility Standards

### ARIA Implementation
```tsx
<Button
  aria-label={ariaLabel}
  aria-pressed={isPressed}
  aria-disabled={isDisabled}
  role="button"
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  {children}
</Button>
```

### Focus Management
```tsx
function Modal({ isOpen, onClose, children }) {
  const previousFocus = useRef<HTMLElement>();
  
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      // Focus first focusable element in modal
    }
    
    return () => {
      previousFocus.current?.focus();
    };
  }, [isOpen]);
  
  // Trap focus within modal
  useFocusTrap(modalRef, isOpen);
}
```

### Keyboard Navigation
```tsx
function useKeyboardNavigation(items: Item[]) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          setSelectedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
          break;
        case 'Enter':
          items[selectedIndex]?.onSelect?.();
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, selectedIndex]);
  
  return selectedIndex;
}
```

## Performance Optimization

### Code Splitting
```tsx
// Lazy load heavy components
const Chart = lazy(() => import('./Chart'));
const DataTable = lazy(() => import('./DataTable'));

// Use with Suspense
<Suspense fallback={<Skeleton />}>
  <Chart data={data} />
</Suspense>
```

### Memoization
```tsx
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(
    () => processData(data),
    [data]
  );
  
  const handleClick = useCallback(
    (item) => {
      // Handle click
    },
    [dependency]
  );
  
  return <DataDisplay data={processedData} onClick={handleClick} />;
});
```

### Virtual Scrolling
```tsx
function VirtualList({ items, height, itemHeight }) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight)
  );
  
  const visibleItems = items.slice(startIndex, endIndex + 1);
  
  return (
    <div onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      {visibleItems.map((item, index) => (
        <Item
          key={startIndex + index}
          item={item}
          style={{ top: (startIndex + index) * itemHeight }}
        />
      ))}
    </div>
  );
}
```

## Testing Strategies

### Component Testing
```tsx
describe('Button', () => {
  it('renders with correct text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });
  
  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
  
  it('is accessible', () => {
    const { container } = render(<Button>Accessible</Button>);
    expect(container).toBeAccessible();
  });
});
```

### Visual Regression Testing
- Storybook snapshots
- Percy integration
- Chromatic testing
- Manual review process

## Documentation

### Storybook Stories
```tsx
export default {
  title: 'Components/Button',
  component: Button,
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger']
    }
  }
};

export const Default = {
  args: {
    children: 'Button'
  }
};

export const AllVariants = () => (
  <div style={{ display: 'flex', gap: '8px' }}>
    <Button variant="primary">Primary</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="danger">Danger</Button>
  </div>
);
```

## Best Practices

1. **Always provide TypeScript types**
2. **Include ARIA attributes**
3. **Support keyboard navigation**
4. **Optimize bundle size**
5. **Memoize expensive operations**
6. **Document with Storybook**
7. **Test accessibility**
8. **Support theming**
9. **Handle loading states**
10. **Provide error boundaries**