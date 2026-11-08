const mimeByFormat = { PNG: 'image/png', JPG: 'image/jpeg', WEBP: 'image/webp', AVIF: 'image/avif' }

export const formatBytes = (bytes) => bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

async function normalizeFile(file) {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (['heic', 'heif'].includes(ext) || file.type.includes('heic')) {
    const { default: heic2any } = await import('heic2any')
    const converted = await heic2any({ blob: file, toType: 'image/png' })
    return Array.isArray(converted) ? converted[0] : converted
  }
  if (ext === 'tif' || ext === 'tiff' || file.type === 'image/tiff') {
    const UTIF = (await import('utif')).default
    const buffer = await file.arrayBuffer()
    const ifds = UTIF.decode(buffer)
    UTIF.decodeImage(buffer, ifds[0])
    const rgba = UTIF.toRGBA8(ifds[0])
    const canvas = document.createElement('canvas')
    canvas.width = ifds[0].width; canvas.height = ifds[0].height
    const ctx = canvas.getContext('2d')
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), canvas.width, canvas.height), 0, 0)
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  }
  return file
}

export async function getImageInfo(file) {
  const normalized = await normalizeFile(file)
  const url = URL.createObjectURL(normalized)
  try {
    const image = await loadImage(url)
    return { width: image.naturalWidth, height: image.naturalHeight, previewUrl: url, normalized }
  } catch (error) { URL.revokeObjectURL(url); throw error }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('This image format could not be opened in your browser.'))
    image.src = url
  })
}

export async function convertImage(item, options) {
  const image = await loadImage(item.previewUrl)
  const rotation = ((options.rotation % 360) + 360) % 360
  const rotated = rotation === 90 || rotation === 270
  const baseWidth = rotated ? item.height : item.width
  const baseHeight = rotated ? item.width : item.height
  const width = Math.max(1, Math.round(options.width || baseWidth))
  const height = Math.max(1, Math.round(options.height || baseHeight))
  const canvas = document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const ctx = canvas.getContext('2d')
  if (options.format === 'JPG') { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height) }
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate(rotation * Math.PI / 180)
  ctx.scale(options.flipH ? -1 : 1, options.flipV ? -1 : 1)
  const drawWidth = rotated ? height : width
  const drawHeight = rotated ? width : height
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
  ctx.restore()
  if (options.watermark.trim()) {
    const size = Math.max(14, Math.round(width * 0.025))
    ctx.font = `600 ${size}px Inter, sans-serif`
    ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'
    ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 5
    ctx.fillStyle = 'rgba(255,255,255,.88)'
    ctx.fillText(options.watermark.trim(), width - size, height - size)
  }
  const type = mimeByFormat[options.format]
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error(`${options.format} export is not supported by this browser.`)), type, options.format === 'PNG' ? undefined : options.quality / 100))
  if (blob.type !== type && options.format === 'AVIF') throw new Error('AVIF export is not supported by this browser. Try WebP or PNG.')
  return { blob, width, height, name: `${item.file.name.replace(/\.[^.]+$/, '')}.${options.format.toLowerCase()}` }
}
