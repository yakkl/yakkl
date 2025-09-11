# UI Component Migration Plan

## Overview
The YAKKL wallet contains 140+ Svelte components. This plan identifies which components should be migrated to `@yakkl/ui` for reuse across the ecosystem.

## Current State

### yakkl-wallet Components
- **Total Components**: 140+ Svelte files
- **Location**: `/src/lib/components/`

### yakkl-ui Existing Components
- AddressDisplay.svelte
- Avatar.svelte
- Button.svelte
- Card.svelte
- ErrorDialog.svelte
- FailureDialog.svelte
- Input.svelte
- Loading.svelte
- LoadingSpinner.svelte
- Modal.svelte
- Toast.svelte
- TokenBalance.svelte
- Tooltip.svelte

## Component Categories

### 🎨 Generic UI Components (Should Move to yakkl-ui)

#### Basic Elements
- [ ] Banner.svelte - Generic banner/alert component
- [ ] Brand.svelte - Brand/logo display
- [ ] ChevronDownIcon.svelte - Reusable icon
- [ ] Disclaimer.svelte - Generic disclaimer
- [ ] ErrorBoundary.svelte - Error handling wrapper
- [ ] Fab.svelte - Floating action button
- [ ] FAQSection.svelte - FAQ display
- [ ] Footer.svelte - Generic footer
- [ ] Header.svelte - Generic header
- [ ] Icon.svelte - Icon wrapper
- [ ] LoadingBar.svelte - Progress indicator
- [ ] Logo.svelte - Logo component
- [ ] NavBar.svelte - Navigation bar
- [ ] NavigationItemModel.svelte - Nav item
- [ ] Notification.svelte - Notification display
- [ ] PageNotFound.svelte - 404 page
- [ ] SearchBar.svelte - Search input
- [ ] SimpleTooltip.svelte - Basic tooltip (manually optimized - handle with care)
- [ ] Spinner.svelte - Loading spinner
- [ ] StatusBadge.svelte - Status indicator
- [ ] TabBar.svelte - Tab navigation
- [ ] Title.svelte - Page/section title

#### Form Components
- [ ] Checkbox.svelte - Checkbox input
- [ ] Dropdown.svelte - Dropdown select
- [ ] FormField.svelte - Form field wrapper
- [ ] InputField.svelte - Text input field
- [ ] RadioButton.svelte - Radio input
- [ ] RangeSlider.svelte - Range slider
- [ ] SearchInput.svelte - Search-specific input
- [ ] SelectField.svelte - Select dropdown
- [ ] TextArea.svelte - Multi-line input
- [ ] Toggle.svelte - Toggle switch

#### Feedback Components
- [ ] Alert.svelte - Alert message
- [ ] ConfirmationModal.svelte - Confirmation dialog
- [ ] ErrorMessage.svelte - Error display
- [ ] SuccessMessage.svelte - Success display
- [ ] WarningMessage.svelte - Warning display

#### Layout Components
- [ ] Container.svelte - Layout container
- [ ] Grid.svelte - Grid layout
- [ ] Panel.svelte - Panel container
- [ ] Sidebar.svelte - Sidebar layout
- [ ] SplitView.svelte - Split pane view

### 🔐 Wallet-Specific Components (Stay in yakkl-wallet)

#### Authentication & Security
- Login.svelte
- Register.svelte
- PincodeCreate.svelte
- PincodeVerify.svelte
- PrivateKeyWarning.svelte
- SecurePhraseBackup.svelte
- SessionWarning.svelte
- EmergencyKit.svelte
- EmergencyKitShamir.svelte

#### Wallet Core Features
- AccountActivity.svelte
- AccountSelector.svelte
- AccountsList.svelte
- AddCustomToken.svelte
- ChainActivity.svelte
- ChainSelector.svelte
- ChainSwitcher.svelte
- ContactForm.svelte
- Contacts.svelte
- ExportPrivateKey.svelte
- ImportPhrase.svelte
- ImportPrivateKey.svelte
- ImportWatchAccount.svelte
- ManageAccounts.svelte
- TokenAmount.svelte
- TokenBalance.svelte
- TokenComponentList.svelte
- TokenItem.svelte
- TokenList.svelte
- TokenPortfolio.svelte
- TransactionConfirmation.svelte
- TransactionDetailModal.svelte
- TransactionForm.svelte
- TransactionsList.svelte
- WalletConnectModal.svelte

#### Wallet UI Features
- BuyModal.svelte
- CoinGeckoPriceData.svelte
- CoinGeckoPriceItem.svelte
- Dashboard.svelte
- DashboardChart.svelte
- GasEstimator.svelte
- GasFeeDisplay.svelte
- NetworkStatus.svelte
- PortfolioOverview.svelte
- PortfolioOverviewSimple.svelte
- PriceChart.svelte
- ReceiveModal.svelte
- SendModal.svelte
- SendModalEnhanced.svelte
- SwapModal.svelte
- SwapModalV2.svelte

#### Pro/Premium Features
- pro/ directory components
- AIHelpButton.svelte
- HealthMonitor.svelte
- KeyManagement.svelte
- TrialCountdown.svelte
- Upgrade.svelte

### 🤔 Context-Dependent (Needs Analysis)

These components could be genericized for yakkl-ui:

