# MindScribble Technical Documentation

## Technologies Used

### Frontend Framework
- **Vue 3.5.22** - Progressive JavaScript framework with Composition API
- **Quasar 2.16.0** - Vue.js framework with Material Design components
- **TypeScript 5.9.2** - Type-safe JavaScript with strict mode enabled
- **Vite 2.1.0** - Fast build tool and development server

### Canvas & Visualization
- **VueFlow 1.48.0** - Node-based editor framework for mindmaps
- **@vue-flow/background 1.3.2** - Grid and dot patterns
- **@vue-flow/controls 1.1.3** - Zoom and pan controls
- **@vue-flow/minimap 1.5.4** - Miniature overview
- **D3.js** - Force-directed graph for master map visualization

### Rich Text Editing
- **Tiptap 3.13.0** - Headless rich text editor
- **@tiptap/extension-placeholder 3.13.0** - Placeholder text
- **@tiptap/pm 3.13.0** - ProseMirror integration
- **@tiptap/starter-kit 3.13.0** - Essential extensions
- **@tiptap/vue-3 3.13.0** - Vue 3 integration

### State Management
- **Pinia 3.0.1** - Intuitive state management for Vue
- **mitt 3.0.1** - Tiny event emitter for cross-component communication

### Backend & APIs
- **Supabase** - Backend-as-a-Service (authentication, database, edge functions)
- **Google Drive API** - File storage and search
- **Google Identity Services** - OAuth authentication
- **Stripe** - Payment processing for subscriptions

### Development Tools
- **ESLint 9.14.0** - Code linting with Vue and TypeScript rules
- **Prettier 3.3.3** - Code formatting
- **@vue/eslint-config-prettier 10.1.0** - ESLint + Prettier integration
- **@vue/eslint-config-typescript 14.4.0** - TypeScript ESLint rules
- **vue-eslint-parser 10.2.0** - Vue SFC parsing
- **vite-plugin-checker 0.11.0** - Type checking in development

### Build & Deployment
- **@quasar/app-vite 2.1.0** - Quasar Vite plugin
- **Autoprefixer 10.4.2** - CSS vendor prefixing
- **work.sh** - Custom bash script for Git workflow management

## Development Setup

### Prerequisites
- **Node.js 20+** (engines: "^20 || ^22 || ^24 || ^26 || ^28")
- **npm 6.13.4+** or **yarn** or **bun**
- **Git** for version control

### Installation
```bash
# Clone repository
git clone <repository-url>
cd mindscribble

# Install dependencies
npm install
# or
bun install

# Start development server
npm run dev
# or
./work.sh dev
```

### Environment Variables
```bash
# .env file (create from .env.example)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id
VITE_GOOGLE_API_KEY=your-google-api-key
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/ai-agent
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

### Development Commands
```bash
# Development
npm run dev              # Start dev server
npm run dev:pwa          # Start PWA dev server
npm run dev:electron     # Start Electron dev server

# Building
npm run build            # Build all targets
npm run build:pwa        # Build PWA
npm run build:electron   # Build Electron

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier

