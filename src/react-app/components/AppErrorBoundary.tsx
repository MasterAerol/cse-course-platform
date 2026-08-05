import { Component, type ErrorInfo, type ReactNode } from 'react'

interface AppErrorBoundaryProps {
  children: ReactNode
}

interface AppErrorBoundaryState {
  failed: boolean
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('React render failure.', {
        message: error.message,
        componentStack: info.componentStack,
      })
    }
  }

  render(): ReactNode {
    if (this.state.failed) {
      return (
        <main className="page-shell">
          <section className="dashboard-card" role="alert">
            <h1>The page could not be displayed</h1>
            <p>Reload the page. If the problem continues, contact support.</p>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}