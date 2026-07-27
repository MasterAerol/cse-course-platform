export interface DatabaseProbe {
  value: number
}

export async function runDatabaseProbe(
  database: D1Database,
): Promise<DatabaseProbe | null> {
  return database
    .prepare('SELECT 1 AS value')
    .first<DatabaseProbe>()
}
