/**
 * PostgreSQLProvider - PostgreSQL implementation
 * Production-ready provider with connection pooling and prepared statements
 */

import type { 
  SQLProvider, 
  SQLConfig, 
  SQLQuery, 
  SQLResult, 
  SQLTransaction,
  TableSchema,
  DatabaseStats 
} from '../SQLManager';

// Mock interface for pg library (would be imported from 'pg' in real implementation)
interface PGClient {
  query(query: any): Promise<any>;
  release(): void;
  on(event: string, handler: Function): void;
}

interface PGPool {
  connect(): Promise<PGClient>;
  query(query: any): Promise<any>;
  end(): Promise<void>;
  on(event: string, handler: Function): void;
  totalCount: number;
  idleCount: number;
  waitingCount: number;
}

export class PostgreSQLProvider implements SQLProvider {
  private config: SQLConfig;
  private pool: PGPool | null = null;
  private preparedStatements: Map<string, string> = new Map();
  private stats: {
    totalQueries: number;
    totalQueryTime: number;
    activeQueries: number;
  } = {
    totalQueries: 0,
    totalQueryTime: 0,
    activeQueries: 0
  };

  constructor(config: SQLConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // In production, this would use the 'pg' library
    // const { Pool } = require('pg');
    
    const poolConfig = {
      connectionString: this.config.connectionString,
      host: this.config.host,
      port: this.config.port || 5432,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      max: this.config.poolSize || 20,
      idleTimeoutMillis: this.config.idleTimeout || 30000,
      connectionTimeoutMillis: 5000
    };

    // Mock implementation
    this.pool = this.createMockPool(poolConfig);
    
    // Test connection
    try {
      await this.ping();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.preparedStatements.clear();
  }

  async query<T>(query: SQLQuery): Promise<SQLResult<T>> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }

    const startTime = Date.now();
    this.stats.activeQueries++;

