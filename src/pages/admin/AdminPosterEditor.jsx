import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getPosterTemplateById,
  savePosterTemplate,
  uploadFrameImage,
} from '../../supabase/queries'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  Type,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { useToast } from '../../components/Toast'

const AVAILABLE_KEYS = [
  { key: 'category', label: 'Category' },
  { key: 'programme_name', label: 'Programme Name' },
  { key: 'result_no', label: 'Result Number' },
  { key: 'first_place_label', label: '1st Place Heading' },
  { key: 'first_name', label: '1st Place Winner Name' },
  { key: 'first_team', label: '1st Place Winner Team' },
  { key: 'second_place_label', label: '2nd Place Heading' },
  { key: 'second_name', label: '2nd Place Winner Name' },
  { key: 'second_team', label: '2nd Place Winner Team' },
  { key: 'third_place_label', label: '3rd Place Heading' },
  { key: 'third_name', label: '3rd Place Winner Name' },
  { key: 'third_team', label: '3rd Place Winner Team' },
  { key: 'festival_footer', label: 'Festival Footer Text' },
  { key: 'custom_text', label: 'Custom Static Text' },
]

const SAMPLE_PREVIEW_DATA = {
  category: 'General Cat-A',
  programme_name: 'Mappilappattu (Individual)',
  result_no: '042',
  first_place_label: '🥇 1ST PLACE',
  first_name: 'Ahammed Kabeer',
  first_team: 'Dimashqi Dara',
  second_place_label: '🥈 2ND PLACE',
  second_name: 'Muhammed Sinan',
  second_team: 'Bukharian Baza',
  third_place_label: '🥉 3RD PLACE',
  third_name: 'Faris Rahiman',
  third_team: 'Qayrawani Qaza',
  festival_footer: "RENDEZVOUS '26 ART FESTIVAL",
  custom_text: 'Official Result Announcement',
}

const PRESET_GRADIENTS = [
  'linear-gradient(135deg, #061A0D 0%, #115F32 100%)',
  'linear-gradient(135deg, #0A2914 0%, #184F2B 50%, #061A0D 100%)',
  'linear-gradient(180deg, #115F32 0%, #061A0D 100%)',
  'linear-gradient(135deg, #123D24 0%, #27663E 100%)',
  'linear-gradient(135deg, #05140A 0%, #0D3B1E 100%)',
]

const FONT_FAMILIES = ['Sora', 'Montserrat', 'Inter', 'Roboto', 'Serif', 'Monospace']

