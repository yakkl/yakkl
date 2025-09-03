// Browser compatibility shim
if (typeof globalThis === 'undefined') {
  window.globalThis = window;
}

// src/storage/sql/providers/PostgreSQLProvider.ts
var PostgreSQLProvider = class {
  constructor(config) {
    this.pool = null;
    this.preparedStatements = /* @__PURE__ */ new Map();
    this.stats = {
      totalQueries: 0,
      totalQueryTime: 0,
      activeQueries: 0
    };
    this.config = config;
  }
  async connect() {
    const poolConfig = {
      connectionString: this.config.connectionString,
      host: this.config.host,
      port: this.config.port || 5432,
      database: this.config.database,
      user: this.config.username,
      password: this.config.password,
      ssl: this.config.ssl,
      max: this.config.poolSize || 20,
      idleTimeoutMillis: this.config.idleTimeout || 3e4,
      connectionTimeoutMillis: 5e3
    };
    this.pool = this.createMockPool(poolConfig);
    try {
      await this.ping();
    } catch (error) {
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }
  async disconnect() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
    this.preparedStatements.clear();
  }
  async query(query) {
    if (!this.pool) {
      throw new Error("Not connected to PostgreSQL");
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
        fields: result.fields?.map((f) => ({
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
  async queryOne(query) {
    const result = await this.query(query);
    return result.rows[0] || null;
  }
  async queryMany(query) {
    const result = await this.query(query);
    return result.rows;
  }
  async prepare(name, text) {
    this.preparedStatements.set(name, text);
  }
  async execute(name, values) {
    const text = this.preparedStatements.get(name);
    if (!text) {
      throw new Error(`Prepared statement '${name}' not found`);
    }
    return this.query({ text, values, name });
  }
  async beginTransaction() {
    if (!this.pool) {
      throw new Error("Not connected to PostgreSQL");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      return {
        query: async (query) => {
          const result = await client.query({
            text: query.text,
            values: query.values
          });
          return {
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields?.map((f) => ({
              name: f.name,
              type: this.getFieldType(f.dataTypeID)
            })),
            command: result.command
          };
        },
        commit: async () => {
          try {
            await client.query("COMMIT");
          } finally {
            client.release();
          }
        },
        rollback: async () => {
          try {
            await client.query("ROLLBACK");
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
  async batch(queries) {
    const transaction = await this.beginTransaction();
    const results = [];
    try {
      for (const query of queries) {
        const result = await transaction.query(query);
        results.push(result);
      }
      await transaction.commit();
      return results;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
  async createTable(name, schema) {
    const columns = schema.columns.map((col) => {
      let def = `${col.name} ${this.mapColumnType(col.type)}`;
      if (col.primaryKey) def += " PRIMARY KEY";
      if (col.unique) def += " UNIQUE";
      if (col.notNull) def += " NOT NULL";
      if (col.default !== void 0) {
        def += ` DEFAULT ${this.formatDefault(col.default)}`;
      }
      if (col.references) {
        def += ` REFERENCES ${col.references.table}(${col.references.column})`;
      }
      return def;
    }).join(", ");
    let query = `CREATE TABLE ${name} (${columns})`;
    await this.query({ text: query });
    if (schema.indexes) {
      for (const index of schema.indexes) {
        const uniqueStr = index.unique ? "UNIQUE " : "";
        const indexQuery = `CREATE ${uniqueStr}INDEX ${index.name} ON ${name} (${index.columns.join(", ")})`;
        await this.query({ text: indexQuery });
      }
    }
  }
  async dropTable(name, ifExists = true) {
    const existsClause = ifExists ? "IF EXISTS " : "";
    await this.query({ text: `DROP TABLE ${existsClause}${name} CASCADE` });
  }
  async tableExists(name) {
    const result = await this.query({
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
  async getTableSchema(name) {
    const exists = await this.tableExists(name);
    if (!exists) return null;
    const columnsResult = await this.query({
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
    const constraintsResult = await this.query({
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
    const indexesResult = await this.query({
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
    const constraintMap = /* @__PURE__ */ new Map();
    constraintsResult.rows.forEach((con) => {
      if (!constraintMap.has(con.column_name)) {
        constraintMap.set(con.column_name, {});
      }
      const colConstraints = constraintMap.get(con.column_name);
      if (con.constraint_type === "PRIMARY KEY") {
        colConstraints.primaryKey = true;
      } else if (con.constraint_type === "UNIQUE") {
        colConstraints.unique = true;
      } else if (con.constraint_type === "FOREIGN KEY") {
        colConstraints.references = {
          table: con.foreign_table,
          column: con.foreign_column
        };
      }
    });
    const columns = columnsResult.rows.map((col) => {
      const constraints = constraintMap.get(col.column_name) || {};
      return {
        name: col.column_name,
        type: col.data_type,
        primaryKey: constraints.primaryKey || false,
        unique: constraints.unique || false,
        notNull: col.is_nullable === "NO",
        default: col.column_default,
        references: constraints.references
      };
    });
    const indexMap = /* @__PURE__ */ new Map();
    indexesResult.rows.forEach((idx) => {
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
  async ping() {
    try {
      await this.query({ text: "SELECT 1" });
      return true;
    } catch {
      return false;
    }
  }
  async getVersion() {
    const result = await this.query({
      text: "SELECT version()"
    });
    return result.rows[0]?.version || "Unknown";
  }
  async getStats() {
    const dbSizeResult = await this.query({
      text: `
        SELECT pg_size_pretty(pg_database_size(current_database())) as size
      `
    });
    const tableCountResult = await this.query({
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
      avgQueryTime: this.stats.totalQueries > 0 ? this.stats.totalQueryTime / this.stats.totalQueries : 0,
      databaseSize: parseInt(dbSizeResult.rows[0]?.size || "0"),
      tableCount: tableCountResult.rows[0]?.count || 0
    };
  }
  mapColumnType(type) {
    const typeMap = {
      "string": "VARCHAR(255)",
      "text": "TEXT",
      "integer": "INTEGER",
      "bigint": "BIGINT",
      "float": "REAL",
      "double": "DOUBLE PRECISION",
      "boolean": "BOOLEAN",
      "date": "DATE",
      "datetime": "TIMESTAMP",
      "json": "JSONB",
      "uuid": "UUID",
      "binary": "BYTEA"
    };
    return typeMap[type.toLowerCase()] || type.toUpperCase();
  }
  formatDefault(value) {
    if (value === null) return "NULL";
    if (typeof value === "string") return `'${value}'`;
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return String(value);
  }
  getFieldType(dataTypeID) {
    const typeMap = {
      16: "boolean",
      20: "bigint",
      21: "smallint",
      23: "integer",
      25: "text",
      114: "json",
      700: "real",
      701: "double",
      1043: "varchar",
      1082: "date",
      1114: "timestamp",
      1184: "timestamptz",
      2950: "uuid",
      3802: "jsonb"
    };
    return typeMap[dataTypeID] || "unknown";
  }
  // Mock implementation for development
  createMockPool(config) {
    return {
      async connect() {
        return {
          async query(query) {
            return {
              rows: [],
              rowCount: 0,
              command: "SELECT",
              fields: []
            };
          },
          release() {
          },
          on() {
          }
        };
      },
      async query(query) {
        return {
          rows: [],
          rowCount: 0,
          command: "SELECT",
          fields: []
        };
      },
      async end() {
      },
      on() {
      },
      totalCount: 0,
      idleCount: 0,
      waitingCount: 0
    };
  }
};
export {
  PostgreSQLProvider
};
//# sourceMappingURL=PostgreSQLProvider-GICDRQWA.js.map