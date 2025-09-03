/**
 * SQLManager - Unified interface for SQL database operations
 * Supports multiple SQL database providers with consistent API
 */

export interface SQLConfig {
  provider: 'postgres' | 'cloudflare-d1' | 'sqlite' | 'mysql' | 'cockroachdb';
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  ssl?: boolean | { rejectUnauthorized?: boolean };
  poolSize?: number;
  idleTimeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface SQLQuery {
  text: string;
  values?: any[];
  name?: string; // For prepared statements
}

export interface SQLResult<T = any> {
  rows: T[];
  rowCount: number;
  fields?: Array<{ name: string; type: string }>;
  command?: string;
}

export interface SQLTransaction {
  query<T>(query: SQLQuery): Promise<SQLResult<T>>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface SQLProvider {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // Query operations
  query<T>(query: SQLQuery): Promise<SQLResult<T>>;
  queryOne<T>(query: SQLQuery): Promise<T | null>;
  queryMany<T>(query: SQLQuery): Promise<T[]>;
  
  // Prepared statements
  prepare(name: string, text: string): Promise<void>;
  execute<T>(name: string, values?: any[]): Promise<SQLResult<T>>;
  
  // Transactions
  beginTransaction(): Promise<SQLTransaction>;
  
  // Batch operations
  batch<T>(queries: SQLQuery[]): Promise<SQLResult<T>[]>;
  
  // Schema operations
  createTable(name: string, schema: TableSchema): Promise<void>;
  dropTable(name: string, ifExists?: boolean): Promise<void>;
  tableExists(name: string): Promise<boolean>;
  getTableSchema(name: string): Promise<TableSchema | null>;
  
  // Utility
  ping(): Promise<boolean>;
  getVersion(): Promise<string>;
  getStats(): Promise<DatabaseStats>;
}

export interface TableSchema {
  columns: Array<{
    name: string;
    type: string;
    primaryKey?: boolean;
    unique?: boolean;
    notNull?: boolean;
    default?: any;
    references?: { table: string; column: string };
  }>;
  indexes?: Array<{
    name: string;
    columns: string[];
    unique?: boolean;
  }>;
}

export interface DatabaseStats {
  connectionCount: number;
  activeQueries: number;
  totalQueries: number;
  avgQueryTime: number;
  databaseSize?: number;
  tableCount?: number;
}

export class SQLManager {
  private provider: SQLProvider | null = null;
  private config: SQLConfig;
  private isConnected: boolean = false;
  private queryCache: Map<string, { result: any; timestamp: number }> = new Map();
  private cacheTimeout: number = 5000; // 5 seconds default

  constructor(config: SQLConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Dynamically import the appropriate provider
    switch (this.config.provider) {
      case 'postgres':
        const { PostgreSQLProvider } = await import('./providers/PostgreSQLProvider');
        this.provider = new PostgreSQLProvider(this.config);
        break;
        
      case 'cloudflare-d1':
        const { CloudflareD1Provider } = await import('./providers/CloudflareD1Provider');
        this.provider = new CloudflareD1Provider(this.config);
        break;
        
      case 'sqlite':
        const { SQLiteProvider } = await import('./providers/SQLiteProvider');
        this.provider = new SQLiteProvider(this.config);
        break;
        
      case 'mysql':
        const { MySQLProvider } = await import('./providers/MySQLProvider');
        this.provider = new MySQLProvider(this.config);
        break;
        
      case 'cockroachdb':
        const { CockroachDBProvider } = await import('./providers/CockroachDBProvider');
        this.provider = new CockroachDBProvider(this.config);
        break;
        
      default:
        throw new Error(`Unsupported SQL provider: ${this.config.provider}`);
    }

    await this.connect();
  }

  async connect(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized. Call initialize() first.');
    }
    
    await this.provider.connect();
    this.isConnected = true;
  }

  async disconnect(): Promise<void> {
    if (this.provider && this.isConnected) {
      await this.provider.disconnect();
      this.isConnected = false;
    }
  }

  /**
   * Execute a SQL query
   */
  async query<T>(query: SQLQuery, useCache: boolean = false): Promise<SQLResult<T>> {
    this.ensureConnected();
    
    if (useCache) {
      const cacheKey = this.getCacheKey(query);
      const cached = this.queryCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        return cached.result;
      }
    }
    
    const result = await this.provider!.query<T>(query);
    
    if (useCache) {
      const cacheKey = this.getCacheKey(query);
      this.queryCache.set(cacheKey, { result, timestamp: Date.now() });
      
      // Cleanup old cache entries
      if (this.queryCache.size > 100) {
        const entries = Array.from(this.queryCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        entries.slice(0, 50).forEach(([key]) => this.queryCache.delete(key));
      }
    }
    
    return result;
  }

  /**
   * Execute a query expecting a single row result
   */
  async queryOne<T>(query: SQLQuery, useCache: boolean = false): Promise<T | null> {
    this.ensureConnected();
    
    if (useCache) {
      const result = await this.query<T>(query, true);
      return result.rows[0] || null;
    }
    
    return this.provider!.queryOne<T>(query);
  }

  /**
   * Execute a query expecting multiple rows
   */
  async queryMany<T>(query: SQLQuery, useCache: boolean = false): Promise<T[]> {
    this.ensureConnected();
    
    if (useCache) {
      const result = await this.query<T>(query, true);
      return result.rows;
    }
    
    return this.provider!.queryMany<T>(query);
  }

  /**
   * Prepare a statement for repeated execution
   */
  async prepare(name: string, text: string): Promise<void> {
    this.ensureConnected();
    await this.provider!.prepare(name, text);
  }