export default function AdminPosterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [zoom, setZoom] = useState(0.45)
  const [sampleData, setSampleData] = useState(SAMPLE_PREVIEW_DATA)
  const [showSamplePanel, setShowSamplePanel] = useState(false)
  const [bgTab, setBgTab] = useState('gradient') // 'solid' | 'gradient' | 'image'
  const canvasRef = useRef(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await getPosterTemplateById(id)
      if (data) {
        setTemplate(data)
        setBgTab(data.background_type || 'gradient')
        if (data.layers?.length > 0) setSelectedLayerId(data.layers[0].id)
      } else {
        toast('Template not found', 'error')
        navigate('/admin/frames/templates')
      }
      setLoading(false)
    }
    load()
  }, [id])

  // Keyboard nudging for selected layer (Arrow keys)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedLayerId || !template) return
      if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) return

      const step = e.shiftKey ? 10 : 1
      let dx = 0
      let dy = 0

      if (e.key === 'ArrowLeft') dx = -step
      else if (e.key === 'ArrowRight') dx = step
      else if (e.key === 'ArrowUp') dy = -step
      else if (e.key === 'ArrowDown') dy = step
      else return

      e.preventDefault()
      setTemplate(prev => {
        if (!prev) return prev
        const layers = prev.layers.map(l => {
          if (l.id !== selectedLayerId) return l
          return {
            ...l,
            x: Math.max(0, (l.x || 0) + dx),
            y: Math.max(0, (l.y || 0) + dy),
          }
        })
        return { ...prev, layers }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLayerId, template])

  if (loading || !template) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-mutedText bg-card rounded-2xl border border-secondary/30">
        Loading poster template editor...
      </div>
    )
  }

  const selectedLayer = template.layers?.find(l => l.id === selectedLayerId)

  const handleSave = async () => {
    setSaving(true)
    try {
      await savePosterTemplate(template)
      toast('Template saved successfully!')
    } catch (e) {
      toast('Failed to save template', 'error')
    } finally {
      setSaving(false)
    }
  }

  const updateSelectedLayer = (field, value) => {
    if (!selectedLayerId) return
    setTemplate(prev => ({
      ...prev,
      layers: prev.layers.map(l => (l.id === selectedLayerId ? { ...l, [field]: value } : l)),
    }))
  }

  const addTextLayer = () => {
    const newLayer = {
      id: `layer_${Date.now()}`,
      type: 'text',
      key: 'custom_text',
      prefix: 'New Text: ',
      font_family: 'Sora',
      font_size: 28,
      font_weight: '700',
      text_align: 'center',
      color: '#FFFFFF',
      line_height: 1.2,
      width: template.width ? template.width - 160 : 920,
      x: 80,
      y: 400,
    }
    setTemplate(prev => ({ ...prev, layers: [...prev.layers, newLayer] }))
    setSelectedLayerId(newLayer.id)
    toast('Added new text layer')
  }

  const addImageLayer = () => {
    const newLayer = {
      id: `layer_${Date.now()}`,
      type: 'image',
      key: 'image_url',
      prefix: '',
      image_url: 'https://placehold.co/200x200/115F32/FFFFFF/png?text=Logo',
      width: 200,
      height: 200,
      x: (template.width || 1080) / 2 - 100,
      y: 80,
    }
    setTemplate(prev => ({ ...prev, layers: [...prev.layers, newLayer] }))
    setSelectedLayerId(newLayer.id)
    toast('Added new image layer')
  }

  const deleteLayer = (layerId) => {
    setTemplate(prev => ({
      ...prev,
      layers: prev.layers.filter(l => l.id !== layerId),
    }))
    if (selectedLayerId === layerId) {
      const remaining = template.layers.filter(l => l.id !== layerId)
      setSelectedLayerId(remaining[0]?.id || null)
    }
  }

  const moveLayer = (idx, direction) => {
    const layers = [...template.layers]
    const targetIdx = idx + direction
    if (targetIdx < 0 || targetIdx >= layers.length) return
    const temp = layers[idx]
    layers[idx] = layers[targetIdx]
    layers[targetIdx] = temp
    setTemplate(prev => ({ ...prev, layers }))
  }

  const handleBgImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    toast('Uploading background image...')
    const url = await uploadFrameImage(file, 'template_bgs')
    if (url) {
      setTemplate(prev => ({ ...prev, background_type: 'image', background_value: url }))
      setBgTab('image')
      toast('Background image updated!')
    } else {
      toast('Failed to upload image', 'error')
    }
  }

  const getLayerRenderText = (layer) => {
    const val = sampleData[layer.key] || sampleData.custom_text || ''
    return `${layer.prefix || ''}${val}`
  }

  const canvasWidth = template.width || 1080
  const canvasHeight = template.height || 1350

  const canvasBgStyle =
    template.background_type === 'image'
      ? { backgroundImage: `url(${template.background_value})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : template.background_type === 'solid'
      ? { backgroundColor: template.background_value }
      : { background: template.background_value }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Editor Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card rounded-2xl p-4 sm:p-5 border border-secondary/30 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/frames/templates')}
            className="p-2 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-mainText transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-xl font-bold text-mainText flex items-center gap-2">
              <Sliders className="text-accent" size={22} /> {template.name}
            </h2>
            <p className="text-xs text-mutedText">
              Live Poster Template Editor ({canvasWidth}×{canvasHeight}px)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-primary text-white font-semibold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition shadow-sm disabled:opacity-50"
          >
            <Save size={16} /> {saving ? 'Saving...' : 'Save Template'}
          </button>
        </div>
      </div>

      {/* 3-Column Editor Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* COLUMN 1: LEFT LAYERS PANEL (3 cols) */}
        <div className="lg:col-span-3 bg-card rounded-2xl p-4 border border-secondary/30 shadow-sm space-y-4 max-h-[750px] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-mainText text-sm flex items-center gap-1.5">
              <Type size={16} className="text-accent" /> Template Layers ({template.layers?.length || 0})
            </h3>
          </div>

          {/* Add Layer Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={addTextLayer}
              className="inline-flex items-center justify-center gap-1.5 bg-secondary/20 hover:bg-secondary/30 text-mainText text-xs font-semibold py-2 px-2.5 rounded-xl transition"
            >
              <Plus size={14} /> Text Layer
            </button>
            <button
              onClick={addImageLayer}
              className="inline-flex items-center justify-center gap-1.5 bg-secondary/20 hover:bg-secondary/30 text-mainText text-xs font-semibold py-2 px-2.5 rounded-xl transition"
            >
              <Plus size={14} /> Image Layer
            </button>
          </div>

          {/* Layer List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {template.layers?.map((layer, idx) => {
              const isSelected = layer.id === selectedLayerId
              const keyLabel = AVAILABLE_KEYS.find(k => k.key === layer.key)?.label || layer.key

              return (
                <div
                  key={layer.id}
                  onClick={() => setSelectedLayerId(layer.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-primary/20 border-primary text-mainText font-bold shadow-sm'
                      : 'bg-mainBackground/40 border-secondary/20 hover:bg-secondary/10 text-mutedText'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-secondary/30 text-mainText px-1.5 py-0.5 rounded font-mono">
                        #{idx + 1}
                      </span>
                      <span className="truncate font-semibold text-mainText">{layer.prefix}{keyLabel}</span>
                    </div>
                    <p className="text-[10px] text-mutedText truncate mt-0.5">
                      X: {layer.x}px · Y: {layer.y}px
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => moveLayer(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 hover:text-accent disabled:opacity-20"
                      title="Move Up"
                    >
                      <MoveUp size={12} />
                    </button>
                    <button
                      onClick={() => moveLayer(idx, 1)}
                      disabled={idx === template.layers.length - 1}
                      className="p-1 hover:text-accent disabled:opacity-20"
                      title="Move Down"
                    >
                      <MoveDown size={12} />
                    </button>
                    <button
                      onClick={() => deleteLayer(layer.id)}
                      className="p-1 text-red-400 hover:text-red-500"
                      title="Delete Layer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* COLUMN 2: CENTER LIVE CANVAS PREVIEW (6 cols) */}
        <div className="lg:col-span-6 bg-card rounded-2xl p-4 border border-secondary/30 shadow-sm space-y-3 flex flex-col items-center justify-between min-h-[600px] overflow-hidden">
          {/* Zoom Controls */}
          <div className="w-full flex items-center justify-between gap-2 border-b border-secondary/20 pb-3">
            <span className="text-xs font-semibold text-mutedText">Live Poster Canvas</span>
            <div className="flex items-center gap-1 bg-mainBackground rounded-xl p-1 border border-secondary/20">
              <button
                onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}
                className="p-1.5 hover:bg-secondary/20 rounded-lg text-mainText"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="text-xs font-mono px-2 text-mainText font-bold">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom(z => Math.min(1.2, z + 0.1))}
                className="p-1.5 hover:bg-secondary/20 rounded-lg text-mainText"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setZoom(0.45)}
                className="p-1.5 hover:bg-secondary/20 rounded-lg text-mainText text-[11px] font-semibold px-2"
              >
                Fit
              </button>
            </div>
          </div>

          {/* Canvas Wrapper */}
          <div className="w-full flex-1 flex items-center justify-center p-4 overflow-auto min-h-[460px]">
            <div
              ref={canvasRef}
              className="relative shadow-2xl rounded-lg overflow-hidden transition-all duration-150 border border-white/10 shrink-0 select-none"
              style={{
                width: `${canvasWidth * zoom}px`,
                height: `${canvasHeight * zoom}px`,
                ...canvasBgStyle,
              }}
            >
              {/* Render Layers */}
              {template.layers?.map(layer => {
                const isSelected = layer.id === selectedLayerId
                const scaledX = (layer.x || 0) * zoom
                const scaledY = (layer.y || 0) * zoom
                const scaledW = (layer.width || 300) * zoom
                const scaledFontSize = (layer.font_size || 24) * zoom

                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`absolute cursor-pointer transition-all ${
                      isSelected ? 'outline outline-2 outline-accent ring-2 ring-accent/40 z-30' : 'hover:outline hover:outline-1 hover:outline-white/40 z-20'
                    }`}
                    style={{
                      left: `${scaledX}px`,
                      top: `${scaledY}px`,
                      width: `${scaledW}px`,
                      textAlign: layer.text_align || 'center',
                    }}
                  >
                    {layer.type === 'image' ? (
                      <img
                        src={layer.image_url || 'https://placehold.co/200x200/115F32/FFFFFF/png?text=Logo'}
                        alt="Layer"
                        className="object-contain"
                        style={{
                          width: `${(layer.width || 200) * zoom}px`,
                          height: `${(layer.height || 200) * zoom}px`,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          fontFamily: layer.font_family || 'Sora',
                          fontSize: `${scaledFontSize}px`,
                          fontWeight: layer.font_weight || '700',
                          color: layer.color || '#FFFFFF',
                          lineHeight: layer.line_height || 1.2,
                          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        }}
                      >
                        {getLayerRenderText(layer)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sample Data Toggle Drawer */}
          <div className="w-full border-t border-secondary/20 pt-3">
            <button
              onClick={() => setShowSamplePanel(v => !v)}
              className="w-full flex items-center justify-between text-xs font-semibold text-mutedText hover:text-mainText transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-accent" /> Example Data for Preview Testing
              </span>
              {showSamplePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showSamplePanel && (
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs max-h-40 overflow-y-auto p-2 bg-mainBackground/50 rounded-xl">
                {Object.keys(SAMPLE_PREVIEW_DATA).map(key => (
                  <div key={key}>
                    <label className="text-[10px] text-mutedText block font-mono capitalize">{key}</label>
                    <input
                      type="text"
                      value={sampleData[key] || ''}
                      onChange={e => setSampleData(s => ({ ...s, [key]: e.target.value }))}
                      className="w-full bg-card border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText focus:outline-none focus:border-accent"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: RIGHT TEMPLATE CONFIGURATION PANEL (3 cols) */}
        <div className="lg:col-span-3 bg-card rounded-2xl p-4 border border-secondary/30 shadow-sm space-y-4 max-h-[750px] overflow-y-auto">
          <h3 className="font-bold text-mainText text-sm">Template Settings</h3>

          {/* Name */}
          <div>
            <label className="text-xs font-semibold text-mutedText block mb-1">Template Name</label>
            <input
              type="text"
              value={template.name || ''}
              onChange={e => setTemplate(t => ({ ...t, name: e.target.value }))}
              className="w-full bg-mainBackground border border-secondary/30 rounded-xl px-3 py-2 text-xs font-medium text-mainText focus:outline-none focus:border-accent"
            />
          </div>

          {/* Canvas Dimensions */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-mutedText block mb-1">Width (px)</label>
              <input
                type="number"
                value={template.width || 1080}
                onChange={e => setTemplate(t => ({ ...t, width: Number(e.target.value) }))}
                className="w-full bg-mainBackground border border-secondary/30 rounded-xl px-3 py-2 text-xs font-medium text-mainText focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-mutedText block mb-1">Height (px)</label>
              <input
                type="number"
                value={template.height || 1350}
                onChange={e => setTemplate(t => ({ ...t, height: Number(e.target.value) }))}
                className="w-full bg-mainBackground border border-secondary/30 rounded-xl px-3 py-2 text-xs font-medium text-mainText focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Background Configuration */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-mutedText block">Background Style</label>
            
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-mainBackground p-1 rounded-xl border border-secondary/20 text-xs">
              {['gradient', 'solid', 'image'].map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setBgTab(tab)
                    setTemplate(t => ({ ...t, background_type: tab }))
                  }}
                  className={`py-1 rounded-lg font-semibold capitalize transition ${
                    bgTab === tab ? 'bg-primary text-white shadow-sm' : 'text-mutedText hover:text-mainText'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {bgTab === 'solid' && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={template.background_value || '#061A0D'}
                  onChange={e => setTemplate(t => ({ ...t, background_value: e.target.value }))}
                  className="w-full bg-mainBackground border border-secondary/30 rounded-xl px-3 py-2 text-xs font-mono text-mainText"
                  placeholder="#061A0D"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={template.background_value.startsWith('#') ? template.background_value : '#061A0D'}
                    onChange={e => setTemplate(t => ({ ...t, background_value: e.target.value }))}
                    className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                  />
                  <span className="text-xs text-mutedText">Pick solid hex color</span>
                </div>
              </div>
            )}

            {bgTab === 'gradient' && (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={2}
                  value={template.background_value || ''}
                  onChange={e => setTemplate(t => ({ ...t, background_value: e.target.value }))}
                  className="w-full bg-mainBackground border border-secondary/30 rounded-xl px-3 py-2 text-xs font-mono text-mainText focus:outline-none"
                  placeholder="linear-gradient(...)"
                />
                <p className="text-[10px] text-mutedText font-semibold">Preset Gradients:</p>
                <div className="space-y-1">
                  {PRESET_GRADIENTS.map((g, idx) => (
                    <button
                      key={idx}
                      onClick={() => setTemplate(t => ({ ...t, background_value: g }))}
                      className="w-full h-7 rounded-lg border border-white/20 transition hover:opacity-80"
                      style={{ background: g }}
                      title={g}
                    />
                  ))}
                </div>
              </div>
            )}

            {bgTab === 'image' && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={template.background_value || ''}
                  onChange={e => setTemplate(t => ({ ...t, background_value: e.target.value }))}
                  className="w-full bg-mainBackground border border-secondary/30 rounded-xl px-3 py-2 text-xs text-mainText"
                  placeholder="Background Image Storage URL"
                />
                <label className="inline-flex items-center justify-center gap-1.5 w-full bg-secondary/20 hover:bg-secondary/30 text-mainText text-xs font-semibold py-2 rounded-xl cursor-pointer transition">
                  <ImageIcon size={14} /> Upload Background Image
                  <input type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM TOOLBAR FOR SELECTED LAYER */}
      {selectedLayer && (
        <div className="bg-card rounded-2xl p-4 border border-accent/40 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} /> Edit Layer: {selectedLayer.prefix}{selectedLayer.key}
            </span>
            <span className="text-[11px] text-mutedText">
              💡 Press Arrow keys to move layer (Hold Shift for 10px steps)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-11 gap-2 text-xs">
            {/* Binding Key */}
            <div className="col-span-2">
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">Key Binding</label>
              <select
                value={selectedLayer.key || 'custom_text'}
                onChange={e => updateSelectedLayer('key', e.target.value)}
                className="w-full bg-mainBackground border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText"
              >
                {AVAILABLE_KEYS.map(k => (
                  <option key={k.key} value={k.key}>{k.label}</option>
                ))}
              </select>
            </div>

            {/* Prefix */}
            <div className="col-span-2">
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">Text Prefix</label>
              <input
                type="text"
                value={selectedLayer.prefix || ''}
                onChange={e => updateSelectedLayer('prefix', e.target.value)}
                className="w-full bg-mainBackground border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText"
                placeholder="e.g. RESULT #"
              />
            </div>

            {/* Font Family */}
            <div className="col-span-2">
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">Font Family</label>
              <select
                value={selectedLayer.font_family || 'Sora'}
                onChange={e => updateSelectedLayer('font_family', e.target.value)}
                className="w-full bg-mainBackground border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText"
              >
                {FONT_FAMILIES.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            </div>

            {/* Font Size */}
            <div>
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">Size (px)</label>
              <input
                type="number"
                value={selectedLayer.font_size || 24}
                onChange={e => updateSelectedLayer('font_size', Number(e.target.value))}
                className="w-full bg-mainBackground border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText"
              />
            </div>

            {/* Font Weight */}
            <div>
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">Weight</label>
              <select
                value={selectedLayer.font_weight || '700'}
                onChange={e => updateSelectedLayer('font_weight', e.target.value)}
                className="w-full bg-mainBackground border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText"
              >
                <option value="400">Normal</option>
                <option value="600">SemiBold</option>
                <option value="700">Bold</option>
                <option value="800">Extrabold</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">Color</label>
              <div className="flex items-center gap-1">
                <input
                  type="color"
                  value={selectedLayer.color || '#FFFFFF'}
                  onChange={e => updateSelectedLayer('color', e.target.value)}
                  className="w-6 h-6 rounded cursor-pointer border-0"
                />
                <input
                  type="text"
                  value={selectedLayer.color || '#FFFFFF'}
                  onChange={e => updateSelectedLayer('color', e.target.value)}
                  className="w-full bg-mainBackground border border-secondary/30 rounded px-1 py-0.5 text-[10px] font-mono text-mainText"
                />
              </div>
            </div>

            {/* Position X */}
            <div>
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">X (px)</label>
              <input
                type="number"
                value={selectedLayer.x || 0}
                onChange={e => updateSelectedLayer('x', Number(e.target.value))}
                className="w-full bg-mainBackground border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText"
              />
            </div>

            {/* Position Y */}
            <div>
              <label className="text-[10px] text-mutedText block font-semibold mb-0.5">Y (px)</label>
              <input
                type="number"
                value={selectedLayer.y || 0}
                onChange={e => updateSelectedLayer('y', Number(e.target.value))}
                className="w-full bg-mainBackground border border-secondary/30 rounded-lg px-2 py-1 text-xs text-mainText"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
