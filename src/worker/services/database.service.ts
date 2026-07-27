import { runDatabaseProbe } from '../repositories/database.repository'

export interface DatabaseCheck {
  status: 'ok'
  database: 'connected'
}

export async function checkDatabaseConnection(
  database: D1Database,
): Promise<DatabaseCheck> {
  const result = await runDatabaseProbe(database)

  if (result?.value !== 1) {
    throw new Error('The database probe returned an unexpected result.')
  }

  return {
    status: 'ok',
    database: 'connected',
  }
}
