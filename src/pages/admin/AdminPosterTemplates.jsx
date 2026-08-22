import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPosterTemplates,
  savePosterTemplate,
  deletePosterTemplate,
  duplicatePosterTemplate,
} from '../../supabase/queries'
import { Plus, Pencil, Copy, Trash2, LayoutTemplate, Sparkles } from 'lucide-react'
import { useToast } from '../../components/Toast'

export default function AdminPosterTemplates() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const toast = useToast()

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await getPosterTemplates()
      setTemplates(data || [])
    } catch (e) {
      toast('Failed to load templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleCreateNew = async () => {
    const newTemplate = {
      name: `Poster Template ${templates.length + 1}`,
      type: 'Program Result Poster',
      width: 1080,
      height: 1350,
      background_type: 'gradient',
      background_value: 'linear-gradient(135deg, #061A0D 0%, #115F32 100%)',
      layers: [
        { id: 'l3', type: 'text', key: 'result_no', prefix: 'RESULT #', font_family: 'Sora', font_size: 28, font_weight: '700', text_align: 'left', color: '#71C247', line_height: 1.2, width: 900, x: 133, y: 248 },
        { id: 'l2', type: 'text', key: 'programme_name', prefix: '', font_family: 'Sora', font_size: 52, font_weight: '800', text_align: 'left', color: '#D4FFB8', line_height: 1.2, width: 977, x: 130, y: 276 },
        { id: 'l1', type: 'text', key: 'category', prefix: '', font_family: 'Sora', font_size: 24, font_weight: '700', text_align: 'left', color: '#8ED06C', line_height: 1.2, width: 364, x: 133, y: 336 },

        { id: 'l4', type: 'text', key: 'first_place_label', prefix: '', font_family: 'Sora', font_size: 38, font_weight: '800', text_align: 'left', color: '#D4FFB8', line_height: 1.2, width: 140, x: 133, y: 480 },
        { id: 'l5', type: 'text', key: 'first_name', prefix: '', font_family: 'Sora', font_size: 38, font_weight: '800', text_align: 'left', color: '#FFFFFF', line_height: 1.2, width: 750, x: 320, y: 480 },
        { id: 'l6', type: 'text', key: 'first_team', prefix: '', font_family: 'Sora', font_size: 24, font_weight: '600', text_align: 'left', color: '#8ED06C', line_height: 1.2, width: 750, x: 320, y: 525 },

        { id: 'l7', type: 'text', key: 'second_place_label', prefix: '', font_family: 'Sora', font_size: 38, font_weight: '800', text_align: 'left', color: '#D4FFB8', line_height: 1.2, width: 140, x: 133, y: 630 },
        { id: 'l8', type: 'text', key: 'second_name', prefix: '', font_family: 'Sora', font_size: 38, font_weight: '800', text_align: 'left', color: '#FFFFFF', line_height: 1.2, width: 750, x: 320, y: 630 },
        { id: 'l9', type: 'text', key: 'second_team', prefix: '', font_family: 'Sora', font_size: 24, font_weight: '600', text_align: 'left', color: '#8ED06C', line_height: 1.2, width: 750, x: 320, y: 675 },

        { id: 'l10', type: 'text', key: 'third_place_label', prefix: '', font_family: 'Sora', font_size: 38, font_weight: '800', text_align: 'left', color: '#D4FFB8', line_height: 1.2, width: 140, x: 133, y: 780 },
        { id: 'l11', type: 'text', key: 'third_name', prefix: '', font_family: 'Sora', font_size: 38, font_weight: '800', text_align: 'left', color: '#FFFFFF', line_height: 1.2, width: 750, x: 320, y: 780 },
        { id: 'l12', type: 'text', key: 'third_team', prefix: '', font_family: 'Sora', font_size: 24, font_weight: '600', text_align: 'left', color: '#8ED06C', line_height: 1.2, width: 750, x: 320, y: 825 },

        { id: 'l13', type: 'text', key: 'festival_footer', prefix: "RENDEZVOUS '26 ART FESTIVAL", font_family: 'Sora', font_size: 20, font_weight: '700', text_align: 'center', color: '#4EBA16', line_height: 1.2, width: 900, x: 90, y: 1220 },
      ],
    }
    const saved = await savePosterTemplate(newTemplate)
    toast('Created new poster template!')
    navigate(`/admin/frames/templates/${saved.id}/edit`)
  }

  const handleDuplicate = async (id) => {
    const dup = await duplicatePosterTemplate(id)
    if (dup) {
      toast('Template duplicated!')
      loadTemplates()
    } else {
      toast('Failed to duplicate template', 'error')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete template "${name}"?`)) return
    await deletePosterTemplate(id)
    toast('Template deleted')
    loadTemplates()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card rounded-2xl p-6 shadow-sm border border-secondary/30">
        <div>
          <h2 className="text-2xl font-brand font-bold text-mainText flex items-center gap-2">
            <LayoutTemplate className="text-accent" size={26} /> Poster Templates
          </h2>
          <p className="text-mutedText text-sm mt-1">
            Design and customize poster templates for auto-generating result posters
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-5 py-3 font-semibold hover:opacity-90 transition shadow-sm shrink-0 text-sm"
        >
          <Plus size={18} /> Create New Template
        </button>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="bg-card rounded-2xl p-12 text-center text-mutedText border border-secondary/30">
          Loading poster templates...
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center border border-secondary/30 space-y-4">
          <Sparkles className="mx-auto text-accent" size={40} />
          <h3 className="text-lg font-bold text-mainText">No Poster Templates Found</h3>
          <p className="text-mutedText text-sm max-w-md mx-auto">
            Create your first poster template to start auto-generating beautiful result posters for winners.
          </p>
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 font-semibold text-sm hover:opacity-90 transition"
          >
            <Plus size={16} /> Create Template
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl, idx) => {
            const bgStyle =
              tmpl.background_type === 'image'
                ? { backgroundImage: `url(${tmpl.background_value})`, backgroundSize: 'cover' }
                : tmpl.background_type === 'solid'
                ? { backgroundColor: tmpl.background_value }
                : { background: tmpl.background_value }

            return (
              <div
                key={tmpl.id}
                className="bg-card rounded-2xl overflow-hidden border border-secondary/30 shadow-sm hover:shadow-md transition flex flex-col group"
              >
                {/* Thumbnail Canvas Preview */}
                <div
                  className="relative aspect-[4/5] w-full p-4 flex flex-col justify-between overflow-hidden border-b border-secondary/20"
                  style={bgStyle}
                >
                  <div className="flex items-center justify-between z-10">
                    <span className="bg-black/60 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-full border border-white/20">
                      #{idx + 1} · {tmpl.width || 1080}×{tmpl.height || 1350}
                    </span>
                    <span className="bg-primary/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {(tmpl.layers || []).length} Layers
                    </span>
                  </div>

                  {/* Sample Layer Overlay Text Preview */}
                  <div className="z-10 text-center space-y-1 my-auto py-4 bg-black/30 backdrop-blur-sm rounded-xl px-3 border border-white/10">
                    <p className="text-[#8ED06C] text-[10px] font-bold tracking-wider uppercase truncate">
                      {tmpl.type || 'Program Result Poster'}
                    </p>
                    <p className="text-[#D4FFB8] text-sm font-extrabold truncate">
                      {tmpl.name}
                    </p>
                    <p className="text-[#71C247] text-[11px] font-semibold">
                      Sample Result Data Preview
                    </p>
                  </div>
                </div>

                {/* Card Info & Actions */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-mainText text-base group-hover:text-accent transition">
                      {tmpl.name}
                    </h3>
                    <p className="text-mutedText text-xs mt-0.5">
                      {tmpl.type || 'Result Poster'} · {(tmpl.layers || []).length} layers
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-secondary/20">
                    <button
                      onClick={() => navigate(`/admin/frames/templates/${tmpl.id}/edit`)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary text-white text-xs font-semibold py-2 px-3 rounded-xl hover:opacity-90 transition"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDuplicate(tmpl.id)}
                      title="Duplicate Template"
                      className="p-2 rounded-xl bg-secondary/15 text-mainText hover:bg-secondary/25 transition text-xs font-semibold"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl.id, tmpl.name)}
                      title="Delete Template"
                      className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition text-xs font-semibold"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
