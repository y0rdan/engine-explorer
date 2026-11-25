import { Component, type ReactNode } from 'react'

type CanvasErrorBoundaryProps = {
  children: ReactNode
}

type CanvasErrorBoundaryState = {
  failed: boolean
}

export class CanvasErrorBoundary extends Component<
  CanvasErrorBoundaryProps,
  CanvasErrorBoundaryState
> {
  state: CanvasErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): CanvasErrorBoundaryState {
    return { failed: true }
  }

  render() {
    if (this.state.failed) {
      return (
        <p className="canvas-fallback" role="alert">
          This browser could not start the 3D view.
        </p>
      )
    }

    return this.props.children
  }
}
