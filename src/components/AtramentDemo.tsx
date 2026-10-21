import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import Atrament, { MODE_DISABLED, MODE_DRAW, MODE_ERASE, type AtramentStroke } from 'atrament'
import {
  Brush, Circle, Download, Eraser, Expand, Hand, MoveUpRight, MousePointer2,
  Pencil, RotateCcw, RotateCw, Slash, Square, Trash2, Triangle, X
} from 'lucide-react'
import { COLORS, downloadBlob, imageFromSource, type Photo } from '../types'
import { ToolButton, ToolDivider } from './Toolbar'

type ShapeKind = 'line' | 'arrow' | 'rectangle' | 'ellipse' | 'triangle'
type Tool = 'draw' | 'erase' | 'select' | ShapeKind
type Point = { x: number; y: number }
type Shape = {
  id: string
  kind: ShapeKind
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  weight: number
}
type StoredStroke = AtramentStroke & { recordedWidth: number; recordedHeight: number }
type Snapshot = { strokes: StoredStroke[]; shapes: Shape[] }
type Handle = 'nw' | 'ne' | 'sw' | 'se'
type Gesture =
  | { type: 'create'; id: number; start: Point; original: Shape }
  | { type: 'move'; id: number; start: Point; original: Shape; before: Snapshot; changed: boolean }
  | { type: 'resize'; id: number; start: Point; original: Shape; handle: Handle; before: Snapshot; changed: boolean }

const SHAPE_TOOLS: { tool: ShapeKind; label: string; Icon: typeof Circle }[] = [
  {tool: 'ellipse', label: 'Círculo / elipse', Icon: Circle},
  {tool: 'rectangle', label: 'Retângulo', Icon: Square},
  {tool: 'line', label: 'Linha', Icon: Slash},
  {tool: 'arrow', label: 'Seta', Icon: MoveUpRight},
  {tool: 'triangle', label: 'Triângulo', Icon: Triangle}
]

function clamp(value: number, min: number, max: number) { return Math.max(min, Math.min(max, value)) }
function isShape(tool: Tool): tool is ShapeKind { return ['line','arrow','rectangle','ellipse','triangle'].includes(tool) }
function copySnapshot(snapshot: Snapshot): Snapshot { return {strokes: [...snapshot.strokes], shapes: snapshot.shapes.map(shape => ({...shape}))} }
function bounds(shape: Shape) { return {minX:Math.min(shape.x1,shape.x2), minY:Math.min(shape.y1,shape.y2), maxX:Math.max(shape.x1,shape.x2), maxY:Math.max(shape.y1,shape.y2)} }
function shapePoints(shape: Shape): string {
  const b = bounds(shape)
  return `${(b.minX+b.maxX)/2},${b.minY} ${b.maxX},${b.maxY} ${b.minX},${b.maxY}`
}
function arrowHead(shape: Shape, relativeLength: number): Point[] {
  const dx = shape.x2 - shape.x1
  const dy = shape.y2 - shape.y1
  const angle = Math.atan2(dy, dx)
  const length = Math.min(relativeLength, Math.max(7, Math.hypot(dx,dy)*.36))
  const halfAngle = .50
  return [
    {x:shape.x2,y:shape.y2},
    {x:shape.x2 - length*Math.cos(angle-halfAngle),y:shape.y2 - length*Math.sin(angle-halfAngle)},
    {x:shape.x2 - length*Math.cos(angle+halfAngle),y:shape.y2 - length*Math.sin(angle+halfAngle)}
  ]
}

