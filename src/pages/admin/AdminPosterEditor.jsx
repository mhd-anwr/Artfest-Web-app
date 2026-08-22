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
  Image as ImageIcon,
  Type,
  Sliders,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Grid,
  MoreVertical,
  RotateCw,
  Eye,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'
import { useToast } from '../../components/Toast'

const LAYER_CATEGORIES = [
  {
    category: 'Programme Info',
    keys: [
      { key: 'programme_name', label: 'Program Name' },
      { key: 'category', label: 'Category' },
      { key: 'result_no', label: 'Result Number' },
    ],
  },
  {
    category: 'Winner Container & 1st Place',
    keys: [
      { key: 'first_place_label', label: '1ST Heading' },
      { key: 'first_name', label: '1st Winner Name' },
      { key: 'first_team', label: '1st Winner Team' },
      { key: 'first_photo', label: '1st Winner Photo' },
    ],
  },
  {
    category: '2nd Place',
    keys: [
      { key: 'second_place_label', label: '2ND Heading' },
      { key: 'second_name', label: '2nd Winner Name' },
      { key: 'second_team', label: '2nd Winner Team' },
      { key: 'second_photo', label: '2nd Winner Photo' },
    ],
  },
  {
    category: '3rd Place',
    keys: [
      { key: 'third_place_label', label: '3RD Heading' },
      { key: 'third_name', label: '3rd Winner Name' },
      { key: 'third_team', label: '3rd Winner Team' },
      { key: 'third_photo', label: '3rd Winner Photo' },
    ],
  },
  {
    category: 'Other / Custom',
    keys: [
      { key: 'festival_footer', label: 'Festival Footer Text' },
      { key: 'custom_text', label: 'Custom Static Text' },
      { key: 'custom_image', label: 'Custom Image Element' },
    ],
  },
]

const ALL_AVAILABLE_KEYS = LAYER_CATEGORIES.flatMap(c => c.keys)

