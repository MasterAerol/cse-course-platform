export interface PublisherCliOptions {
  mode: 'validate-only' | 'dry-run' | 'publish' | null
  target: 'local' | 'remote'
  database: string
  confirmation: string | null
  persistTo: string | null
  help: boolean
}

export function parsePublisherArguments(argv: string[]): PublisherCliOptions
export function runPublisher(argv: string[]): Promise<void>
