# Dockview Theme Integration in MindScribble

## Overview
MindScribble uses Quasar's Dark mode plugin as the single source of truth for theming. All components (Dockview, VueFlow, Outline, Writer) follow Quasar's theme state.

## Implementation Status ✅

### Theme Architecture
- **Theme Controller**: `appStore.isDarkMode` (stored in localStorage)
- **Quasar Integration**: `Dark.set(isDarkMode.value)` adds `.body--dark` class to `<body>`
- **All Components**: Respond to `.body--dark` class for consistent theming

### Components Theme Status

#### ✅ Dockview (Fixed)
- **Light Mode**: Uses `dockview-theme-light`
- **Dark Mode**: Uses `dockview-theme-abyss`
- **Implementation**: Dynamic class binding in `DockviewLayout.vue`
```vue
:class="[appStore.isDarkMode ? 'dockview-theme-abyss' : 'dockview-theme-light', 'parent-dockview']"
```

#### ✅ Outline View (Already Working)
- Uses `.body--dark` selectors for dark mode
- Background and text colors properly switch

#### ✅ Writer View (Fixed)
- **Light Mode**: White background (#ffffff)
- **Dark Mode**: Dark background (#1d1d1d)
- Added `.body--dark` selector for background color

#### ✅ Mindmap View (Fixed)
- **VueFlow Background**: Now respects light/dark mode
- **Custom Nodes**: Already had `.body--dark` selectors
- **Context Menu**: Added dark mode styling
- **Zoom Indicator**: Added dark mode styling

## CSS Variables

### Global Theme Variables (app.scss)
```scss
:root {
  // VueFlow
  --vf-background-color: #ffffff;
  --vf-background-pattern-color: #e0e0e0;

  // MindScribble custom
  --ms-bg-primary: #ffffff;
  --ms-text-primary: #1d1d1d;
  --ms-border-color: rgba(0, 0, 0, 0.12);
}

.body--dark {
  // VueFlow
  --vf-background-color: #1a202c;
  --vf-background-pattern-color: #2d3748;

  // MindScribble custom
  --ms-bg-primary: #1d1d1d;
  --ms-text-primary: #e2e8f0;
  --ms-border-color: rgba(255, 255, 255, 0.12);
}
```

## Dockview Theme Reference

### Available Built-in Themes
- `dockview-theme-light` - Light theme
- `dockview-theme-abyss` - Dark theme (VS Code Abyss)
- `dockview-theme-vs` - Visual Studio theme
- `dockview-theme-dracula` - Dracula theme
- `dockview-theme-replit` - Replit theme

### Usage in Vue
```vue
<DockviewVue :class="isDark ? 'dockview-theme-abyss' : 'dockview-theme-light'" />
```

## Dockview CSS Variables

### Key Variables for Customization
```scss
--dv-background-color                              // Main background
--dv-group-view-background-color                   // Panel content background
--dv-tabs-and-actions-container-background-color   // Tab bar background
--dv-activegroup-visiblepanel-tab-background-color // Active tab background
--dv-inactivegroup-visiblepanel-tab-background-color // Inactive tab background
--dv-activegroup-visiblepanel-tab-color            // Active tab text color
--dv-inactivegroup-visiblepanel-tab-color          // Inactive tab text color
--dv-separator-border                              // Border between panels
--dv-icon-hover-background-color                   // Icon hover state
```

### Extending Themes
You can extend existing themes with custom CSS:

```scss
.dockview-theme-abyss {
  .groupview {
    &.active-group {
      > .tabs-and-actions-container {
        border-bottom: 2px solid var(--dv-activegroup-visiblepanel-tab-background-color);
      }
    }
  }
}
```

## Testing Theme Switching

### Manual Testing Checklist
1. Toggle dark mode using the button in the sidebar
2. Verify each component:
   - ✅ **Dockview**: Tabs and panels change color
   - ✅ **Outline View**: Background and text colors switch
   - ✅ **Mindmap View**: Canvas background, nodes, and UI elements switch
   - ✅ **Writer View**: Background color switches
3. Check UI elements:
   - Context menus
   - Zoom indicators
   - Tooltips
   - Borders and separators

### Expected Behavior
- **Light Mode**: White/light gray backgrounds, dark text
- **Dark Mode**: Dark backgrounds (#1d1d1d, #2d3748), light text (#e2e8f0)
- **Transition**: Instant (no animation needed for theme switching)

## Troubleshooting

### Issue: Component not switching themes
**Solution**: Ensure component uses `.body--dark` selector:
```scss
.my-component {
  background: white;

  .body--dark & {
    background: #1d1d1d;
  }
}
```

### Issue: VueFlow background stays dark in light mode
**Solution**: Check CSS variables are defined in `:root` and `.body--dark`:
```scss
:root {
  --vf-background-color: #ffffff;
}
.body--dark {
  --vf-background-color: #1a202c;
}
```

### Issue: Dockview not changing theme
**Solution**: Verify dynamic class binding in template:
```vue
:class="[appStore.isDarkMode ? 'dockview-theme-abyss' : 'dockview-theme-light']"
```