- ArticleControls.svelte - Could be generic article management
- Avatar.svelte - Already in yakkl-ui, check for duplication
- BookmarkControls.svelte - Generic bookmarking
- BookmarkedArticles.svelte - Generic bookmarks display
- Copyright.svelte - Generic copyright notice
- FeatureCard.svelte - Generic feature display
- HelpCenter.svelte - Generic help system
- LanguageSelector.svelte - Generic language switcher
- Profile.svelte - Could be generic user profile
- Settings.svelte - Could have generic settings framework
- SoundSettings.svelte - Generic audio settings
- ThemeSwitcher.svelte - Generic theme switcher
- UserMenu.svelte - Generic user menu

## Migration Strategy

### Phase 1: Basic UI Elements (Week 1)
1. **Identify duplicates** - Components already in yakkl-ui
2. **Move generic icons** - All icon components
3. **Move basic inputs** - Form fields, buttons, toggles
4. **Move layout components** - Containers, grids, panels

### Phase 2: Complex Components (Week 2)
1. **Extract generic modals** - Confirmation, error, success
2. **Move navigation** - NavBar, TabBar, Sidebar
3. **Extract feedback components** - Toasts, alerts, notifications
4. **Move display components** - Cards, badges, tooltips

### Phase 3: Refactoring (Week 3)
1. **Remove wallet-specific logic** from migrated components
2. **Create prop interfaces** for customization
3. **Add slot support** for content injection
4. **Implement theming** via CSS variables

## Component Architecture for yakkl-ui

### Directory Structure
```
@yakkl/ui/
├── src/
│   ├── components/
│   │   ├── core/           # Essential components
│   │   │   ├── Button/
│   │   │   ├── Input/
│   │   │   └── Modal/
│   │   ├── layout/         # Layout components
│   │   │   ├── Container/
│   │   │   ├── Grid/
│   │   │   └── Sidebar/
│   │   ├── feedback/       # User feedback
│   │   │   ├── Alert/
│   │   │   ├── Toast/
│   │   │   └── Loading/
│   │   ├── navigation/     # Navigation
│   │   │   ├── NavBar/
│   │   │   ├── TabBar/
│   │   │   └── Breadcrumb/
│   │   └── display/        # Display components
│   │       ├── Card/
│   │       ├── Badge/
│   │       └── Tooltip/
│   ├── styles/
│   │   ├── themes/         # Theme definitions
│   │   ├── utilities/      # Utility classes
│   │   └── variables.css   # CSS variables
│   ├── utils/
│   │   ├── animations/     # Animation utilities
│   │   └── validators/     # Input validators
│   └── index.ts           # Public exports
```

### Component Template
```svelte
<!-- Example: Button.svelte in @yakkl/ui -->
<script lang="ts">
  export let variant: 'primary' | 'secondary' | 'danger' = 'primary';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let disabled = false;
  export let loading = false;
  export let fullWidth = false;
  
  // Allow custom classes
  let className = '';
  export { className as class };
</script>

<button
  class="yakkl-btn yakkl-btn-{variant} yakkl-btn-{size} {className}"
  class:yakkl-btn-full={fullWidth}
  class:yakkl-btn-loading={loading}
  {disabled}
  on:click
  {...$$restProps}
>
  {#if loading}
    <span class="yakkl-btn-spinner" />
  {/if}
  <slot />
</button>

<style>
  /* Use CSS variables for theming */
  .yakkl-btn {
    padding: var(--yakkl-btn-padding);
    border-radius: var(--yakkl-btn-radius);
    font-family: var(--yakkl-font-family);
    transition: var(--yakkl-transition);
  }
  
  .yakkl-btn-primary {
    background: var(--yakkl-color-primary);
    color: var(--yakkl-color-primary-text);
  }
</style>
```

## Testing Requirements

### Unit Tests
- Component rendering
- Prop validation
- Event handling
- Slot content

### Visual Tests
- Theme variations
- Responsive behavior
- Accessibility compliance
- Cross-browser compatibility

### Integration Tests
- Component composition
- Event bubbling
- State management
- Performance benchmarks

## Migration Checklist

### Pre-Migration
- [ ] Audit component dependencies
- [ ] Identify wallet-specific logic
- [ ] Document component APIs
- [ ] Create migration branch

### During Migration
- [ ] Copy component to yakkl-ui
- [ ] Remove wallet dependencies
- [ ] Add to deadcode directory
- [ ] Update imports in wallet
- [ ] Add component tests
- [ ] Update documentation

### Post-Migration
- [ ] Verify wallet functionality
- [ ] Update component stories
- [ ] Add to component library docs
- [ ] Remove from wallet after verification

## Benefits

### For Developers
- **Reusable components** across all YAKKL projects
- **Consistent UI/UX** throughout ecosystem
- **Faster development** with pre-built components
- **Better testing** with isolated components

### For Users
- **Consistent experience** across YAKKL products
- **Faster load times** with shared components
- **Better accessibility** with standardized components
- **Responsive design** built-in

## Risks & Mitigations

### Risk: Breaking wallet functionality
**Mitigation**: Keep originals in deadcode, gradual migration

### Risk: Lost optimizations (e.g., SimpleTooltip)
**Mitigation**: Document optimizations, preserve in migration

### Risk: Increased bundle size
**Mitigation**: Tree-shaking, lazy loading, code splitting

### Risk: Theme conflicts
**Mitigation**: CSS variable namespacing, theme providers

## Success Criteria

1. **No regression** in wallet functionality
2. **Reduced code duplication** by 40%+
3. **Component reuse** in at least 2 other projects
4. **Maintained or improved** performance
5. **100% test coverage** for migrated components

## Next Steps

1. Review and approve component categorization
2. Set up yakkl-ui build pipeline
3. Begin Phase 1 migration
4. Create component documentation
5. Establish visual regression testing