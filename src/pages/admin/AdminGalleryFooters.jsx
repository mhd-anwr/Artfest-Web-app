import { useEffect, useState } from 'react'
import {
  getGalleryFooters,
  createGalleryFooter,
  setActiveGalleryFooter,
  deleteGalleryFooter,
  uploadFrameImage,
} from '../../supabase/queries'
import { clearCompositorCache } from '../../utils/imageCompositor'
import { Plus, Trash2, CheckCircle, Image as ImageIcon, PanelBottom, X, Sparkles } from 'lucide-react'
import { useToast } from '../../components/Toast'

export default function AdminGalleryFooters() {
  const [footers, setFooters] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const toast = useToast()

  const loadFooters = async () => {
    try {
      setLoading(true)
      const data = await getGalleryFooters()
      setFooters(data || [])
    } catch (e) {
      toast('Failed to load gallery footers', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFooters()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim()) return toast('Please enter a footer name', 'error')
    if (!file) return toast('Please select a transparent PNG image', 'error')

    setUploading(true)
    try {
      const imageUrl = await uploadFrameImage(file, 'gallery_footers')
      if (!imageUrl) throw new Error('Upload returned empty URL')

      await createGalleryFooter({ name: name.trim(), image_url: imageUrl })
      clearCompositorCache()
      toast('Gallery footer created successfully!')
      setName('')
      setFile(null)
      setModalOpen(false)
      loadFooters()
    } catch (err) {
      toast('Failed to create footer', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleToggleActive = async (id, isCurrentlyActive) => {
    if (isCurrentlyActive) return
    try {
      await setActiveGalleryFooter(id)
      clearCompositorCache()
      toast('Active gallery footer updated!')
      loadFooters()
    } catch (e) {
      toast('Failed to update active footer', 'error')
    }
  }

  const handleDelete = async (id, footerName) => {
    if (!window.confirm(`Delete gallery footer overlay "${footerName}"?`)) return
    try {
      await deleteGalleryFooter(id)
      clearCompositorCache()
      toast('Gallery footer deleted')
      loadFooters()
    } catch (e) {
      toast('Failed to delete gallery footer', 'error')
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card rounded-2xl p-6 shadow-sm border border-secondary/30">
        <div>
          <h2 className="text-2xl font-brand font-bold text-mainText flex items-center gap-2">
            <PanelBottom className="text-accent" size={26} /> Gallery Footer Overlays
          </h2>
          <p className="text-mutedText text-sm mt-1">
            Upload transparent PNG frame overlays to display near the bottom of all photos in the Gallery
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 bg-primary text-white rounded-xl px-5 py-3 font-semibold hover:opacity-90 transition shadow-sm shrink-0 text-sm"
        >
          <Plus size={18} /> New Footer
        </button>
      </div>

      {/* List / Grid */}
      {loading ? (
        <div className="bg-card rounded-2xl p-12 text-center text-mutedText border border-secondary/30">
          Loading gallery footers...
        </div>
      ) : footers.length === 0 ? (
        <div className="bg-card rounded-2xl p-12 text-center border border-secondary/30 space-y-4">
          <Sparkles className="mx-auto text-accent" size={40} />
          <h3 className="text-lg font-bold text-mainText">No Gallery Footer Overlays</h3>
          <p className="text-mutedText text-sm max-w-md mx-auto">
            Upload a transparent PNG banner or footer strip to automatically overlay onto public gallery photos.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-white rounded-xl px-5 py-2.5 font-semibold text-sm hover:opacity-90 transition"
          >
            <Plus size={16} /> Upload New Footer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {footers.map(f => (
            <div
              key={f.id}
              className={`bg-card rounded-2xl overflow-hidden border transition flex flex-col justify-between ${
                f.is_active ? 'border-accent ring-2 ring-accent/30 shadow-md' : 'border-secondary/30 shadow-sm'
              }`}
            >
              {/* Image Preview Box */}
              <div className="relative aspect-[16/9] bg-black/80 flex items-center justify-center p-4 overflow-hidden border-b border-secondary/20">
                <img
                  src={f.image_url}
                  alt={f.name}
                  className="max-h-full max-w-full object-contain drop-shadow"
                />
                {f.is_active && (
                  <span className="absolute top-3 right-3 bg-primary text-white text-[10px] font-extrabold px-3 py-1 rounded-full flex items-center gap-1 shadow">
                    <CheckCircle size={12} /> ACTIVE OVERLAY
                  </span>
                )}
              </div>

              {/* Card Footer */}
              <div className="p-4 space-y-3">
                <h3 className="font-bold text-mainText text-base truncate">{f.name}</h3>
                <div className="flex items-center gap-2 pt-2 border-t border-secondary/20">
                  <button
                    onClick={() => handleToggleActive(f.id, f.is_active)}
                    className={`flex-1 text-xs font-semibold py-2 px-3 rounded-xl transition ${
                      f.is_active
                        ? 'bg-primary/20 text-accent cursor-default'
                        : 'bg-secondary/20 text-mainText hover:bg-primary hover:text-white'
                    }`}
                  >
                    {f.is_active ? 'Active' : 'Set as Active'}
                  </button>
                  <button
                    onClick={() => handleDelete(f.id, f.name)}
                    className="p-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500/25 transition text-xs font-semibold"
                    title="Delete Footer"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Footer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card w-full max-w-md rounded-2xl border border-secondary/30 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-secondary/20 pb-3">
              <h3 className="text-lg font-bold text-mainText flex items-center gap-2">
                <ImageIcon className="text-accent" size={20} /> Upload Gallery Footer Image
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-mutedText hover:text-mainText">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-mutedText block mb-1">Footer Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rendezvous 2026 Official Frame"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-mainBackground border border-secondary/30 rounded-xl px-3 py-2.5 text-sm text-mainText focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-mutedText block mb-1">
                  Transparent PNG Overlay Image
                </label>
                <input
                  type="file"
                  required
                  accept="image/png,image/webp"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-mutedText file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:opacity-90"
                />
                <p className="text-[11px] text-mutedText mt-1">
                  PNG format with transparent background is recommended.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-secondary/30 text-xs font-semibold text-mainText hover:bg-secondary/15 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Save Footer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
