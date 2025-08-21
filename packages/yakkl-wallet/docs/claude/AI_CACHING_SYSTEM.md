# AI & View Architecture - YAKKL Smart Wallet v2

## Executive Summary
This document outlines the comprehensive architecture for the AI-powered portfolio views and intelligent data management system for YAKKL Smart Wallet v2. The architecture emphasizes local-first AI, privacy preservation, and beautiful user experiences.

## Table of Contents
1. [View-Specific Cache Architecture](#view-specific-cache-architecture)
2. [AI Integration Strategy](#ai-integration-strategy)
3. [UI/UX Innovation](#uiux-innovation)
4. [Implementation Roadmap](#implementation-roadmap)

---

## View-Specific Cache Architecture

### Design Philosophy
- **Flat, denormalized structures** for each view type
- **Independent updates** without cascading calculations
- **Greenfield approach** - no v1 migration needed
- **Optimized for UI performance** over storage efficiency

### Cache Store Structures

#### 1. Account View Store (`account-view.store.ts`)
```typescript
interface AccountViewCache {
  [accountAddress: string]: {
    // Core metrics
    totalValue: BigNumberish;
    totalTokens: number;
    totalTransactions: number;
    
    // Network breakdown
    networks: {
      chainId: number;
      chainName: string;
      value: BigNumberish;
      tokenCount: number;
      nativeBalance: BigNumberish;
    }[];
    
    // Token summary
    tokens: {
      symbol: string;
      totalBalance: string;
      totalValue: BigNumberish;
      networks: number[]; // chainIds where token exists
    }[];
    
    // Recent transactions
    transactions: TransactionDisplay[];
    
    // Metadata
    lastUpdated: Date;
    isPrimary: boolean;
    isWatchOnly: boolean;
    includeInPortfolio: boolean;
  }
}
```

#### 2. Network View Store (`network-view.store.ts`)
```typescript
interface NetworkViewCache {
  [chainId: number]: {
    // Core metrics
    totalValue: BigNumberish;
    totalAccounts: number;
    totalTokens: number;
    
    // Account breakdown
    accounts: {
      address: string;
      name: string;
      value: BigNumberish;
      tokenCount: number;
      type: 'primary' | 'derived' | 'watch';
    }[];
    
    // Token distribution
    tokens: {
      symbol: string;
      address: string;
      totalValue: BigNumberish;
      holdersCount: number; // How many accounts hold this
    }[];
    
    // Network stats
    gasPrice: BigNumberish;
    blockNumber: number;
    transactions: TransactionDisplay[];
    
    // Metadata
    lastUpdated: Date;
    networkName: string;
    nativeToken: string;
  }
}
```

#### 3. Token View Store (`token-view.store.ts`)
```typescript
interface TokenViewCache {
  [tokenSymbol: string]: {
    // Aggregated metrics
    totalValue: BigNumberish;
    totalBalance: string;
    avgPrice: number;
    
    // Holdings breakdown
    holdings: {
      chainId: number;
      chainName: string;
      address: string;
      accountName: string;
      balance: string;
      value: BigNumberish;
      percentage: number; // % of total token holdings
    }[];
    
    // Price data
    priceUSD: number;
    price24hChange: number;
    priceHistory: { timestamp: number; price: number }[];
    
    // Metadata
    tokenAddress?: string; // For non-native tokens
    decimals: number;
    icon?: string;
    lastUpdated: Date;
  }
}
```

#### 4. Watchlist View Store (`watchlist-view.store.ts`)
```typescript
interface WatchlistViewCache {
  // Aggregated metrics
  totalWatched: number;
  portfolioTotal: BigNumberish; // Only includeInPortfolio accounts
  
  // Watched accounts
  accounts: {
    address: string;
    label: string;
    totalValue: BigNumberish;
    includeInPortfolio: boolean;
    
    // Summary across all networks
    networks: number[];
    tokenCount: number;
    lastActivity: Date;
    
    // Optional ENS/labels
    ens?: string;
    tags?: string[];
  }[];
  
  // Metadata
  lastUpdated: Date;
}
```

### View Sync Service

```typescript
// src/lib/services/view-sync.service.ts
export class ViewSyncService {
  private accountViewStore: Writable<AccountViewCache>;
  private networkViewStore: Writable<NetworkViewCache>;
  private tokenViewStore: Writable<TokenViewCache>;
  private watchlistViewStore: Writable<WatchlistViewCache>;
  
  /**
   * Transform wallet cache data into view-specific formats
   */
  async syncFromWalletCache(cache: WalletCacheController): Promise<void> {
    // Run all view updates in parallel
    await Promise.all([
      this.updateAccountView(cache),
      this.updateNetworkView(cache),
      this.updateTokenView(cache),
      this.updateWatchlistView(cache)
    ]);
  }
  
  /**
   * Incremental update for specific entity
   */
  async updateEntity(
    entityType: 'account' | 'network' | 'token',
    entityId: string,
    data: any
  ): Promise<void> {
    // Update only affected views
    switch (entityType) {
      case 'account':
        await this.updateAccountInViews(entityId, data);
        break;
      case 'network':
        await this.updateNetworkInViews(entityId, data);
        break;
      case 'token':
        await this.updateTokenInViews(entityId, data);
        break;
    }
  }
}
```

---

## AI Integration Strategy

### Architecture Overview
- **Local-first approach** with backend fallback
- **Privacy-preserving** at every level
- **Tiered service model** for monetization
- **Hybrid processing** for optimal performance

### Local AI Models (Service Worker)

#### Model Selection
```javascript
// Total size: ~86MB (fits in service worker)
const LOCAL_MODELS = {
  // Embeddings: 22MB
  embedder: 'Xenova/all-MiniLM-L6-v2',
  
  // Classification: 14MB
  classifier: 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  
  // Generation: 50MB (optional, may be too large)
  generator: 'Xenova/flan-t5-small'
};
```

#### Local AI Service
```typescript
// src/contexts/background/services/local-ai.service.ts
export class LocalAIService {
  private embedder: Pipeline;
  private classifier: Pipeline;
  private vectorIndex: AnnoyIndex;
  
  async initialize(): Promise<void> {
    // Load models with quantization
    this.embedder = await pipeline(
      'feature-extraction',
      LOCAL_MODELS.embedder,
      { quantized: true }
    );
    
    // Initialize vector index
    this.vectorIndex = new AnnoyIndex(384); // 384 dimensions
  }
  
  async processQuery(query: string): Promise<LocalAIResponse> {
    // 1. Generate embedding
    const embedding = await this.generateEmbedding(query);
    
    // 2. Search similar vectors
    const similar = await this.vectorIndex.getNNsByVector(
      embedding,
      10, // k nearest neighbors
      -1  // search all trees
    );
    
    // 3. Classify intent
    const intent = await this.classifyIntent(query);
    
    // 4. Generate response (if simple enough)
    if (this.canHandleLocally(intent)) {
      return this.generateLocalResponse(query, similar);
    }
    
    return { requiresBackend: true, partial: similar };
  }
}
```

### Vector-Ready Data Structure

```typescript
// src/lib/types/ai.types.ts
export interface VectorReadyEntity {
  // Identity
  id: string;
  entityType: 'account' | 'token' | 'transaction' | 'network';
  timestamp: number;
  
  // Semantic content (for embedding)
  semantic: {
    description: string;      // Natural language
    tags: string[];           // Categories
    relationships: string[];  // Related entities
    context: string;         // Additional context
  };
  
  // Numerical features (normalized 0-1)
  features: {
    value: number;
    volume: number;
    frequency: number;
    volatility: number;
    performance: number;
    gasEfficiency?: number;
    riskScore?: number;
  };
  
  // Temporal features
  temporal: {
    hour: number;        // 0-23
    dayOfWeek: number;   // 0-6
    month: number;       // 1-12
    quarter: number;     // 1-4
    isWeekend: boolean;
    seasonality?: number;
  };
  
  // Metadata
  metadata: Record<string, any>;
  
  // Embedding (cached)
  embedding?: Float32Array;
}
```

### Backend Integration (Cloudflare Workers)

```typescript
// backend/src/routes/ai.ts
import { Hono } from 'hono';
import { jwt } from 'hono/jwt';

const app = new Hono();

// JWT middleware
app.use('/ai/*', jwt({ secret: process.env.JWT_SECRET }));

// Tiered AI processing
app.post('/ai/query', async (c) => {
  const user = c.get('jwtPayload');
  const { query, context, privacy } = await c.req.json();
  
  // Check user tier
  const tier = await getUserTier(user.userId);
  
  // Process based on tier
  switch (tier) {
    case 'enterprise':
      // GPT-4 or Claude 3
      return processEnterpriseQuery(query, context);
      
    case 'pro':
      // GPT-3.5 or Claude 2
      return processProQuery(query, context);
      
    default:
      // Cached or simple responses
      return processFreeQuery(query);
  }
});

// WebSocket for streaming
app.get('/ai/stream', upgradeWebSocket((c) => ({
  onMessage: async (msg, ws) => {
    const { query, token } = JSON.parse(msg.data);
    
    // Verify JWT and stream response
    if (await verifyJWT(token)) {
      await streamAIResponse(ws, query);
    }
  }
})));
```

### Privacy-Preserving Features

```typescript
// src/lib/services/privacy/anonymizer.ts
export class DataAnonymizer {
  /**
   * Create privacy-preserving vectors
   */
  static anonymize(data: any, privacyLevel: 'full' | 'anonymous' | 'none') {
    switch (privacyLevel) {
      case 'full':
        // Pro users who opted in - send everything
        return data;
        
      case 'anonymous':
        // Default - anonymize sensitive data
        return {
          accounts: data.accounts?.map(a => ({
            hashedAddress: this.hashAddress(a.address),
            valueRange: this.bucketize(a.value),
            tokenCount: a.tokens?.length
          })),
          aggregates: this.computeAggregates(data)
        };
        
      case 'none':
        // Maximum privacy - only query, no context
        return {};
    }
  }
  
  /**
   * Differential privacy for embeddings
   */
  static addNoise(embedding: Float32Array, epsilon = 1.0): Float32Array {
    const sensitivity = 2.0;
    const scale = sensitivity / epsilon;
    
    return embedding.map(v => 
      v + this.laplacian(scale)
    );
  }
}
```

---

## UI/UX Innovation

### Orbital Cards Navigation

```svelte
<!-- src/lib/components/views/OrbitalViewSelector.svelte -->
<script lang="ts">
  import { spring } from 'svelte/motion';
  import { portfolioViews } from '$lib/stores/views';
  
  let rotation = spring(0, { stiffness: 0.1, damping: 0.25 });
  let selectedView = 'accounts';
  
  const views = [
    { id: 'accounts', icon: 'wallet', label: 'Accounts', angle: 0 },
    { id: 'networks', icon: 'network', label: 'Networks', angle: 90 },
    { id: 'tokens', icon: 'coins', label: 'Tokens', angle: 180 },
    { id: 'watchlist', icon: 'eye', label: 'Watching', angle: 270 }
  ];
  
  function selectView(viewId: string) {
    const view = views.find(v => v.id === viewId);
    if (view) {
      rotation.set(-view.angle);
      selectedView = viewId;
    }
  }
</script>

<div class="orbital-container">
  <!-- Central hub -->
  <div class="portfolio-hub">
    <div class="total-value">
      <ProtectedValue value={$portfolioViews.grandTotal} />
    </div>
    <div class="sparkline">
      <MiniChart data={$portfolioViews.history} />
    </div>
  </div>
  
  <!-- Orbiting cards -->
  <div class="orbital-ring" style="transform: rotate({$rotation}deg)">
    {#each views as view (view.id)}
      <div 
        class="view-card {view.id}"
        class:active={selectedView === view.id}
        style="transform: rotate({view.angle}deg) translateX(150px) rotate({-view.angle - $rotation}deg)"
        on:click={() => selectView(view.id)}
      >
        <Icon name={view.icon} />
        <span>{view.label}</span>
        <div class="preview">
          {$portfolioViews[view.id]?.summary}
        </div>
      </div>
    {/each}
  </div>
  
  <!-- Connection lines -->
  <svg class="connections">
    {#if selectedView}
      <line 
        x1="50%" y1="50%"
        x2={getCardPosition(selectedView).x}
        y2={getCardPosition(selectedView).y}
        class="active-connection"
      />
    {/if}
  </svg>
</div>

<style>
  .orbital-container {
    position: relative;
    width: 400px;
    height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .portfolio-hub {
    position: absolute;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    box-shadow: 0 0 40px rgba(var(--primary-rgb), 0.5);
  }
  
  .orbital-ring {
    position: absolute;
    width: 100%;
    height: 100%;
    transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .view-card {
    position: absolute;
    width: 100px;
    height: 100px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
  }
  
  .view-card:hover {
    transform: scale(1.1);
    background: rgba(255, 255, 255, 0.2);
  }
  
  .view-card.active {
    background: linear-gradient(135deg, var(--primary), var(--secondary));
    box-shadow: 0 10px 30px rgba(var(--primary-rgb), 0.3);
  }
</style>
```

### Personalization System

```typescript
// src/lib/stores/personalization.store.ts
export interface PersonalizationPreferences {
  // Layout preferences
  viewOrder: string[];
  favoriteViews: string[];
  hiddenViews: string[];
  defaultView: string;
  
  // Visual preferences
  theme: 'orbital' | 'cards' | 'tiles' | 'minimal';
  animationSpeed: 'fast' | 'normal' | 'slow' | 'off';
  colorScheme: string;
  
  // Smart sorting
  sortMode: 'manual' | 'frequency' | 'recent' | 'value' | 'smart';
  
  // Usage tracking
  usageData: {
    [viewId: string]: {
      accessCount: number;
      totalTime: number;
      lastAccessed: Date;
      timePatterns: number[]; // Hour histogram
    }
  };
}

// Smart sort algorithm
export class SmartSort {
  static calculate(views: View[], prefs: PersonalizationPreferences): View[] {
    const hour = new Date().getHours();
    
    return views.map(view => ({
      ...view,
      score: this.computeScore(view, prefs, hour)
    })).sort((a, b) => b.score - a.score);
  }
  
  private static computeScore(view: View, prefs: PersonalizationPreferences, hour: number): number {
    const usage = prefs.usageData[view.id];
    if (!usage) return 0;
    
    let score = 0;
    
    // Frequency (40%)
    score += (usage.accessCount / 100) * 0.4;
    
    // Recency (30%)
    const hoursSince = (Date.now() - usage.lastAccessed.getTime()) / 3600000;
    score += Math.max(0, 1 - hoursSince / 168) * 0.3;
    
    // Time pattern (20%)
    const timeScore = usage.timePatterns[hour] / Math.max(...usage.timePatterns);
    score += timeScore * 0.2;
    
    // Favorites boost (10%)
    if (prefs.favoriteViews.includes(view.id)) {
      score += 0.1;
    }
    
    return score;
  }
}
```

---

## Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1)
- [ ] Fix idle timeout system using existing IdleManager
- [ ] Create view-specific cache stores
- [ ] Implement view sync service
- [ ] Setup basic view components

### Phase 2: UI/UX Enhancement (Week 2)
- [ ] Build orbital cards navigation
- [ ] Implement personalization system
- [ ] Add gesture support
- [ ] Create view transitions

### Phase 3: AI Integration (Week 3)
- [ ] Setup Transformers.js in service worker
- [ ] Create vector-ready data structures
- [ ] Implement local AI service
- [ ] Add natural language query interface

### Phase 4: Backend Integration (Week 4)
- [ ] Setup Cloudflare Workers endpoints
- [ ] Implement JWT authentication flow
- [ ] Add WebSocket support
- [ ] Configure tiered processing

### Phase 5: Testing & Optimization (Week 5)
- [ ] Performance testing with large datasets
- [ ] Privacy compliance verification
- [ ] UI/UX user testing
- [ ] Security audit

---

## Performance Considerations

### Cache Strategy
- **Hot**: Last 24 hours in memory
- **Warm**: Last 30 days in IndexedDB
- **Cold**: Historical in compressed format

### Vector Index
- Use Annoy or HNSWlib for fast similarity search
- 384 dimensions (all-MiniLM-L6-v2)
- Update index incrementally

### UI Optimization
- Virtual scrolling for large lists
- Debounced updates
- Progressive loading
- Web Workers for heavy computation

---

## Security & Privacy

### Data Protection
- Differential privacy for embeddings
- K-anonymity for metadata
- Client-side encryption for sensitive data
- No PII in vector storage

### Authentication
- JWT for backend API
- Session-based for local features
- Biometric for high-value operations
- Hardware wallet integration

---

## Monitoring & Analytics

### Metrics to Track
- Query response times
- Model inference latency
- Cache hit rates
- User engagement patterns
- Feature adoption rates

### Error Handling
- Graceful degradation
- Offline mode support
- Fallback to cached responses
- User-friendly error messages

---

*Last Updated: 2025-08-12*
*Version: 2.0.0*