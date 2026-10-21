export type Photo = {
  src: string
  width: number
  height: number
  name: string
  revision: number
}

export const SAMPLE_PHOTO: Photo = {
  src: '/rosto-exemplo.jpg',
  width: 820,
  height: 1040,
  name: 'Modelo ilustrativo',
  revision: 0,
}

export const COLORS = ['#b45366', '#cf3345', '#2667b6', '#31866c', '#20252c'] as const

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function loadPhoto(file: File): Promise<Photo> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
    throw new Error('Escolha uma imagem JPG, PNG, WebP ou AVIF.')
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('A imagem deve ter no máximo 15 MB.')
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Não foi possível abrir a imagem.'))
      el.src = url
    })
    const scale = Math.min(1, 1800 / Math.max(img.naturalWidth, img.naturalHeight))
    const width = Math.round(img.naturalWidth * scale)
    const height = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Seu navegador não suportou o processamento da foto.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    return { src: canvas.toDataURL('image/jpeg', 0.92), width, height, name: file.name, revision: Date.now() }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function imageFromSource(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('A foto não pôde ser processada.'))
    image.src = src
  })
}