function ShapeMark({shape, interactive, onPointerDown, scale}: {
  shape:Shape; interactive:boolean; onPointerDown?:(event:ReactPointerEvent<SVGGElement>)=>void; scale:number
}) {
  const b = bounds(shape)
  const shared = {stroke:shape.color,strokeWidth:shape.weight,fill:'none' as const,vectorEffect:'non-scaling-stroke' as const,strokeLinecap:'round' as const,strokeLinejoin:'round' as const}
  const hit = {stroke:'transparent',strokeWidth:Math.max(24,shape.weight+14),fill:'none' as const,vectorEffect:'non-scaling-stroke' as const}
  return (
    <g onPointerDown={interactive ? onPointerDown : undefined} style={{cursor:interactive?'move':'crosshair'}}>
      {shape.kind === 'line' || shape.kind === 'arrow' ? <>
        <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...shared} pointerEvents="none" />
        {shape.kind === 'arrow' && <polygon points={arrowHead(shape,Math.max(15*scale,shape.weight*4*scale)).map(p=>`${p.x},${p.y}`).join(' ')} fill={shape.color} pointerEvents="none"/>}
        {interactive && <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} {...hit} pointerEvents="stroke" />}
      </> : shape.kind === 'rectangle' ? <>
        <rect x={b.minX} y={b.minY} width={b.maxX-b.minX} height={b.maxY-b.minY} {...shared} pointerEvents="none" />
        {interactive && <rect x={b.minX} y={b.minY} width={b.maxX-b.minX} height={b.maxY-b.minY} fill="transparent" stroke="transparent" strokeWidth={Math.max(10,shape.weight)} pointerEvents="all"/>}
      </> : shape.kind === 'ellipse' ? <>
        <ellipse cx={(b.minX+b.maxX)/2} cy={(b.minY+b.maxY)/2} rx={(b.maxX-b.minX)/2} ry={(b.maxY-b.minY)/2} {...shared} pointerEvents="none"/>
        {interactive && <ellipse cx={(b.minX+b.maxX)/2} cy={(b.minY+b.maxY)/2} rx={(b.maxX-b.minX)/2} ry={(b.maxY-b.minY)/2} fill="transparent" stroke="transparent" strokeWidth="10" pointerEvents="all"/>}
      </> : <>
        <polygon points={shapePoints(shape)} {...shared} pointerEvents="none" />
        {interactive && <polygon points={shapePoints(shape)} fill="transparent" stroke="transparent" strokeWidth="10" pointerEvents="all"/>}
      </>}
    </g>
  )
}

function drawExportShape(ctx:CanvasRenderingContext2D, shape:Shape, scale:number) {
  const b = bounds(shape)
  ctx.save()
  ctx.strokeStyle = shape.color
  ctx.fillStyle = shape.color
  ctx.lineWidth = shape.weight * scale
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (shape.kind === 'line' || shape.kind === 'arrow') {
    ctx.moveTo(shape.x1,shape.y1)
    ctx.lineTo(shape.x2,shape.y2)
    ctx.stroke()
    if (shape.kind === 'arrow') {
      const h = arrowHead(shape,Math.max(15*scale,shape.weight*4*scale))
      ctx.beginPath();ctx.moveTo(h[0].x,h[0].y);ctx.lineTo(h[1].x,h[1].y);ctx.lineTo(h[2].x,h[2].y);ctx.closePath();ctx.fill()
    }
  } else if (shape.kind === 'rectangle') {
    ctx.strokeRect(b.minX,b.minY,b.maxX-b.minX,b.maxY-b.minY)
  } else if (shape.kind === 'ellipse') {
    ctx.ellipse((b.minX+b.maxX)/2,(b.minY+b.maxY)/2,Math.max(.1,(b.maxX-b.minX)/2),Math.max(.1,(b.maxY-b.minY)/2),0,0,Math.PI*2)
    ctx.stroke()
  } else {
    ctx.moveTo((b.minX+b.maxX)/2,b.minY)
    ctx.lineTo(b.maxX,b.maxY)
    ctx.lineTo(b.minX,b.maxY)
    ctx.closePath();ctx.stroke()
  }
  ctx.restore()
}