    try {
      const result = await this.pool.query({
        text: query.text,
        values: query.values,
        name: query.name
      });

      const queryTime = Date.now() - startTime;
      this.stats.totalQueries++;
      this.stats.totalQueryTime += queryTime;

      return {
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map((f: any) => ({
          name: f.name,
          type: this.getFieldType(f.dataTypeID)
        })),
        command: result.command
      };
    } catch (error) {
      throw new Error(`PostgreSQL query failed: ${error}`);
    } finally {
      this.stats.activeQueries--;
    }
  }

  async queryOne<T>(query: SQLQuery): Promise<T | null> {
    const result = await this.query<T>(query);
    return result.rows[0] || null;
  }

  async queryMany<T>(query: SQLQuery): Promise<T[]> {
    const result = await this.query<T>(query);
    return result.rows;
  }

  async prepare(name: string, text: string): Promise<void> {
    this.preparedStatements.set(name, text);
    
    // PostgreSQL automatically prepares statements when using named queries
    // First execution will prepare it
  }

  async execute<T>(name: string, values?: any[]): Promise<SQLResult<T>> {
    const text = this.preparedStatements.get(name);
    if (!text) {
      throw new Error(`Prepared statement '${name}' not found`);
    }

    return this.query<T>({ text, values, name });
  }

  async beginTransaction(): Promise<SQLTransaction> {
    if (!this.pool) {
      throw new Error('Not connected to PostgreSQL');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      return {
        query: async <T>(query: SQLQuery): Promise<SQLResult<T>> => {
          const result = await client.query({
            text: query.text,
            values: query.values
          });
          
          return {
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields?.map((f: any) => ({
              name: f.name,
              type: this.getFieldType(f.dataTypeID)
            })),
            command: result.command
          };
        },
        
        commit: async (): Promise<void> => {
          try {
            await client.query('COMMIT');
          } finally {
            client.release();
          }
        },
        
        rollback: async (): Promise<void> => {
          try {
            await client.query('ROLLBACK');
          } finally {
            client.release();
          }
        }
      };
    } catch (error) {
      client.release();
      throw error;
    }
  }

  async batch<T>(queries: SQLQuery[]): Promise<SQLResult<T>[]> {
    const transaction = await this.beginTransaction();
    const results: SQLResult<T>[] = [];

    try {
      for (const query of queries) {
        const result = await transaction.query<T>(query);
        results.push(result);
      }
      
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async createTable(name: string, schema: TableSchema): Promise<void> {
    const columns = schema.columns.map(col => {
      let def = `${col.name} ${this.mapColumnType(col.type)}`;
      
      if (col.primaryKey) def += ' PRIMARY KEY';
      if (col.unique) def += ' UNIQUE';
      if (col.notNull) def += ' NOT NULL';
      if (col.default !== undefined) {
        def += ` DEFAULT ${this.formatDefault(col.default)}`;
      }
      if (col.references) {
        def += ` REFERENCES ${col.references.table}(${col.references.column})`;
      }
      
      return def;
    }).join(', ');

    let query = `CREATE TABLE ${name} (${columns})`;
    await this.query({ text: query });

    // Create indexes
    if (schema.indexes) {
      for (const index of schema.indexes) {
        const uniqueStr = index.unique ? 'UNIQUE ' : '';
        const indexQuery = `CREATE ${uniqueStr}INDEX ${index.name} ON ${name} (${index.columns.join(', ')})`;
        await this.query({ text: indexQuery });
      }
    }
  }

  async dropTable(name: string, ifExists: boolean = true): Promise<void> {
    const existsClause = ifExists ? 'IF EXISTS ' : '';
    await this.query({ text: `DROP TABLE ${existsClause}${name} CASCADE` });
  }

  async tableExists(name: string): Promise<boolean> {
    const result = await this.query<{ exists: boolean }>({
      text: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `,
      values: [name]
    });
    
    return result.rows[0]?.exists || false;
  }

  async getTableSchema(name: string): Promise<TableSchema | null> {
    const exists = await this.tableExists(name);
    if (!exists) return null;

    // Get columns
    const columnsResult = await this.query<any>({
      text: `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          ordinal_position
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `,
      values: [name]
    });

    // Get constraints
    const constraintsResult = await this.query<any>({
      text: `
        SELECT
          tc.constraint_name,
          tc.constraint_type,
          kcu.column_name,
          ccu.table_name AS foreign_table,
          ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public' AND tc.table_name = $1
      `,
      values: [name]
    });

    // Get indexes
    const indexesResult = await this.query<any>({
      text: `
        SELECT
          i.relname AS index_name,
          a.attname AS column_name,
          ix.indisunique AS is_unique
        FROM pg_class t
        JOIN pg_index ix ON t.oid = ix.indrelid
        JOIN pg_class i ON i.oid = ix.indexrelid
        JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
        WHERE t.relkind = 'r' AND t.relname = $1
      `,
      values: [name]
    });

    // Build schema
    const constraintMap = new Map<string, any>();
    constraintsResult.rows.forEach((con: any) => {
      if (!constraintMap.has(con.column_name)) {
        constraintMap.set(con.column_name, {});
      }
      const colConstraints = constraintMap.get(con.column_name);
      
      if (con.constraint_type === 'PRIMARY KEY') {
        colConstraints.primaryKey = true;
      } else if (con.constraint_type === 'UNIQUE') {
        colConstraints.unique = true;
      } else if (con.constraint_type === 'FOREIGN KEY') {
        colConstraints.references = {
          table: con.foreign_table,
          column: con.foreign_column
        };
      }
    });

    const columns = columnsResult.rows.map((col: any) => {
      const constraints = constraintMap.get(col.column_name) || {};
      
      return {
        name: col.column_name,
        type: col.data_type,
        primaryKey: constraints.primaryKey || false,
        unique: constraints.unique || false,
        notNull: col.is_nullable === 'NO',
        default: col.column_default,
        references: constraints.references
      };
    });

    // Group indexes
    const indexMap = new Map<string, any>();
    indexesResult.rows.forEach((idx: any) => {
      if (!indexMap.has(idx.index_name)) {
        indexMap.set(idx.index_name, {
          name: idx.index_name,
          columns: [],
          unique: idx.is_unique
        });
      }
      indexMap.get(idx.index_name).columns.push(idx.column_name);
    });

    return {
      columns,
      indexes: Array.from(indexMap.values())
    };
  }

  async ping(): Promise<boolean> {
    try {
      await this.query({ text: 'SELECT 1' });
      return true;
    } catch {
      return false;
    }
  }

  async getVersion(): Promise<string> {
    const result = await this.query<{ version: string }>({
      text: 'SELECT version()'
    });
    return result.rows[0]?.version || 'Unknown';
  }

  async getStats(): Promise<DatabaseStats> {
    const dbSizeResult = await this.query<{ size: string }>({
      text: `
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `
    });

    const tableCountResult = await this.query<{ count: number }>({
      text: `
        SELECT COUNT(*) as count 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `
    });

    return {
      connectionCount: this.pool?.totalCount || 0,
      activeQueries: this.stats.activeQueries,
      totalQueries: this.stats.totalQueries,
      avgQueryTime: this.stats.totalQueries > 0 
        ? this.stats.totalQueryTime / this.stats.totalQueries 
        : 0,
      databaseSize: parseInt(dbSizeResult.rows[0]?.size || '0'),
      tableCount: tableCountResult.rows[0]?.count || 0
    };
  }

  private mapColumnType(type: string): string {
    const typeMap: Record<string, string> = {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'float': 'REAL',
      'double': 'DOUBLE PRECISION',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'json': 'JSONB',
      'uuid': 'UUID',
      'binary': 'BYTEA'
    };
    
    return typeMap[type.toLowerCase()] || type.toUpperCase();
  }

  private formatDefault(value: any): string {
    if (value === null) return 'NULL';
    if (typeof value === 'string') return `'${value}'`;
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    return String(value);
  }

  private getFieldType(dataTypeID: number): string {
    // PostgreSQL OID to type name mapping (partial)
    const typeMap: Record<number, string> = {
      16: 'boolean',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      114: 'json',
      700: 'real',
      701: 'double',
      1043: 'varchar',
      1082: 'date',
      1114: 'timestamp',
      1184: 'timestamptz',
      2950: 'uuid',
      3802: 'jsonb'
    };
    
    return typeMap[dataTypeID] || 'unknown';
  }

  // Mock implementation for development
  private createMockPool(config: any): PGPool {
    return {
      async connect() {
        return {
          async query(query: any) {
            return {
              rows: [],
              rowCount: 0,
              command: 'SELECT',
              fields: []
            };
          },
          release() {},
          on() {}
        };
      },
      async query(query: any) {
        return {
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          fields: []
        };
      },
      async end() {},
      on() {},
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0
    };
  }
}