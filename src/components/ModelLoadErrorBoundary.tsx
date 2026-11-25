import { Component, type ReactNode } from 'react'

type ModelLoadErrorBoundaryProps = {
  children: ReactNode
  fallback: ReactNode
}

type ModelLoadErrorBoundaryState = {
  failed: boolean
}

export class ModelLoadErrorBoundary extends Component<
  ModelLoadErrorBoundaryProps,
  ModelLoadErrorBoundaryState
> {
  state: ModelLoadErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ModelLoadErrorBoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) return this.props.fallback
    return this.props.children
  }
}