  /**
   * Execute a prepared statement
   */
  async execute<T>(name: string, values?: any[]): Promise<SQLResult<T>> {
    this.ensureConnected();
    return this.provider!.execute<T>(name, values);
  }

  /**
   * Begin a transaction
   */
  async beginTransaction(): Promise<SQLTransaction> {
    this.ensureConnected();
    return this.provider!.beginTransaction();
  }

  /**
   * Execute multiple queries in a batch
   */
  async batch<T>(queries: SQLQuery[]): Promise<SQLResult<T>[]> {
    this.ensureConnected();
    return this.provider!.batch<T>(queries);
  }

  /**
   * Create a table
   */
  async createTable(name: string, schema: TableSchema): Promise<void> {
    this.ensureConnected();
    await this.provider!.createTable(name, schema);
  }

  /**
   * Drop a table
   */
  async dropTable(name: string, ifExists: boolean = true): Promise<void> {
    this.ensureConnected();
    await this.provider!.dropTable(name, ifExists);
  }

  /**
   * Check if a table exists
   */
  async tableExists(name: string): Promise<boolean> {
    this.ensureConnected();
    return this.provider!.tableExists(name);
  }

  /**
   * Get table schema
   */
  async getTableSchema(name: string): Promise<TableSchema | null> {
    this.ensureConnected();
    return this.provider!.getTableSchema(name);
  }

  /**
   * Test connection
   */
  async ping(): Promise<boolean> {
    this.ensureConnected();
    return this.provider!.ping();
  }

  /**
   * Get database version
   */
  async getVersion(): Promise<string> {
    this.ensureConnected();
    return this.provider!.getVersion();
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<DatabaseStats> {
    this.ensureConnected();
    return this.provider!.getStats();
  }

  /**
   * Execute a parameterized query (safe from SQL injection)
   */
  async safeQuery<T>(text: string, values?: any[]): Promise<SQLResult<T>> {
    return this.query<T>({ text, values });
  }

  /**
   * Insert data into a table
   */
  async insert<T>(
    table: string, 
    data: Record<string, any>, 
    returning?: string[]
  ): Promise<T | null> {
    this.ensureConnected();
    
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    
    let text = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    if (returning && returning.length > 0) {
      text += ` RETURNING ${returning.join(', ')}`;
    }
    
    const result = await this.query<T>({ text, values });
    return result.rows[0] || null;
  }

  /**
   * Update data in a table
   */
  async update<T>(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>,
    returning?: string[]
  ): Promise<T[]> {
    this.ensureConnected();
    
    const setColumns = Object.keys(data);
    const setValues = Object.values(data);
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    
    const setClause = setColumns
      .map((col, i) => `${col} = $${i + 1}`)
      .join(', ');
    
    const whereClause = whereColumns
      .map((col, i) => `${col} = $${setValues.length + i + 1}`)
      .join(' AND ');
    
    let text = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
    
    if (returning && returning.length > 0) {
      text += ` RETURNING ${returning.join(', ')}`;
    }
    
    const result = await this.query<T>({ 
      text, 
      values: [...setValues, ...whereValues] 
    });
    
    return result.rows;
  }

  /**
   * Delete data from a table
   */
  async delete<T>(
    table: string,
    where: Record<string, any>,
    returning?: string[]
  ): Promise<T[]> {
    this.ensureConnected();
    
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    
    const whereClause = whereColumns
      .map((col, i) => `${col} = $${i + 1}`)
      .join(' AND ');
    
    let text = `DELETE FROM ${table} WHERE ${whereClause}`;
    
    if (returning && returning.length > 0) {
      text += ` RETURNING ${returning.join(', ')}`;
    }
    
    const result = await this.query<T>({ text, values: whereValues });
    return result.rows;
  }

  /**
   * Select data from a table with options
   */
  async select<T>(options: {
    table: string;
    columns?: string[];
    where?: Record<string, any>;
    orderBy?: Array<{ column: string; direction?: 'ASC' | 'DESC' }>;
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    this.ensureConnected();
    
    const columns = options.columns?.join(', ') || '*';
    let text = `SELECT ${columns} FROM ${options.table}`;
    const values: any[] = [];
    
    if (options.where && Object.keys(options.where).length > 0) {
      const whereColumns = Object.keys(options.where);
      const whereValues = Object.values(options.where);
      
      const whereClause = whereColumns
        .map((col, i) => `${col} = $${i + 1}`)
        .join(' AND ');
      
      text += ` WHERE ${whereClause}`;
      values.push(...whereValues);
    }
    
    if (options.orderBy && options.orderBy.length > 0) {
      const orderClause = options.orderBy
        .map(({ column, direction }) => `${column} ${direction || 'ASC'}`)
        .join(', ');
      
      text += ` ORDER BY ${orderClause}`;
    }
    
    if (options.limit) {
      text += ` LIMIT ${options.limit}`;
    }
    
    if (options.offset) {
      text += ` OFFSET ${options.offset}`;
    }
    
    const result = await this.query<T>({ text, values });
    return result.rows;
  }

  private ensureConnected(): void {
    if (!this.isConnected || !this.provider) {
      throw new Error('SQL database not connected. Call initialize() first.');
    }
  }

  private getCacheKey(query: SQLQuery): string {
    return `${query.text}:${JSON.stringify(query.values || [])}`;
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Set cache timeout
   */
  setCacheTimeout(ms: number): void {
    this.cacheTimeout = ms;
  }
}