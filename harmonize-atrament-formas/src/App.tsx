import { useRef, useState, type ChangeEvent } from 'react'
import { ArrowUpRight, ImagePlus, LockKeyhole, RotateCcw, ShieldCheck, Smartphone, Sparkles, Shapes } from 'lucide-react'
import { AtramentDemo } from './components/AtramentDemo'
import { loadPhoto, SAMPLE_PHOTO, type Photo } from './types'

export default function App() {
  const [photo, setPhoto] = useState<Photo>(SAMPLE_PHOTO)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    setLoading(true)
    try {
      setPhoto(await loadPhoto(file))
      setMessage(null)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível carregar a imagem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">H</div>
          <div className="brand-title"><strong>harmonize</strong><span>LAB / ATRAMENT + FORMAS</span></div>
        </div>
        <div className="top-pill"><span className="pulse"/> Editor local • Fotos não são enviadas ao servidor</div>
        <button type="button" className="header-help" onClick={() => document.getElementById('como-testar')?.scrollIntoView({behavior:'smooth'})}>Como testar <ArrowUpRight size={15}/></button>
      </header>

      <main className="page-content">
        <div className="page-heading">
          <div>
            <span className="eyebrow"><Sparkles size={14}/> LABORATÓRIO DE MARCAÇÕES</span>
            <h1>Desenhe, marque e edite<span>.</span></h1>
            <p>Use a caneta do tablet para desenhar livremente sobre a foto e adicionar formas que podem ser movidas e redimensionadas.</p>
          </div>
          <div className="heading-meta"><ShieldCheck size={17}/><div><strong>Somente Atrament</strong><small>MIT • Sem licença comercial paga</small></div></div>
        </div>

        <section className="comparison">
          <div className="single-editor-heading"><Shapes size={19}/><div><strong>Editor de avaliação facial</strong><span>Caneta livre + formas vetoriais editáveis</span></div><span className="version-label">VERSÃO 2.0</span></div>
          <div className="workspace">
            <div className="workspace-top">
              <div className="workspace-identity"><span className="workspace-dot"/><div><strong>Marcações na foto</strong><small>{photo.name}</small></div></div>
              <div className="workspace-actions">
                <button type="button" className="button button-ghost" onClick={() => {setPhoto({...SAMPLE_PHOTO,revision:Date.now()});setMessage(null)}}><RotateCcw size={16}/><span>Foto exemplo</span></button>
                <button type="button" className="button button-primary" onClick={() => inputRef.current?.click()} disabled={loading}><ImagePlus size={17}/>{loading ? 'Carregando...' : 'Carregar foto'}</button>
                <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={onUpload}/>
              </div>
            </div>
            {message && <div role="alert" className="error-banner">{message}</div>}
            <div className="editor-container"><AtramentDemo photo={photo}/></div>
            <div className="workspace-bottom"><div><span className="shortcut">✦</span> Toque em uma forma com a ferramenta Selecionar para editar.</div><div className="tablet-indicator"><Smartphone size={15}/> Caneta, toque e mouse*</div></div>
          </div>
        </section>

        <section className="info-section" id="como-testar">
          <div className="info-head"><span className="eyebrow">GUIA DE TESTE</span><h2>Teste com a caneta do tablet</h2></div>
          <div className="info-grid">
            <article className="info-card"><span className="step-number">01</span><h3>Abra no tablet</h3><p>Com PC e tablet no mesmo Wi-Fi, execute <code>npm run dev</code> e acesse o IP local do PC pela porta 5173.</p></article>
            <article className="info-card"><span className="step-number">02</span><h3>Desenhe na foto</h3><p>Escolha Caneta, ajuste cor e espessura e desenhe sobre a imagem ilustrativa ou outra foto autorizada.</p></article>
            <article className="info-card"><span className="step-number">03</span><h3>Teste as formas</h3><p>Escolha Círculo, Linha, Seta, Retângulo ou Triângulo. Depois use Selecionar para mover, redimensionar e excluir.</p></article>
          </div>
          <div className="notice"><LockKeyhole size={17}/><p><strong>Protótipo, não prontuário:</strong> não grava dados na nuvem e não tem autenticação. Para uso clínico real, implemente proteção de fotos, controle de acesso, consentimento e armazenamento seguro. <em>*Canetas capacitivas podem ser reconhecidas como dedo; pressão e rejeição de palma dependem do tablet e do navegador.</em></p></div>
        </section>
      </main>
      <footer>HARMONIZE / ATRAMENT LAB <span>Desenho livre e formas • licença MIT</span></footer>
    </div>
  )
}
