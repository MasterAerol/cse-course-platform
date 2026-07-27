export type RuntimeEnvironment = 'development' | 'production'

export type Bindings = Omit<Cloudflare.Env, 'ENVIRONMENT'> & {
  ENVIRONMENT: RuntimeEnvironment
}