export function AtramentDemo({photo}:{photo:Photo}) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const penRef = useRef<Atrament | null>(null)
  const strokesRef = useRef<StoredStroke[]>([])
  const shapesRef = useRef<Shape[]>([])
  const undoRef = useRef<Snapshot[]>([])
  const redoRef = useRef<Snapshot[]>([])
  const gestureRef = useRef<Gesture | null>(null)
  const replayRef = useRef(false)
  const toolRef = useRef<Tool>('draw')
  const currentOptsRef = useRef({color:COLORS[0] as string,size:3,tool:'draw' as Tool})
  const [shapes,setShapes] = useState<Shape[]>([])
  const [draft,setDraft] = useState<Shape|null>(null)
  const [dim,setDim] = useState({w:0,h:0})
  const [tool,setTool] = useState<Tool>('draw')
  const [color,setColor] = useState<string>(COLORS[0])
  const [size,setSize] = useState(3)
  const [penOnly,setPenOnly] = useState(false)
  const [selectedId,setSelectedId] = useState<string|null>(null)
  const [revision,setRevision] = useState(0)
  const [notice,setNotice] = useState('')
  const [fullscreen,setFullscreen] = useState(false)
  toolRef.current = tool
  currentOptsRef.current = {color,size,tool}

  const setShapeList = (list:Shape[]) => { shapesRef.current=list;setShapes(list) }
  const snapshot = ():Snapshot => copySnapshot({strokes:strokesRef.current,shapes:shapesRef.current})
  const checkpoint = (state?:Snapshot) => {undoRef.current.push(state ? copySnapshot(state) : snapshot()); if(undoRef.current.length>80) undoRef.current.shift();redoRef.current=[];setRevision(v=>v+1)}

  useEffect(() => {
    const element = surfaceRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const maxW = entry.contentRect.width - 24
      const maxH = entry.contentRect.height - 24
      if (maxW <= 0 || maxH <= 0) return
      const scale = Math.min(maxW/photo.width,maxH/photo.height)
      const w = Math.max(1,Math.floor(photo.width*scale))
      const h = Math.max(1,Math.floor(photo.height*scale))
      setDim(current => current.w===w&&current.h===h ? current : {w,h})
    })
    observer.observe(element)
    return () => observer.disconnect()
  },[photo.width,photo.height])

  const replay = useCallback(() => {
    const pen = penRef.current
    if (!pen || !dim.w || !dim.h) return
    replayRef.current=true
    try {
      pen.clear()
      for(const stroke of strokesRef.current){
        if(!stroke.segments.length) continue
        pen.mode=stroke.mode || MODE_DRAW
        pen.color=stroke.color
        pen.weight=stroke.weight
        pen.smoothing=stroke.smoothing
        pen.adaptiveStroke=stroke.adaptiveStroke
        const sx=dim.w/stroke.recordedWidth
        const sy=dim.h/stroke.recordedHeight
        const segments=stroke.segments
        let previous={x:segments[0].point.x*sx,y:segments[0].point.y*sy}
        pen.beginStroke(previous.x,previous.y)
        for(const seg of segments.slice(1)){
          previous=pen.draw(seg.point.x*sx,seg.point.y*sy,previous.x,previous.y,seg.pressure)
        }
        pen.endStroke(previous.x,previous.y)
      }
    } finally {
      replayRef.current=false
      const opts=currentOptsRef.current
      pen.mode=opts.tool==='draw'?MODE_DRAW:opts.tool==='erase'?MODE_ERASE:MODE_DISABLED
      pen.color=opts.color
      pen.weight=opts.size
      pen.smoothing=.85
      pen.adaptiveStroke=false
    }
  },[dim.w,dim.h])

  useEffect(() => {
    const canvas=canvasRef.current
    if(!canvas||!dim.w||!dim.h) return
    const pen=new Atrament(canvas,{width:dim.w,height:dim.h,color:currentOptsRef.current.color})
    pen.recordStrokes=true
    pen.smoothing=.85
    pen.adaptiveStroke=false
    pen.pressureLow=.3
    pen.pressureHigh=1.7
    penRef.current=pen
    pen.addEventListener('strokerecorded',({stroke})=>{
      if(replayRef.current||!stroke.segments.length) return
      checkpoint()
      strokesRef.current=[...strokesRef.current,{...stroke,recordedWidth:dim.w,recordedHeight:dim.h}]
      setRevision(v=>v+1)
    })
    replay()
    return () => {if(penRef.current===pen)penRef.current=null}
    // `checkpoint` deliberately works with refs and is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[dim.w,dim.h,replay])

  useEffect(()=>{
    const pen=penRef.current
    if(pen){pen.mode=tool==='draw'?MODE_DRAW:tool==='erase'?MODE_ERASE:MODE_DISABLED;pen.color=color;pen.weight=size}
  },[tool,color,size,dim])

  useEffect(()=>{
    strokesRef.current=[];setShapeList([])
    undoRef.current=[];redoRef.current=[];gestureRef.current=null
    setDraft(null);setSelectedId(null);penRef.current?.clear();setRevision(v=>v+1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[photo.src,photo.revision])

  useEffect(()=>{
    const onKey=(event:KeyboardEvent)=>{
      if(event.key==='Escape')setSelectedId(null)
      if((event.key==='Delete'||event.key==='Backspace') && selectedId && !(event.target instanceof HTMLInputElement)){
        event.preventDefault();deleteSelected()
      }
    }
    window.addEventListener('keydown',onKey)
    return ()=>window.removeEventListener('keydown',onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[selectedId])

  useEffect(()=>{
    const handle=()=>setFullscreen(document.fullscreenElement===bodyRef.current)
    document.addEventListener('fullscreenchange',handle)
    return()=>document.removeEventListener('fullscreenchange',handle)
  },[])

  const loadSnapshot=(state:Snapshot)=>{
    strokesRef.current=[...state.strokes]
    setShapeList(state.shapes.map(shape=>({...shape})))
    setSelectedId(id=>id&&state.shapes.some(shape=>shape.id===id)?id:null)
    replay();setRevision(v=>v+1)
  }
  const undo=()=>{
    const previous=undoRef.current.pop();if(!previous)return
    redoRef.current.push(snapshot());loadSnapshot(previous)
  }
  const redo=()=>{
    const next=redoRef.current.pop();if(!next)return
    undoRef.current.push(snapshot());loadSnapshot(next)
  }
  const clear=()=>{
    if(!strokesRef.current.length&&!shapesRef.current.length)return
    checkpoint();strokesRef.current=[];setShapeList([]);setSelectedId(null)
    penRef.current?.clear();setRevision(v=>v+1)
  }
  const deleteSelected=()=>{
    if(!selectedId||!shapesRef.current.some(s=>s.id===selectedId))return
    checkpoint();setShapeList(shapesRef.current.filter(s=>s.id!==selectedId));setSelectedId(null)
  }
  const recolor=(newColor:string)=>{
    setColor(newColor)
    if(tool==='select'&&selectedId){
      const previous=shapesRef.current.find(s=>s.id===selectedId)
      if(previous && previous.color!==newColor){checkpoint();setShapeList(shapesRef.current.map(s=>s.id===selectedId?{...s,color:newColor}:s))}
    }
  }
  const resizeWeight=(newSize:number)=>{
    setSize(newSize)
    if(tool==='select'&&selectedId){
      const previous=shapesRef.current.find(s=>s.id===selectedId)
      if(previous && previous.weight!==newSize){checkpoint();setShapeList(shapesRef.current.map(s=>s.id===selectedId?{...s,weight:newSize}:s))}
    }
  }
  const switchTool=(newTool:Tool)=>{
    setTool(newTool)
    if(newTool!=='select')setSelectedId(null)
    setDraft(null)
  }
  const at=(event:ReactPointerEvent<SVGElement>):Point=>{
    const rect=svgRef.current!.getBoundingClientRect()
    return {x:clamp((event.clientX-rect.left)/rect.width*photo.width,0,photo.width),y:clamp((event.clientY-rect.top)/rect.height*photo.height,0,photo.height)}
  }
  const allowed=(event:ReactPointerEvent)=>!penOnly||event.pointerType==='pen'
  const startCapture=(id:number)=>{try{svgRef.current?.setPointerCapture(id)}catch{/* unsupported */}}

  const onSvgDown=(event:ReactPointerEvent<SVGSVGElement>)=>{
    if(!allowed(event))return
    if(event.button!==0 && event.pointerType==='mouse')return
    if(gestureRef.current)return
    if(tool==='select'){setSelectedId(null);return}
    if(!isShape(tool))return
    event.preventDefault()
    const start=at(event)
    const shape:Shape={id:`shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`,kind:tool,x1:start.x,y1:start.y,x2:start.x,y2:start.y,color,weight:size}
    gestureRef.current={type:'create',id:event.pointerId,start,original:shape}
    setDraft(shape)
    startCapture(event.pointerId)
  }
  const beginSelect=(event:ReactPointerEvent<SVGGElement>,shape:Shape)=>{
    if(tool!=='select'||!allowed(event))return
    event.preventDefault();event.stopPropagation()
    if(event.button!==0 && event.pointerType==='mouse')return
    if(gestureRef.current)return
    setSelectedId(shape.id)
    setColor(shape.color);setSize(shape.weight)
    gestureRef.current={type:'move',id:event.pointerId,start:at(event),original:shape,before:snapshot(),changed:false}
    startCapture(event.pointerId)
  }
  const beginResize=(event:ReactPointerEvent<SVGCircleElement>, shape:Shape,handle:Handle)=>{
    if(tool!=='select'||!allowed(event))return
    event.preventDefault();event.stopPropagation()
    if(gestureRef.current)return
    gestureRef.current={type:'resize',id:event.pointerId,start:at(event),original:shape,handle,before:snapshot(),changed:false}
    startCapture(event.pointerId)
  }
  const onSvgMove=(event:ReactPointerEvent<SVGSVGElement>)=>{
    const action=gestureRef.current
    if(!action||action.id!==event.pointerId)return
    event.preventDefault()
    const end=at(event)
    if(action.type==='create'){
      setDraft({...action.original,x2:end.x,y2:end.y});return
    }
    const dx=end.x-action.start.x,dy=end.y-action.start.y
    if(Math.abs(dx)+Math.abs(dy)<.2)return
    action.changed=true
    let result:Shape
    if(action.type==='move'){
      const box=bounds(action.original)
      const moveX=clamp(dx,-box.minX,photo.width-box.maxX)
      const moveY=clamp(dy,-box.minY,photo.height-box.maxY)
      result={...action.original,x1:action.original.x1+moveX,x2:action.original.x2+moveX,y1:action.original.y1+moveY,y2:action.original.y2+moveY}
    }else{
      result={...action.original}
      if(action.handle==='nw'||action.handle==='sw')result.x1=clamp(action.original.x1+dx,0,photo.width)
      else result.x2=clamp(action.original.x2+dx,0,photo.width)
      if(action.handle==='nw'||action.handle==='ne')result.y1=clamp(action.original.y1+dy,0,photo.height)
      else result.y2=clamp(action.original.y2+dy,0,photo.height)
    }
    setShapeList(shapesRef.current.map(shape=>shape.id===result.id?result:shape))
  }
  const onSvgUp=(event:ReactPointerEvent<SVGSVGElement>)=>{
    const action=gestureRef.current
    if(!action||action.id!==event.pointerId)return
    event.preventDefault()
    if(action.type==='create'){
      const end=at(event)
      const tap=Math.hypot(end.x-action.start.x,end.y-action.start.y)<photo.width*.012
      const width=photo.width*.16, height=photo.height*.11
      const newShape:Shape={...action.original,
        x2:tap?clamp(action.start.x+width,0,photo.width):end.x,
        y2:tap?clamp(action.start.y+height,0,photo.height):end.y}
      checkpoint();setShapeList([...shapesRef.current,newShape]);setSelectedId(newShape.id);setTool('select')
      setDraft(null)
    }else if(action.changed){checkpoint(action.before)}
    gestureRef.current=null
    try{svgRef.current?.releasePointerCapture(event.pointerId)}catch{/* no capture */}
  }
  const onSvgCancel=(event:ReactPointerEvent<SVGSVGElement>)=>{
    const action=gestureRef.current
    if(!action||action.id!==event.pointerId)return
    if(action.type==='create')setDraft(null)
    else loadSnapshot(action.before)
    gestureRef.current=null
  }
  const blockTouch=(event:ReactPointerEvent<HTMLCanvasElement>)=>{
    if(penOnly&&event.pointerType!=='pen'){event.stopPropagation();event.preventDefault()}
  }

  const exportImage=async()=>{
    if(!canvasRef.current||!dim.w){setNotice('A foto ainda está carregando.');return}
    try{
      const source=await imageFromSource(photo.src)
      const output=document.createElement('canvas')
      output.width=photo.width;output.height=photo.height
      const ctx=output.getContext('2d')
      if(!ctx)throw new Error('Falha ao exportar')
      ctx.drawImage(source,0,0,photo.width,photo.height)
      ctx.drawImage(canvasRef.current,0,0,photo.width,photo.height)
      for(const shape of shapesRef.current)drawExportShape(ctx,shape,photo.width/dim.w)
      output.toBlob(blob=>{
        if(blob){downloadBlob(blob,'harmonize-marcacoes-formas.png');setNotice('PNG com foto, traços e formas exportado.')}
        else setNotice('Não foi possível gerar o arquivo.')
      },'image/png')
    }catch{setNotice('Não foi possível exportar. Tente novamente.')}
  }

  const selection=shapes.find(s=>s.id===selectedId)
  const scale=photo.width/(dim.w||photo.width)
  const handleR=7.5*scale
  const resizeHandles:(Handle)[] = selection?.kind==='line'||selection?.kind==='arrow'?['nw','se']:['nw','ne','se','sw']
  const handlePoint=(s:Shape,h:Handle):Point=>({x:h==='nw'||h==='sw'?s.x1:s.x2,y:h==='nw'||h==='ne'?s.y1:s.y2})

  const toggleFullscreen=async()=>{
    try{
      if(document.fullscreenElement) await document.exitFullscreen()
      else await bodyRef.current?.requestFullscreen()
    }catch{setNotice('Este navegador não permite tela cheia aqui.')}
  }

  return <div className="editor-body" ref={bodyRef}>
    <div className="tool-row">
      <div className="tool-group shape-toolbar" aria-label="Ferramentas de marcação">
        <ToolButton active={tool==='draw'} onClick={()=>switchTool('draw')} label="Desenhar livremente"><Pencil size={19}/></ToolButton>
        <ToolButton active={tool==='erase'} onClick={()=>switchTool('erase')} label="Borracha dos traços livres"><Eraser size={19}/></ToolButton>
        <ToolButton active={tool==='select'} onClick={()=>switchTool('select')} label="Selecionar e mover formas"><MousePointer2 size={19}/></ToolButton>
        <ToolDivider/>
        {SHAPE_TOOLS.map(({tool:kind,label,Icon})=><ToolButton key={kind} active={tool===kind} onClick={()=>switchTool(kind)} label={label}><Icon size={19}/></ToolButton>)}
      </div>
      <div className="tool-group tool-utilities">
        <ToolButton onClick={undo} disabled={!undoRef.current.length} label="Desfazer"><RotateCcw size={18}/></ToolButton>
        <ToolButton onClick={redo} disabled={!redoRef.current.length} label="Refazer"><RotateCw size={18}/></ToolButton>
        <ToolButton onClick={deleteSelected} disabled={!selection} label="Excluir forma selecionada" danger><X size={19}/></ToolButton>
        <ToolButton onClick={clear} disabled={!shapes.length&&!strokesRef.current.length} label="Limpar todas as marcações" danger><Trash2 size={18}/></ToolButton>
        <ToolButton onClick={toggleFullscreen} label={fullscreen?'Sair da tela cheia':'Tela cheia para tablet'}><Expand size={18}/></ToolButton>
        <button className="export-button" type="button" onClick={exportImage}><Download size={17}/> <span>Salvar PNG</span></button>
      </div>
    </div>
    <div className="tool-subrow tool-subrow-forms">
      <div className="tool-group settings-tools">
        <div className="color-list" aria-label="Paleta de cores">{COLORS.map(hex=><button type="button" key={hex} className={`color-dot ${color===hex?'picked':''}`} style={{backgroundColor:hex}} aria-label={`Usar cor ${hex}`} aria-pressed={color===hex} onClick={()=>recolor(hex)}/>)}</div>
        <label className="size-control"><Brush size={16}/><input type="range" min="1" max="16" step="1" value={size} onChange={e=>resizeWeight(Number(e.target.value))} aria-label="Espessura do traço"/><span>{size}px</span></label>
      </div>
      <label className="simple-toggle"><input type="checkbox" checked={penOnly} onChange={e=>setPenOnly(e.target.checked)}/><span>Somente caneta ativa</span></label>
    </div>
    <div className="drawing-area" ref={surfaceRef}>
      <div className="photo-stage" style={{width:dim.w||320,height:dim.h||405}}>
        <img className="photo-image" src={photo.src} alt="Foto a ser marcada" draggable={false}/>
        {dim.w>0 && <>
          <canvas key={`${dim.w}x${dim.h}`} ref={canvasRef} width={dim.w} height={dim.h} className="ink-layer" style={{pointerEvents:tool==='draw'||tool==='erase'?'auto':'none'}} onPointerDownCapture={blockTouch} onContextMenu={event=>event.preventDefault()}/>
          <svg ref={svgRef} className="shapes-layer" viewBox={`0 0 ${photo.width} ${photo.height}`} preserveAspectRatio="none" style={{pointerEvents:tool==='draw'||tool==='erase'?'none':'auto'}} onPointerDown={onSvgDown} onPointerMove={onSvgMove} onPointerUp={onSvgUp} onPointerCancel={onSvgCancel} aria-label="Área das formas geométricas">
            {shapes.map(shape=><ShapeMark key={shape.id} shape={shape} scale={scale} interactive={tool==='select'} onPointerDown={event=>beginSelect(event,shape)}/>)}
            {draft && <ShapeMark shape={draft} scale={scale} interactive={false}/>}
            {selection && tool==='select' && <g className="selection-outline" pointerEvents="none">
              <rect x={bounds(selection).minX} y={bounds(selection).minY} width={bounds(selection).maxX-bounds(selection).minX} height={bounds(selection).maxY-bounds(selection).minY} fill="none" stroke="#966e81" strokeDasharray="7 5" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </g>}
            {selection && tool==='select' && resizeHandles.map(handle=>{
              const p=handlePoint(selection,handle)
              return <circle key={handle} className="resize-handle" cx={p.x} cy={p.y} r={handleR} fill="#fff" stroke="#9b7184" strokeWidth="2" vectorEffect="non-scaling-stroke" onPointerDown={event=>beginResize(event,selection,handle)} />
            })}
          </svg>
        </>}
      </div>
      <span className="canvas-watermark">ATRAMENT • FORMAS</span>
    </div>
    <div className="hint-row"><span><Hand size={14}/>{selection?'Forma selecionada: arraste ou use as alças para redimensionar':tool==='draw'?'Desenhe livremente com a caneta':tool==='select'?'Toque em uma forma para selecionar':'Arraste sobre a foto para criar uma forma'}</span><span>{strokesRef.current.length} traços • {shapes.length} formas</span></div>
    {notice && <div className="toast" key={`${notice}-${revision}`} role="status" onClick={()=>setNotice('')}>{notice} ✕</div>}
  </div>
}
