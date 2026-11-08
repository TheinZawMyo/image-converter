import { useEffect, useMemo, useRef, useState } from 'react'
import JSZip from 'jszip'
import { ArrowDownToLine, ArrowLeftRight, Check, ChevronDown, Download, FileImage, FlipHorizontal2, FlipVertical2, ImagePlus, LoaderCircle, LockKeyhole, Plus, RotateCcw, RotateCw, Settings2, ShieldCheck, Sparkles, Trash2, Upload, X } from 'lucide-react'
import { convertImage, formatBytes, getImageInfo } from './converter.js'

const initialOptions = { format: 'WEBP', quality: 82, resize: 100, lock: true, width: '', height: '', rotation: 0, flipH: false, flipV: false, watermark: '' }
const accepted = 'image/*,.heic,.heif,.tif,.tiff,.bmp,.avif'

function App() {
  const inputRef = useRef(null)
  const [items, setItems] = useState([])
  const [selected, setSelected] = useState(null)
  const [options, setOptions] = useState(initialOptions)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const current = items.find(item => item.id === selected) || items[0]
  const dimensions = useMemo(() => {
    if (!current) return { width: 0, height: 0 }
    const swap = options.rotation % 180 !== 0
    const width = swap ? current.height : current.width
    const height = swap ? current.width : current.height
    return { width: Math.max(1, Math.round(width * options.resize / 100)), height: Math.max(1, Math.round(height * options.resize / 100)) }
  }, [current, options.rotation, options.resize])

  const itemsRef = useRef(items)
  itemsRef.current = items
  useEffect(() => () => itemsRef.current.forEach(item => URL.revokeObjectURL(item.previewUrl)), [])
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 3500); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!current) return
    setOptions(prev => ({ ...prev, width: dimensions.width || '', height: dimensions.height || '' }))
  }, [current?.id])

  const addFiles = async (fileList) => {
    const files = [...fileList].filter(file => file.type.startsWith('image/') || /\.(heic|heif|tif|tiff|bmp)$/i.test(file.name))
    if (!files.length) { setToast('Choose an image file to get started.'); return }
    const added = []
    for (const file of files) {
      try {
        const info = await getImageInfo(file)
        added.push({ id: crypto.randomUUID(), file, ...info, status: 'ready', output: null, error: '' })
      } catch (error) { setToast(`${file.name}: ${error.message}`) }
    }
    if (added.length) {
      setItems(prev => [...prev, ...added])
      setSelected(prev => prev || added[0].id)
      if (!items.length) setOptions(initialOptions)
    }
  }

  const patchOption = (key, value) => setOptions(prev => {
    const next = { ...prev, [key]: value }
    if (key === 'resize') {
      next.width = Math.max(1, Math.round(dimensions.width * value / (prev.resize || 100)))
      next.height = Math.max(1, Math.round(dimensions.height * value / (prev.resize || 100)))
    }
    if (key === 'width' && prev.lock && current) next.height = Math.max(1, Math.round(value * dimensions.height / dimensions.width))
    if (key === 'height' && prev.lock && current) next.width = Math.max(1, Math.round(value * dimensions.width / dimensions.height))
    if (key === 'rotation' && current) {
      const swaps = value % 180 !== prev.rotation % 180
      next.width = swaps ? dimensions.height : dimensions.width
      next.height = swaps ? dimensions.width : dimensions.height
    }
    return next
  })

  const processItems = async (targets) => {
    if (!targets.length || busy) return []
    setBusy(true)
    setItems(prev => prev.map(item => targets.some(t => t.id === item.id) ? { ...item, status: 'converting', error: '' } : item))
    const results = []
    for (const item of targets) {
      try {
        const rotated = options.rotation % 180 !== 0
        const sourceWidth = rotated ? item.height : item.width
        const sourceHeight = rotated ? item.width : item.height
        const isSelected = item.id === current?.id
        const outputWidth = isSelected ? Number(options.width) || dimensions.width : Math.max(1, Math.round(sourceWidth * options.resize / 100))
        const outputHeight = isSelected ? Number(options.height) || dimensions.height : Math.max(1, Math.round(sourceHeight * options.resize / 100))
        const result = await convertImage(item, { ...options, width: outputWidth, height: outputHeight })
        results.push({ ...result, id: item.id })
        setItems(prev => prev.map(entry => entry.id === item.id ? { ...entry, status: 'done', output: result, error: '' } : entry))
      } catch (error) {
        setItems(prev => prev.map(entry => entry.id === item.id ? { ...entry, status: 'error', error: error.message } : entry))
        setToast(error.message)
      }
    }
    setBusy(false)
    return results
  }
  const convertSelected = async () => {
    const results = await processItems(current ? [current] : [])
    if (results[0]) download(results[0].blob, results[0].name)
  }
  const convertAll = async () => {
    const results = await processItems(items)
    if (!results.length) return
    if (results.length === 1) download(results[0].blob, results[0].name)
    else {
      const zip = new JSZip()
      results.forEach(result => zip.file(result.name, result.blob))
      download(await zip.generateAsync({ type: 'blob' }), 'pixelshift-converted.zip')
    }
  }
  const removeItem = (id) => {
    const removed = items.find(item => item.id === id)
    if (removed) URL.revokeObjectURL(removed.previewUrl)
    const left = items.filter(item => item.id !== id)
    setItems(left); if (selected === id) setSelected(left[0]?.id || null)
  }
  const resetAll = () => { items.forEach(item => URL.revokeObjectURL(item.previewUrl)); setItems([]); setSelected(null); setOptions(initialOptions) }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#"><span className="brand-mark"><ArrowLeftRight size={19} strokeWidth={2.5}/></span><span>pixelshift<span className="brand-dot">.</span></span></a>
      <nav className="top-links"><a href="#workspace">Converter</a><a href="#how-it-works">How it works</a><span className="privacy-pill"><LockKeyhole size={13}/> 100% private</span></nav>
      <button className="top-upload" onClick={() => inputRef.current?.click()}><Plus size={16}/> Add images</button>
    </header>

    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><Sparkles size={13}/> YOUR IMAGES, YOUR RULES</div><h1>Make every image<br/><span>work harder.</span></h1><p>Convert, resize, and fine-tune your images in one place.<br className="desktop-break"/> Fast, simple, and always private.</p><div className="hero-trust"><span><ShieldCheck size={15}/> Files never leave your device</span><i/><span>No sign-up needed</span></div></div><div className="hero-art" aria-hidden="true"><div className="art-glow"/><div className="art-sheet art-sheet-back"><div className="art-img back-img"/></div><div className="art-sheet art-sheet-mid"><div className="art-img mid-img"/></div><div className="art-sheet art-sheet-front"><div className="art-img front-img"><div className="sun"/><div className="mountain mountain-one"/><div className="mountain mountain-two"/><div className="hill"/></div></div><div className="format-chip png-chip">PNG <span>↗</span></div><div className="format-chip webp-chip"><span className="mini-star">✳</span> WEBP</div><div className="art-sparkle">✦</div></div></section>

      <section className="workspace" id="workspace">
        <div className="section-heading"><div><div className="step-label"><span>01</span> IMAGE WORKSPACE</div><h2>Let's get converting.</h2></div>{items.length > 0 && <button className="clear-btn" onClick={resetAll}><Trash2 size={14}/> Clear all</button>}</div>
        {items.length === 0 ? <div className={`dropzone ${dragging ? 'is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files) }} onClick={() => inputRef.current?.click()}><input ref={inputRef} type="file" accept={accepted} multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = '' }}/><div className="upload-icon"><Upload size={21}/></div><h3>Drop your images here</h3><p>or <button onClick={e => { e.stopPropagation(); inputRef.current?.click() }}>browse files</button> from your device</p><div className="format-list"><span>PNG</span><span>JPG</span><span>WEBP</span><span>AVIF</span><span>HEIC</span><span>TIFF</span></div><div className="drop-foot"><LockKeyhole size={13}/> Your images are processed locally and never uploaded</div></div> : <>
          <div className="editor-grid"><div className="preview-panel"><div className="panel-top"><span>PREVIEW</span><span className="preview-status"><i/> {current?.status === 'done' ? 'Converted' : 'Original image'}</span></div>{current && <div className="preview-canvas"><img src={current.previewUrl} alt={current.file.name} style={{ transform: `rotate(${options.rotation}deg) scale(${options.flipH ? -1 : 1}, ${options.flipV ? -1 : 1})` }}/></div>}<div className="preview-caption"><div className="file-icon"><FileImage size={17}/></div><div className="file-caption"><strong>{current?.file.name}</strong><span>{current?.width} × {current?.height} px <i/> {current && formatBytes(current.file.size)}</span></div><button className="icon-button" title="Remove image" onClick={() => current && removeItem(current.id)}><X size={17}/></button></div></div>
          <div className="settings-panel"><div className="panel-top settings-title"><span><Settings2 size={14}/> CONVERSION SETTINGS</span><span className="local-badge"><LockKeyhole size={12}/> LOCAL</span></div><div className="setting-block format-block"><label>Convert to</label><div className="format-options">{['PNG','JPG','WEBP','AVIF'].map(format => <button key={format} className={options.format === format ? 'format-option active' : 'format-option'} onClick={() => patchOption('format', format)}>{format}{options.format === format && <Check size={12}/>}</button>)}</div></div>
            {options.format !== 'PNG' && <div className="setting-block quality-block"><div className="setting-row"><label>Quality</label><strong>{options.quality}<small>%</small></strong></div><input className="range" type="range" min="10" max="100" value={options.quality} style={{'--range-progress': `${(options.quality - 10) / 90 * 100}%`}} onChange={e => patchOption('quality', Number(e.target.value))}/><div className="range-labels"><span>Smaller file</span><span>Better quality</span></div></div>}
            <div className="setting-block resize-block"><div className="setting-row"><label>Resize image</label><div className="scale-options">{[50,75,100].map(scale => <button className={options.resize === scale ? 'selected' : ''} key={scale} onClick={() => patchOption('resize', scale)}>{scale}%</button>)}</div></div><div className="dimension-row"><div className="dimension-input"><span>W</span><input aria-label="Width in pixels" type="number" min="1" value={options.width} onChange={e => patchOption('width', Math.max(1, Number(e.target.value)))}/><em>px</em></div><button className={`lock-button ${options.lock ? 'locked' : ''}`} title="Toggle aspect ratio lock" onClick={() => patchOption('lock', !options.lock)}><LockKeyhole size={14}/></button><div className="dimension-input"><span>H</span><input aria-label="Height in pixels" type="number" min="1" value={options.height} onChange={e => patchOption('height', Math.max(1, Number(e.target.value)))}/><em>px</em></div></div></div>
            <div className="setting-block edit-block"><label>Quick edits</label><div className="edit-actions"><button title="Rotate left" onClick={() => patchOption('rotation', (options.rotation + 270) % 360)}><RotateCcw size={16}/></button><button title="Rotate right" onClick={() => patchOption('rotation', (options.rotation + 90) % 360)}><RotateCw size={16}/></button><button className={options.flipH ? 'edit-active' : ''} title="Flip horizontal" onClick={() => patchOption('flipH', !options.flipH)}><FlipHorizontal2 size={16}/></button><button className={options.flipV ? 'edit-active' : ''} title="Flip vertical" onClick={() => patchOption('flipV', !options.flipV)}><FlipVertical2 size={16}/></button></div></div>
            <div className="watermark-field"><label htmlFor="watermark">Watermark <span>OPTIONAL</span></label><input id="watermark" type="text" placeholder="Add a text watermark…" value={options.watermark} onChange={e => patchOption('watermark', e.target.value)}/></div>
          </div></div>
          <div className="queue-panel"><div className="queue-head"><div><h3>Your images <span>{items.length}</span></h3><p>{items.length} file{items.length === 1 ? '' : 's'} ready to convert</p></div><button className="add-more" onClick={() => inputRef.current?.click()}><Plus size={15}/> Add more</button><input ref={inputRef} type="file" accept={accepted} multiple hidden onChange={e => { addFiles(e.target.files); e.target.value = '' }}/></div><div className="queue-list">{items.map(item => <button key={item.id} className={`queue-item ${item.id === current?.id ? 'queue-selected' : ''}`} onClick={() => setSelected(item.id)}><img src={item.previewUrl} alt=""/><div className="queue-file"><strong>{item.file.name}</strong><span>{item.width} × {item.height} px <i/> {formatBytes(item.file.size)}</span></div><div className={`queue-state ${item.status}`}>{item.status === 'converting' ? <LoaderCircle size={15} className="spin"/> : item.status === 'done' ? <Check size={15}/> : item.status === 'error' ? <X size={15}/> : <span/>}</div><button className="queue-remove" title="Remove" onClick={e => { e.stopPropagation(); removeItem(item.id) }}><X size={15}/></button></button>)}</div></div>
          <div className="convert-bar"><div className="convert-note"><ShieldCheck size={16}/><span><strong>Private by design</strong> <i/> Everything stays on your device.</span></div><button className="convert-button" disabled={busy} onClick={items.length > 1 ? convertAll : convertSelected}>{busy ? <><LoaderCircle size={17} className="spin"/> Converting…</> : <><Download size={17}/>{items.length > 1 ? 'Convert & download all' : 'Convert & download'}{items.length > 1 && <span className="button-count">{items.length}</span>}</>}</button></div>
        </>}
      </section>
      <section className="how" id="how-it-works"><div className="step-label"><span>02</span> SIMPLE BY DESIGN</div><h2>Three steps. That's it.</h2><div className="how-grid"><div><div className="how-icon lilac"><ImagePlus size={19}/></div><strong>Drop it in</strong><p>Choose one image or a whole batch. We support all the formats you use.</p></div><div><div className="how-icon peach"><Settings2 size={19}/></div><strong>Make it yours</strong><p>Pick a format, adjust the size, and fine-tune until it's just right.</p></div><div><div className="how-icon mint"><Download size={19}/></div><strong>Take it with you</strong><p>Download your files individually or bundle everything into one ZIP.</p></div></div></section>
    </main>
    <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><ArrowLeftRight size={16} strokeWidth={2.5}/></span><span>pixelshift<span className="brand-dot">.</span></span></a><span>Made for your images. <span className="footer-sep">·</span> Nothing leaves your device.</span><span className="footer-version">FREE, ALWAYS</span></footer>
    {toast && <div className="toast"><span>{toast}</span><button onClick={() => setToast('')}><X size={14}/></button></div>}
  </div>
}

function download(blob, name) { const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
export default App