# Testing
npm run test             # Run tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
```

## Technical Constraints

### Performance Targets
- **50 nodes**: 60 FPS smooth performance
- **100 nodes**: 60 FPS acceptable performance
- **500 nodes**: 60 FPS with LOD system
- **Resolution time**: < 16ms (60 FPS)
- **Memory usage**: Stable, no leaks

### Browser Support
- **Chrome 90+**
- **Firefox 88+**
- **Safari 14+**
- **Edge 90+**

### Node.js Version Constraints
- **Minimum**: Node 20
- **Supported**: 20, 22, 24, 26, 28
- **Engine**: Specified in package.json

### Bundle Size Limits
- **Main bundle**: < 2MB (gzipped)
- **Vendor chunks**: Split by feature
- **Lazy loading**: Components loaded on demand

## Dependencies Analysis

### Core Dependencies (Production)
```
@quasar/extras: ^1.16.4          # Material Design icons
@tiptap/*: ^3.13.0               # Rich text editing
@vue-flow/*: ^1.48.0             # Canvas framework
mitt: ^3.0.1                     # Event bus
pinia: ^3.0.1                    # State management
quasar: ^2.16.0                  # UI framework
vue: ^3.5.22                     # Core framework
vue-i18n: ^11.0.0                # Internationalization
vue-router: ^4.0.12              # Routing
```

### Development Dependencies
```
@eslint/*: ^9.14.0               # Linting
@intlify/*: ^4.0.0               # i18n tooling
@quasar/app-vite: ^2.1.0         # Build tool
@types/*: ^0.0.47                # Type definitions
@vue/*: ^10.1.0                  # Vue tooling
autoprefixer: ^10.4.2            # CSS processing
eslint: ^9.14.0                  # Code quality
globals: ^16.4.0                 # Global variables
prettier: ^3.3.3                 # Code formatting
typescript: ^5.9.2               # Type checking
vite-plugin-checker: ^0.11.0     # Dev tooling
vue-eslint-parser: ^10.2.0       # Vue parsing
vue-tsc: ^3.0.7                  # Type checking
```

## Tool Usage Patterns

### Git Workflow (work.sh script)
```bash
# Start new task
./work.sh start "implement-ai-chat"

# Complete task
./work.sh finish "Implemented AI chat component"

# Force merge (for complex merges)
./work.sh finish-force "Fixed merge conflicts"

# Abandon task
./work.sh abandon "new-feature-branch"

# Quick update to main
./work.sh update
```

### Component Creation
```bash
# Create new component
./work.sh component MyComponent

# Create page component
./work.sh component UserProfile page

# Create store
./work.sh component userStore store
```

### Testing Workflow
```bash
# Run all tests
./work.sh test

# Run specific test file
./work.sh test src/components/MyComponent.test.ts

# Run with coverage
./work.sh test:coverage

# Watch mode for development
./work.sh test:watch
```

### Database Operations
```bash
# Generate DBML from schema
./work.sh dbml

# Generate JSON structure
./work.sh dbjson

# Generate markdown documentation
./work.sh dbmd

# Run database inspector
./work.sh db-inspector
```

## Build Configuration

### Quasar Configuration (quasar.config.ts)
```typescript
// Key settings
framework: {
  iconSet: 'material-icons',
  lang: 'en-US',
  config: { dark: 'auto' }
},

build: {
  target: { browser: ['es2019', 'edge88', 'firefox78', 'chrome87', 'safari13.1'] },
  vueRouterMode: 'hash',
  vitePlugins: [['@intlify/vite-plugin-vue-i18n', { include: resolve('src/i18n/**') }]]
},

devServer: {
  port: 9000,
  open: true
}
```

### TypeScript Configuration (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "strict": true,
    "jsx": "preserve",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["quasar/client", "vite/client"]
  }
}
```

### ESLint Configuration (eslint.config.js)
```javascript
export default [
  {
    files: ['**/*.{js,mjs,cjs,vue}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node }
    },
    rules: {
      'prefer-promise-reject-errors': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error'
    }
  }
]
```

## Deployment Strategy

### PWA Deployment
- **Build command**: `npm run build`
- **Output**: `dist/pwa/` directory
- **Hosting**: Static hosting (Netlify, Vercel, etc.)
- **Service Worker**: Auto-generated by Quasar

### Electron Deployment
- **Build command**: `./work.sh electron:publish`
- **Output**: Platform-specific executables
- **Distribution**: GitHub Releases
- **Auto-updater**: Electron Builder integration

### Development vs Production
- **Development**: Hot reload, source maps, debug tools
- **Production**: Minified, tree-shaken, optimized bundles
- **Environment**: Separate env vars for each environment

## Performance Monitoring

### Development Tools
- **Vue DevTools**: Component inspection, state debugging
- **Performance tab**: Frame rate monitoring, memory usage
- **Network tab**: API call monitoring
- **Custom dev tools**: Bounding box visualization, AABB debugging

### Production Monitoring
- **Error tracking**: Sentry integration (planned)
- **Performance monitoring**: Web Vitals tracking (planned)
- **Usage analytics**: Privacy-focused analytics (planned)

## Security Considerations

### API Security
- **Supabase RLS**: Row Level Security enabled
- **Google OAuth**: Secure token handling
- **Rate limiting**: AI operations capped per user/tier
- **Input validation**: All user inputs validated

### Data Privacy
- **No server storage**: All data in user's Google Drive
- **Scoped permissions**: Google Drive access limited to app files
- **Encryption**: Data encrypted in transit and at rest
- **GDPR compliance**: User data export/deletion capabilities

This technical foundation provides a robust, scalable platform for the MindScribble application with modern development practices and performance optimizations.