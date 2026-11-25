declare module 'gl' {
  type HeadlessContext = WebGLRenderingContext & {
    getExtension(name: 'STACKGL_destroy_context'): { destroy?: () => void } | null
  }

  function createContext(
    width: number,
    height: number,
    options?: { preserveDrawingBuffer?: boolean },
  ): HeadlessContext

  export default createContext
}