const SAMPLE_PREVIEW_DATA = {
  category: 'General Cat-A',
  programme_name: 'Mappilappattu (Individual)',
  result_no: '042',
  first_place_label: '1ST',
  first_name: 'Ahammed Kabeer',
  first_team: 'Dimashqi Dara',
  first_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
  second_place_label: '2ND',
  second_name: 'Muhammed Sinan',
  second_team: 'Bukharian Baza',
  second_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
  third_place_label: '3RD',
  third_name: 'Faris Rahiman',
  third_team: 'Qayrawani Qaza',
  third_photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop',
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
const ZOOM_LEVELS = [0.25, 0.45, 0.60, 0.75, 1.0]

export default function AdminPosterEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedLayerId, setSelectedLayerId] = useState(null)
  const [zoom, setZoom] = useState(0.45)
  const [showGrid, setShowGrid] = useState(false)
  const [sampleData, setSampleData] = useState(SAMPLE_PREVIEW_DATA)
  const [showSamplePanel, setShowSamplePanel] = useState(false)
  const [bgTab, setBgTab] = useState('gradient')
  const [uploadingBg, setUploadingBg] = useState(false)
  const [dragState, setDragState] = useState(null)
  const [snapGuides, setSnapGuides] = useState({ x: null, y: null })

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

  // Keyboard Navigation: Arrow keys (1px / 10px with Shift), Delete, Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['input', 'textarea', 'select'].includes(document.activeElement.tagName.toLowerCase())) return

      if (e.key === 'Escape') {
        setSelectedLayerId(null)
        return
      }

      if (!selectedLayerId || !template) return

      if (e.key === 'Delete') {
        deleteLayer(selectedLayerId)
        return
      }

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
            x: Math.max(-50, (l.x || 0) + dx),
            y: Math.max(-50, (l.y || 0) + dy),
          }
        })
        return { ...prev, layers }
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedLayerId, template])

  // Global MouseMove and MouseUp listeners for Direct Canvas Drag & Resize
  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e) => {
      const { type, layerId, startMouseX, startMouseY, startX, startY, startW, startH, corner } = dragState
      const dxScreen = e.clientX - startMouseX
      const dyScreen = e.clientY - startMouseY

      const dxLogical = Math.round(dxScreen / zoom)
      const dyLogical = Math.round(dyScreen / zoom)

      const canvasW = template.width || 1080
      const canvasH = template.height || 1350

      setTemplate(prev => {
        if (!prev) return prev
        const layers = prev.layers.map(l => {
          if (l.id !== layerId) return l

          if (type === 'move') {
            let newX = startX + dxLogical
            let newY = startY + dyLogical

            const layerW = l.width || 300
            const layerH = l.height || (l.type === 'image' ? 200 : (l.font_size || 24) * 1.4)

            // Boundaries: keep inside poster canvas
            newX = Math.max(-50, Math.min(canvasW - 20, newX))
            newY = Math.max(-50, Math.min(canvasH - 20, newY))

            // Snap Guides calculation (~7px tolerance)
            let guideX = null
            let guideY = null

            // Center Horizontal Snap
            if (Math.abs((newX + layerW / 2) - canvasW / 2) < 8) {
              newX = Math.round(canvasW / 2 - layerW / 2)
              guideX = canvasW / 2
            } else if (Math.abs(newX) < 8) {
              newX = 0
              guideX = 0
            } else if (Math.abs((newX + layerW) - canvasW) < 8) {
              newX = canvasW - layerW
              guideX = canvasW
            }

            // Center Vertical Snap
            if (Math.abs((newY + layerH / 2) - canvasH / 2) < 8) {
              newY = Math.round(canvasH / 2 - layerH / 2)
              guideY = canvasH / 2
            } else if (Math.abs(newY) < 8) {
              newY = 0
              guideY = 0
            } else if (Math.abs((newY + layerH) - canvasH) < 8) {
              newY = canvasH - layerH
              guideY = canvasH
            }

            setSnapGuides({ x: guideX, y: guideY })

            return { ...l, x: newX, y: newY }
          }

          if (type === 'resize') {
            let newW = startW
            let newH = startH
            let newX = startX
            let newY = startY

            const isImage = l.type === 'image'
            const aspectRatio = isImage ? (startH / startW) : 1

            if (corner === 'br') {
              newW = Math.max(40, startW + dxLogical)
              newH = isImage ? Math.round(newW * aspectRatio) : Math.max(20, startH + dyLogical)
            } else if (corner === 'bl') {
              newW = Math.max(40, startW - dxLogical)
              newX = startX + (startW - newW)
              newH = isImage ? Math.round(newW * aspectRatio) : Math.max(20, startH + dyLogical)
            } else if (corner === 'tr') {
              newW = Math.max(40, startW + dxLogical)
              newH = isImage ? Math.round(newW * aspectRatio) : Math.max(20, startH - dyLogical)
              newY = startY + (startH - newH)
            } else if (corner === 'tl') {
              newW = Math.max(40, startW - dxLogical)
              newX = startX + (startW - newW)
              newH = isImage ? Math.round(newW * aspectRatio) : Math.max(20, startH - dyLogical)
              newY = startY + (startH - newH)
            }

            return {
              ...l,
              width: newW,
              height: isImage ? newH : l.height,
              x: newX,
              y: newY,
            }
          }

          return l
        })

        return { ...prev, layers }
      })
    }

    const handleMouseUp = () => {
      setDragState(null)
      setSnapGuides({ x: null, y: null })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, zoom, template?.width, template?.height])

  if (loading || !template) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center text-[#64806F] dark:text-[#B8D9BA] bg-[#FFFFFF] dark:bg-[#092619] rounded-2xl border border-[#C8DEC9] dark:border-[#1E6339]">
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

  const addCustomTextField = () => {
    const newLayer = {
      id: `layer_${Date.now()}`,
      type: 'text',
      key: 'custom_text',
      prefix: 'Text: ',
      font_family: 'Sora',
      font_size: 32,
      font_weight: '700',
      text_align: 'center',
      color: '#FFFFFF',
      line_height: 1.2,
      width: template.width ? template.width - 160 : 920,
      x: 80,
      y: 400,
      rotation: 0,
      opacity: 100,
    }
    setTemplate(prev => ({ ...prev, layers: [...prev.layers, newLayer] }))
    setSelectedLayerId(newLayer.id)
    toast('Added text field')
  }

  const addImageElement = () => {
    const newLayer = {
      id: `layer_${Date.now()}`,
      type: 'image',
      key: 'first_photo',
      prefix: '',
      image_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop',
      width: 200,
      height: 200,
      x: (template.width || 1080) / 2 - 100,
      y: 350,
      rotation: 0,
      opacity: 100,
    }
    setTemplate(prev => ({ ...prev, layers: [...prev.layers, newLayer] }))
    setSelectedLayerId(newLayer.id)
    toast('Added image element')
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
    setUploadingBg(true)
    toast('Uploading background image...')
    try {
      const url = await uploadFrameImage(file, 'template_bgs')
      if (url) {
        setTemplate(prev => ({ ...prev, background_type: 'image', background_value: url }))
        setBgTab('image')
        toast('Background image updated!')
      } else {
        toast('Failed to upload image', 'error')
      }
    } catch (err) {
      toast('Upload error', 'error')
    } finally {
      setUploadingBg(false)
    }
  }

  const startDragMove = (e, layer) => {
    e.stopPropagation()
    setSelectedLayerId(layer.id)
    setDragState({
      type: 'move',
      layerId: layer.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: layer.x || 0,
      startY: layer.y || 0,
    })
  }

  const startResize = (e, layer, corner) => {
    e.stopPropagation()
    setSelectedLayerId(layer.id)
    setDragState({
      type: 'resize',
      layerId: layer.id,
      corner,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: layer.x || 0,
      startY: layer.y || 0,
      startW: layer.width || 300,
      startH: layer.height || (layer.type === 'image' ? 200 : (layer.font_size || 24) * 1.4),
    })
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
      {/* Sticky Header */}
      <div className="sticky top-14 lg:top-0 z-30 flex items-center justify-between gap-3 bg-[#FFFFFF] dark:bg-[#092619] backdrop-blur-md rounded-2xl p-4 border border-[#C8DEC9] dark:border-[#1E6339] shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/frames/templates')}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#F5FAF3] dark:bg-[#0D3220] hover:bg-[#E4F4E6] dark:hover:bg-[#164B2A] text-[#123B27] dark:text-[#EAF8E5] text-xs font-semibold transition"
          >
            <ArrowLeft size={16} /> Back to Templates
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#123B27] dark:text-[#EAF8E5] flex items-center gap-2">
              Template Editor <span className="text-[#64806F] dark:text-[#B8D9BA] font-normal">· {template.name}</span>
            </h2>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#0B5D35] hover:bg-[#167A43] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition shadow-sm disabled:opacity-50"
        >
          <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* 3-Column Editor Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* COLUMN 1: LEFT - LAYERS PANEL (3 cols) */}
        <div className="lg:col-span-3 bg-[#FFFFFF] dark:bg-[#092619] rounded-2xl p-4 border border-[#C8DEC9] dark:border-[#1E6339] shadow-sm space-y-4 max-h-[780px] flex flex-col justify-between overflow-hidden">
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between border-b border-[#C8DEC9] dark:border-[#1E6339] pb-2.5">
              <h3 className="font-bold text-[#123B27] dark:text-[#EAF8E5] text-sm uppercase tracking-wider flex items-center gap-1.5">
                <Type size={16} className="text-[#62C744]" /> Layers ({template.layers?.length || 0})
              </h3>
            </div>

            {/* Layer Rows */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {template.layers?.map((layer, idx) => {
                const isSelected = layer.id === selectedLayerId
                const keyMeta = ALL_AVAILABLE_KEYS.find(k => k.key === layer.key)
                const keyLabel = keyMeta?.label || layer.key

                return (
                  <div
                    key={layer.id}
                    onClick={() => setSelectedLayerId(layer.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-[#E4F4E6] dark:bg-[#164B2A] text-[#123B27] dark:text-[#EAF8E5] border-[#62C744] dark:border-[#1E6339] shadow-sm font-bold'
                        : 'bg-[#F5FAF3]/60 dark:bg-[#0D3220]/60 border-[#C8DEC9]/50 dark:border-[#1E6339]/50 hover:bg-[#E4F4E6]/50 dark:hover:bg-[#164B2A]/50 text-[#123B27] dark:text-[#EAF8E5]'
                    }`}
                  >
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      {layer.type === 'image' ? (
                        <ImageIcon size={15} className="text-[#62C744] shrink-0" />
                      ) : (
                        <Type size={15} className="text-[#167A43] shrink-0" />
                      )}
                      <span className="truncate font-semibold">{layer.prefix}{keyLabel}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => moveLayer(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 hover:text-[#62C744] text-[#64806F] dark:text-[#B8D9BA] disabled:opacity-20 transition"
                        title="Move Up"
                      >
                        <MoveUp size={12} />
                      </button>
                      <button
                        onClick={() => moveLayer(idx, 1)}
                        disabled={idx === template.layers.length - 1}
                        className="p-1 hover:text-[#62C744] text-[#64806F] dark:text-[#B8D9BA] disabled:opacity-20 transition"
                        title="Move Down"
                      >
                        <MoveDown size={12} />
                      </button>
                      <button
                        onClick={() => deleteLayer(layer.id)}
                        className="p-1 text-red-400 hover:text-red-500 transition"
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

          {/* Add Layer Buttons at Bottom of Left Panel */}
          <div className="pt-2 border-t border-[#C8DEC9] dark:border-[#1E6339] space-y-2 shrink-0">
            <button
              onClick={addCustomTextField}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-[#0B5D35]/15 dark:bg-[#167A43]/20 hover:bg-[#0B5D35] hover:text-white text-[#0B5D35] dark:text-[#65D13E] border border-[#0B5D35]/30 text-xs font-bold py-2.5 rounded-xl transition"
            >
              <Plus size={14} /> Add Text
            </button>
            <button
              onClick={addImageElement}
              className="w-full inline-flex items-center justify-center gap-1.5 bg-[#F5FAF3] dark:bg-[#0D3220] hover:bg-[#E4F4E6] dark:hover:bg-[#164B2A] text-[#123B27] dark:text-[#EAF8E5] border border-[#C8DEC9] dark:border-[#1E6339] text-xs font-semibold py-2.5 rounded-xl transition"
            >
              <Plus size={14} /> Add Image
            </button>
          </div>
        </div>

        {/* COLUMN 2: CENTER - LIVE POSTER CANVAS (6 cols) */}
        <div className="lg:col-span-6 bg-[#FFFFFF] dark:bg-[#092619] rounded-2xl p-4 border border-[#C8DEC9] dark:border-[#1E6339] shadow-sm space-y-3 flex flex-col items-center justify-between min-h-[620px] overflow-hidden">
          
          {/* Header Controls: Canvas Size, Zoom & Grid */}
          <div className="w-full flex flex-wrap items-center justify-between gap-2 border-b border-[#C8DEC9] dark:border-[#1E6339] pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#123B27] dark:text-[#EAF8E5] uppercase tracking-wider">
                LIVE PREVIEW
              </span>
              <span className="text-[11px] font-mono text-[#64806F] dark:text-[#B8D9BA]">
                ({canvasWidth} × {canvasHeight} px)
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Grid Toggle */}
              <button
                onClick={() => setShowGrid(g => !g)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  showGrid
                    ? 'bg-[#0B5D35] text-white border-[#0B5D35]'
                    : 'bg-[#F5FAF3] dark:bg-[#0D3220] border-[#C8DEC9] dark:border-[#1E6339] text-[#64806F] dark:text-[#B8D9BA] hover:text-[#123B27]'
                }`}
                title="Toggle Grid Lines"
              >
                <Grid size={13} /> {showGrid ? 'Grid ON' : 'Grid OFF'}
              </button>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1 bg-[#F5FAF3] dark:bg-[#0D3220] rounded-xl p-1 border border-[#C8DEC9] dark:border-[#1E6339]">
                <button
                  onClick={() => {
                    const currIdx = ZOOM_LEVELS.indexOf(zoom)
                    if (currIdx > 0) setZoom(ZOOM_LEVELS[currIdx - 1])
                    else setZoom(z => Math.max(0.2, z - 0.05))
                  }}
                  className="p-1.5 hover:bg-[#E4F4E6] dark:hover:bg-[#164B2A] rounded-lg text-[#123B27] dark:text-[#EAF8E5]"
                  title="Zoom Out"
                >
                  <ZoomOut size={14} />
                </button>

                <select
                  value={zoom}
                  onChange={e => setZoom(Number(e.target.value))}
                  className="bg-transparent text-xs font-mono font-bold text-[#123B27] dark:text-[#EAF8E5] outline-none cursor-pointer px-1"
                >
                  {ZOOM_LEVELS.map(z => (
                    <option key={z} value={z} className="bg-white dark:bg-[#092619] text-[#123B27] dark:text-[#EAF8E5]">
                      {Math.round(z * 100)}%
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => {
                    const currIdx = ZOOM_LEVELS.indexOf(zoom)
                    if (currIdx !== -1 && currIdx < ZOOM_LEVELS.length - 1) setZoom(ZOOM_LEVELS[currIdx + 1])
                    else setZoom(z => Math.min(1.2, z + 0.05))
                  }}
                  className="p-1.5 hover:bg-[#E4F4E6] dark:hover:bg-[#164B2A] rounded-lg text-[#123B27] dark:text-[#EAF8E5]"
                  title="Zoom In"
                >
                  <ZoomIn size={14} />
                </button>
                
                <button
                  onClick={() => setZoom(0.45)}
                  className="p-1.5 hover:bg-[#E4F4E6] dark:hover:bg-[#164B2A] rounded-lg text-[#123B27] dark:text-[#EAF8E5] text-[11px] font-bold px-2"
                >
                  Fit
                </button>
              </div>
            </div>
          </div>

          {/* Centered Poster Canvas Workspace */}
          <div className="w-full flex-1 flex items-center justify-center p-4 overflow-auto min-h-[480px] bg-[#F4FAF3] dark:bg-[#061B10] rounded-xl border border-[#C8DEC9]/60 dark:border-[#1E6339]/60">
            <div
              ref={canvasRef}
              className="relative shadow-2xl rounded-lg overflow-hidden transition-all duration-75 border border-white/20 shrink-0 select-none"
              style={{
                width: `${canvasWidth * zoom}px`,
                height: `${canvasHeight * zoom}px`,
                ...canvasBgStyle,
              }}
            >
              {/* Optional Grid Overlay */}
              {showGrid && (
                <div
                  className="absolute inset-0 pointer-events-none z-10"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)`,
                    backgroundSize: `${100 * zoom}px ${100 * zoom}px`,
                  }}
                />
              )}

              {/* Snap Guide Lines */}
              {snapGuides.x !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-[#62C744] shadow z-40 pointer-events-none"
                  style={{ left: `${snapGuides.x * zoom}px` }}
                />
              )}
              {snapGuides.y !== null && (
                <div
                  className="absolute left-0 right-0 h-0.5 bg-[#62C744] shadow z-40 pointer-events-none"
                  style={{ top: `${snapGuides.y * zoom}px` }}
                />
              )}

              {/* Render Poster Layers */}
              {template.layers?.map(layer => {
                const isSelected = layer.id === selectedLayerId
                const scaledX = (layer.x || 0) * zoom
                const scaledY = (layer.y || 0) * zoom
                const scaledW = (layer.width || 300) * zoom
                const scaledFontSize = (layer.font_size || 24) * zoom

                return (
                  <div
                    key={layer.id}
                    onMouseDown={(e) => startDragMove(e, layer)}
                    className={`absolute group transition-shadow ${
                      isSelected
                        ? 'ring-2 ring-[#62C744] border-2 border-[#62C744] shadow-2xl z-30 cursor-move'
                        : 'hover:outline hover:outline-1 hover:outline-white/50 z-20 cursor-pointer'
                    }`}
                    style={{
                      left: `${scaledX}px`,
                      top: `${scaledY}px`,
                      width: `${scaledW}px`,
                      textAlign: layer.text_align || 'center',
                      transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                      opacity: layer.opacity != null ? layer.opacity / 100 : 1,
                    }}
                  >
                    {layer.type === 'image' ? (
                      <img
                        src={sampleData[layer.key] || layer.image_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop'}
                        alt="Layer Element"
                        className="object-contain rounded-lg shadow pointer-events-none"
                        style={{
                          width: `${(layer.width || 200) * zoom}px`,
                          height: `${(layer.height || 200) * zoom}px`,
                        }}
                      />
                    ) : (
                      <div
                        className="pointer-events-none"
                        style={{
                          fontFamily: layer.font_family || 'Sora',
                          fontSize: `${scaledFontSize}px`,
                          fontWeight: layer.font_weight || '700',
                          color: layer.color || '#FFFFFF',
                          lineHeight: layer.line_height || 1.2,
                          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                        }}
                      >
                        {getLayerRenderText(layer)}
                      </div>
                    )}

                    {/* Corner Resize Handles for Selected Element */}
                    {isSelected && (
                      <>
                        <div
                          onMouseDown={(e) => startResize(e, layer, 'tl')}
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0B5D35] rounded-sm shadow z-50 cursor-nwse-resize hover:scale-125 transition-transform"
                          title="Resize Top-Left"
                        />
                        <div
                          onMouseDown={(e) => startResize(e, layer, 'tr')}
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0B5D35] rounded-sm shadow z-50 cursor-nesw-resize hover:scale-125 transition-transform"
                          title="Resize Top-Right"
                        />
                        <div
                          onMouseDown={(e) => startResize(e, layer, 'bl')}
                          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0B5D35] rounded-sm shadow z-50 cursor-nesw-resize hover:scale-125 transition-transform"
                          title="Resize Bottom-Left"
                        />
                        <div
                          onMouseDown={(e) => startResize(e, layer, 'br')}
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-[#0B5D35] rounded-sm shadow z-50 cursor-nwse-resize hover:scale-125 transition-transform"
                          title="Resize Bottom-Right"
                        />
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Example Poster Data for Preview Testing Drawer */}
          <div className="w-full border-t border-[#C8DEC9] dark:border-[#1E6339] pt-3">
            <button
              onClick={() => setShowSamplePanel(v => !v)}
              className="w-full flex items-center justify-between text-xs font-bold text-[#123B27] dark:text-[#EAF8E5] hover:text-[#62C744] transition"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#62C744]" /> Example Poster Data for Preview
              </span>
              {showSamplePanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showSamplePanel && (
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs max-h-48 overflow-y-auto p-3 bg-[#F5FAF3] dark:bg-[#0D3220] rounded-xl border border-[#C8DEC9] dark:border-[#1E6339]">
                {Object.keys(SAMPLE_PREVIEW_DATA).map(key => (
                  <div key={key}>
                    <label className="text-[10px] text-[#64806F] dark:text-[#B8D9BA] block font-mono capitalize mb-0.5">{key}</label>
                    <input
                      type="text"
                      value={sampleData[key] || ''}
                      onChange={e => setSampleData(s => ({ ...s, [key]: e.target.value }))}
                      className="w-full bg-[#FFFFFF] dark:bg-[#092619] border border-[#C8DEC9] dark:border-[#1E6339] rounded-lg px-2 py-1 text-xs text-[#123B27] dark:text-[#EAF8E5] focus:outline-none focus:border-[#62C744]"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: RIGHT - TEMPLATE CONFIGURATION & SELECTED LAYER PROPERTIES (3 cols) */}
        <div className="lg:col-span-3 space-y-4 max-h-[780px] overflow-y-auto pr-1">
          
          {/* Card 1: TEMPLATE CONFIGURATION */}
          <div className="bg-[#FFFFFF] dark:bg-[#092619] rounded-2xl p-4 border border-[#C8DEC9] dark:border-[#1E6339] shadow-sm space-y-4">
            <h3 className="font-bold text-[#123B27] dark:text-[#EAF8E5] text-xs uppercase tracking-wider border-b border-[#C8DEC9] dark:border-[#1E6339] pb-2">
              Template Configuration
            </h3>

            {/* Template Name */}
            <div>
              <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Template Name</label>
              <input
                type="text"
                value={template.name || ''}
                onChange={e => setTemplate(t => ({ ...t, name: e.target.value }))}
                className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs font-semibold text-[#123B27] dark:text-[#EAF8E5] focus:outline-none focus:border-[#62C744]"
              />
            </div>

            {/* Canvas Dimensions */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Width (px)</label>
                <input
                  type="number"
                  value={template.width || 1080}
                  onChange={e => setTemplate(t => ({ ...t, width: Number(e.target.value) }))}
                  className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs font-semibold text-[#123B27] dark:text-[#EAF8E5] focus:outline-none focus:border-[#62C744]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Height (px)</label>
                <input
                  type="number"
                  value={template.height || 1350}
                  onChange={e => setTemplate(t => ({ ...t, height: Number(e.target.value) }))}
                  className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs font-semibold text-[#123B27] dark:text-[#EAF8E5] focus:outline-none focus:border-[#62C744]"
                />
              </div>
            </div>

            {/* Background Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block">Background</label>

              <div className="grid grid-cols-3 gap-1 bg-[#F5FAF3] dark:bg-[#0D3220] p-1 rounded-xl border border-[#C8DEC9] dark:border-[#1E6339] text-xs">
                {['gradient', 'solid', 'image'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => {
                      setBgTab(tab)
                      setTemplate(t => ({ ...t, background_type: tab }))
                    }}
                    className={`py-1 rounded-lg font-semibold capitalize transition ${
                      bgTab === tab ? 'bg-[#0B5D35] text-white shadow-sm' : 'text-[#64806F] dark:text-[#B8D9BA] hover:text-[#123B27]'
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
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs font-mono text-[#123B27] dark:text-[#EAF8E5]"
                    placeholder="#061A0D"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={template.background_value?.startsWith('#') ? template.background_value : '#061A0D'}
                      onChange={e => setTemplate(t => ({ ...t, background_value: e.target.value }))}
                      className="w-8 h-8 rounded-lg border-0 cursor-pointer"
                    />
                    <span className="text-xs text-[#64806F] dark:text-[#B8D9BA]">Solid Hex Color</span>
                  </div>
                </div>
              )}

              {bgTab === 'gradient' && (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={2}
                    value={template.background_value || ''}
                    onChange={e => setTemplate(t => ({ ...t, background_value: e.target.value }))}
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs font-mono text-[#123B27] dark:text-[#EAF8E5] focus:outline-none"
                    placeholder="linear-gradient(...)"
                  />
                  <p className="text-[10px] text-[#64806F] dark:text-[#B8D9BA] font-semibold">Preset Gradients:</p>
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
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                    placeholder="Storage Image URL"
                  />
                  <label className="inline-flex items-center justify-center gap-1.5 w-full bg-[#0B5D35] text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer hover:bg-[#167A43] transition shadow-sm">
                    <ImageIcon size={14} /> {uploadingBg ? 'Uploading Image...' : 'Upload Background'}
                    <input type="file" accept="image/*" onChange={handleBgImageUpload} className="hidden" />
                  </label>
                </div>
              )}
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#0B5D35] hover:bg-[#167A43] text-white font-bold text-xs py-3 rounded-xl transition shadow-sm disabled:opacity-50"
            >
              <Save size={16} /> {saving ? 'Saving...' : 'Save Template Changes'}
            </button>
          </div>

          {/* Card 2: SELECTED LAYER PROPERTY EDITOR */}
          {selectedLayer && (
            <div className="bg-[#FFFFFF] dark:bg-[#092619] rounded-2xl p-4 border-2 border-[#62C744] shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-[#C8DEC9] dark:border-[#1E6339] pb-2">
                <h3 className="font-bold text-[#123B27] dark:text-[#EAF8E5] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={14} className="text-[#62C744]" /> Selected Layer
                </h3>
                <span className="text-[10px] text-[#62C744] font-bold uppercase">{selectedLayer.type}</span>
              </div>

              {/* Layer/Binding */}
              <div>
                <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Layer / Binding</label>
                <select
                  value={selectedLayer.key || 'custom_text'}
                  onChange={e => updateSelectedLayer('key', e.target.value)}
                  className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                >
                  {ALL_AVAILABLE_KEYS.map(k => (
                    <option key={k.key} value={k.key}>{k.label}</option>
                  ))}
                </select>
              </div>

              {selectedLayer.type === 'text' ? (
                <>
                  {/* Prefix */}
                  <div>
                    <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Prefix</label>
                    <input
                      type="text"
                      value={selectedLayer.prefix || ''}
                      onChange={e => updateSelectedLayer('prefix', e.target.value)}
                      className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                      placeholder="Prefix text..."
                    />
                  </div>

                  {/* Font Family & Weight */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Font Family</label>
                      <select
                        value={selectedLayer.font_family || 'Sora'}
                        onChange={e => updateSelectedLayer('font_family', e.target.value)}
                        className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-2 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                      >
                        {FONT_FAMILIES.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Font Weight</label>
                      <select
                        value={selectedLayer.font_weight || '700'}
                        onChange={e => updateSelectedLayer('font_weight', e.target.value)}
                        className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-2 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                      >
                        <option value="400">Normal</option>
                        <option value="600">SemiBold</option>
                        <option value="700">Bold</option>
                        <option value="800">Extrabold</option>
                      </select>
                    </div>
                  </div>

                  {/* Font Size & Alignment */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Font Size (px)</label>
                      <input
                        type="number"
                        value={selectedLayer.font_size || 24}
                        onChange={e => updateSelectedLayer('font_size', Number(e.target.value))}
                        className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Alignment</label>
                      <div className="grid grid-cols-3 gap-1 bg-[#F5FAF3] dark:bg-[#0D3220] p-1 rounded-xl border border-[#C8DEC9] dark:border-[#1E6339]">
                        {[
                          { val: 'left', icon: AlignLeft },
                          { val: 'center', icon: AlignCenter },
                          { val: 'right', icon: AlignRight },
                        ].map(align => {
                          const AlignIcon = align.icon
                          const isAct = (selectedLayer.text_align || 'center') === align.val
                          return (
                            <button
                              key={align.val}
                              onClick={() => updateSelectedLayer('text_align', align.val)}
                              className={`p-1 rounded-lg flex items-center justify-center transition ${
                                isAct ? 'bg-[#0B5D35] text-white shadow-sm' : 'text-[#64806F] dark:text-[#B8D9BA]'
                              }`}
                            >
                              <AlignIcon size={14} />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Color & Line Height */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Color</label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={selectedLayer.color || '#FFFFFF'}
                          onChange={e => updateSelectedLayer('color', e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-0 shrink-0"
                        />
                        <input
                          type="text"
                          value={selectedLayer.color || '#FFFFFF'}
                          onChange={e => updateSelectedLayer('color', e.target.value)}
                          className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-lg px-2 py-1.5 text-xs font-mono text-[#123B27] dark:text-[#EAF8E5]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Line Height</label>
                      <input
                        type="number"
                        step="0.1"
                        value={selectedLayer.line_height || 1.2}
                        onChange={e => updateSelectedLayer('line_height', Number(e.target.value))}
                        className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Image Source / Upload */}
                  <div>
                    <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Image URL</label>
                    <input
                      type="text"
                      value={selectedLayer.image_url || ''}
                      onChange={e => updateSelectedLayer('image_url', e.target.value)}
                      className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-2 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                      placeholder="https://..."
                    />
                  </div>
                </>
              )}

              {/* Position & Size */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#C8DEC9] dark:border-[#1E6339]">
                <div>
                  <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Width (px)</label>
                  <input
                    type="number"
                    value={selectedLayer.width || 300}
                    onChange={e => updateSelectedLayer('width', Number(e.target.value))}
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                  />
                </div>
                {selectedLayer.type === 'image' && (
                  <div>
                    <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Height (px)</label>
                    <input
                      type="number"
                      value={selectedLayer.height || 200}
                      onChange={e => updateSelectedLayer('height', Number(e.target.value))}
                      className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">X Position (px)</label>
                  <input
                    type="number"
                    value={selectedLayer.x || 0}
                    onChange={e => updateSelectedLayer('x', Number(e.target.value))}
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1">Y Position (px)</label>
                  <input
                    type="number"
                    value={selectedLayer.y || 0}
                    onChange={e => updateSelectedLayer('y', Number(e.target.value))}
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                  />
                </div>
              </div>

              {/* Rotation & Opacity */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1 flex items-center gap-1">
                    <RotateCw size={12} /> Rotation (°)
                  </label>
                  <input
                    type="number"
                    value={selectedLayer.rotation || 0}
                    onChange={e => updateSelectedLayer('rotation', Number(e.target.value))}
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#64806F] dark:text-[#B8D9BA] block mb-1 flex items-center gap-1">
                    <Eye size={12} /> Opacity (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={selectedLayer.opacity != null ? selectedLayer.opacity : 100}
                    onChange={e => updateSelectedLayer('opacity', Number(e.target.value))}
                    className="w-full bg-[#F5FAF3] dark:bg-[#0D3220] border border-[#C8DEC9] dark:border-[#1E6339] rounded-xl px-3 py-1.5 text-xs text-[#123B27] dark:text-[#EAF8E5]"
                  />
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  )
}
