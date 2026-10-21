// Tipos mínimos para o editor de demonstração.
declare module 'atrament' {
  export const MODE_DRAW: string
  export const MODE_ERASE: string
  export const MODE_DISABLED: string
  export type AtramentPoint = { x: number; y: number }
  export type AtramentSegment = { point: AtramentPoint; time: number; pressure: number }
  export type AtramentStroke = {
    segments: AtramentSegment[]
    mode: string
    color: string
    weight: number
    smoothing: number
    adaptiveStroke: boolean
  }
  export default class Atrament {
    constructor(canvas: HTMLCanvasElement, options?: { width?: number; height?: number; color?: string })
    mode: string
    color: string
    weight: number
    smoothing: number
    adaptiveStroke: boolean
    recordStrokes: boolean
    pressureLow: number
    pressureHigh: number
    clear(): void
    beginStroke(x: number, y: number): void
    draw(x: number, y: number, previousX: number, previousY: number, pressure?: number): { x: number; y: number }
    endStroke(x: number, y: number): void
    addEventListener(event: 'strokerecorded', cb: (payload: { stroke: AtramentStroke }) => void): void
  }
}
