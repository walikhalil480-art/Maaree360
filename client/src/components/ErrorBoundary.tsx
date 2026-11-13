import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React tree:', error, errorInfo)
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center shadow-xl">
            <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-xl mx-auto mb-4">
              !
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-sm text-slate-400 mb-6">
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/login'
              }}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm transition"
            >
              Return to Login
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
