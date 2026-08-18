import { useEffect, useState } from 'react'
import { supabase } from '../../supabase/client'
import { getSpotlight } from '../../supabase/queries'
import { Upload, ToggleLeft, ToggleRight, X, Pencil, Trash2 } from 'lucide-react'
import KebabMenu from '../../components/KebabMenu'
import { useToast } from '../../components/Toast'

const NEW_ALBUM = '__new__'

const resolveAlbum = (value, newValue) => (value === NEW_ALBUM ? newValue.trim() : (value || '').trim())

function AlbumPicker({ albums, value, newValue, onValue, onNewValue, label }) {
  const isNew = value === NEW_ALBUM
  return (
    <>
      {label && <label className="text-mutedText text-sm block mb-1.5 font-semibold">{label}</label>}
      <select
        className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
        value={isNew ? NEW_ALBUM : value || ''}
        onChange={e => onValue(e.target.value)}
      >
        <option value="">No album</option>
        {albums.map(a => (
          <option key={a} value={a}>{a}</option>
        ))}
        <option value={NEW_ALBUM}>+ Create new album...</option>
      </select>
      {isNew && (
        <input
          className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
          placeholder="New album name (e.g. Day 1)"
          value={newValue}
          onChange={e => onNewValue(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
        />
      )}
    </>
  )
}

export default function AdminSpotlight() {
  const [images, setImages] = useState([])
  const [files, setFiles] = useState([])
  const [caption, setCaption] = useState('')
  const [album, setAlbum] = useState('')
  const [newAlbum, setNewAlbum] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [editing, setEditing] = useState(null)
  const [editCaption, setEditCaption] = useState('')
  const [editAlbum, setEditAlbum] = useState('')
  const [editNewAlbum, setEditNewAlbum] = useState('')
  const toast = useToast()

  const load = () => getSpotlight().then(setImages)
  useEffect(() => { load() }, [])

  const albums = [...new Set(images.map(i => (i.album || '').trim()).filter(Boolean))]

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return

    let combined = [...files, ...selected]
    if (combined.length > 10) {
      toast('You can upload a maximum of 10 images at a time.', 'error')
      combined = combined.slice(0, 10)
    }
    setFiles(combined)
    e.target.value = ''
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = async () => {
    if (files.length === 0) return toast('Select an image', 'error')
    if (files.length > 10) {
      toast('You can upload a maximum of 10 images at a time.', 'error')
      return
    }

    setUploading(true)
    let successCount = 0
    const resolvedAlbum = resolveAlbum(album, newAlbum) || null

    for (let i = 0; i < files.length; i++) {
      setUploadProgress(i + 1)
      const currentFile = files[i]
      const sanitizedName = currentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const filePath = `spotlight/${Date.now()}_${i}_${sanitizedName}`

      const { data, error: uploadErr } = await supabase.storage.from('photos').upload(filePath, currentFile)
      if (uploadErr) {
        console.error('Upload failed for file:', currentFile.name, uploadErr)
        continue
      }

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(data.path)

      const { error: dbErr } = await supabase.from('spotlight').insert({
        imageURL: urlData.publicUrl,
        caption: caption ? (files.length > 1 ? `${caption} (${i + 1})` : caption) : null,
        isFeatured: false,
        album: resolvedAlbum,
      })

      if (!dbErr) successCount++
    }

    setUploading(false)
    setUploadProgress(0)
    setFiles([])
    setCaption('')
    setAlbum('')
    setNewAlbum('')
    toast(successCount === 1 ? 'Image uploaded!' : `${successCount} images uploaded!`)
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('spotlight').delete().eq('id', id)
    load()
  }

  const toggleFeatured = async (img) => {
    const originalStatus = img.isFeatured
    setImages(prev => prev.map(i => i.id === img.id ? { ...i, isFeatured: !originalStatus } : i))

    try {
      const { data: updated, error } = await supabase.from('spotlight').update({ isFeatured: !originalStatus }).eq('id', img.id).select('id')
      if (error) throw error
      if (!updated || updated.length === 0) throw new Error('the database rejected the update (permission denied)')
    } catch (err) {
      setImages(prev => prev.map(i => i.id === img.id ? { ...i, isFeatured: originalStatus } : i))
      toast('Failed to update featured status: ' + err.message, 'error')
    }
  }

  const startEdit = (img) => {
    setEditing(img)
    setEditCaption(img.caption || '')
    setEditAlbum(img.album || '')
    setEditNewAlbum('')
  }

  const saveEdit = async () => {
    if (!editing) return
    const { error } = await supabase
      .from('spotlight')
      .update({
        caption: editCaption.replace(/\b\w/g, c => c.toUpperCase()),
        album: resolveAlbum(editAlbum, editNewAlbum) || null,
      })
      .eq('id', editing.id)
    if (error) return toast('Failed to update: ' + error.message, 'error')
    toast('Image updated!')
    setEditing(null)
    load()
  }

  const getButtonText = () => {
    if (uploading) return `Uploading ${uploadProgress} / ${files.length}...`
    if (files.length <= 1) return 'Upload Image'
    return `Upload ${files.length} Images`
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl sm:text-2xl font-poppins font-bold text-mainText mb-2">Spotlight Manager</h2>
      <p className="text-mutedText text-sm mb-6">
        Upload photos and group them into albums. Photos marked <span className="text-accent font-semibold">Hero banner</span> appear in the home hero carousel.
      </p>

      <div className="bg-card rounded-2xl p-4 mb-6 shadow-sm border border-secondary/30">
        <h3 className="text-mainText font-bold mb-3 text-sm sm:text-base">Upload New Images (Max 10)</h3>
        
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={uploading}
          className="w-full text-mutedText mb-3 text-sm cursor-pointer file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-primary/20 file:text-mainText hover:file:bg-primary/30"
          onChange={handleFileChange}
        />

        {files.length > 0 && (
          <div className="mb-3 bg-black/20 rounded-xl p-3 border border-secondary/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-mutedText text-xs font-semibold">{files.length} / 10 images selected</span>
              <button
                type="button"
                onClick={() => setFiles([])}
                disabled={uploading}
                className="text-mutedText hover:text-red-400 text-xs transition"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {files.map((f, idx) => (
                <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-secondary/40 bg-black/40 shrink-0">
                  <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                  {!uploading && (
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="absolute top-0.5 right-0.5 bg-black/70 text-white rounded-full p-0.5 hover:bg-red-600 transition"
                      title="Remove image"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <input
          className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
          placeholder="Caption (optional)"
          value={caption}
          disabled={uploading}
          onChange={e => setCaption(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
        />

        <AlbumPicker
          albums={albums}
          value={album}
          newValue={newAlbum}
          onValue={setAlbum}
          onNewValue={setNewAlbum}
          label="Album"
        />

        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className="w-full bg-primary text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2 text-sm sm:text-base hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload size={16} className="sm:w-[18px] sm:h-[18px]" /> {getButtonText()}
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {images.length === 0 && <p className="text-mutedText text-center text-sm py-6">No images uploaded yet.</p>}
        {images.map(img => (
          <div key={img.id} className="bg-card rounded-xl p-3 flex items-center gap-3 shadow-sm border border-secondary/30">
            <img src={img.imageURL} className="w-14 h-10 sm:w-16 sm:h-12 rounded-lg object-cover shrink-0" alt="" />
            <div className="flex-1 min-w-0">
              <p className="text-mainText text-xs sm:text-sm truncate">{img.caption || 'No caption'}</p>
              <p className="text-mutedText text-[10px] sm:text-xs truncate">
                {img.album ? <span className="text-oceanTint font-semibold">{img.album}</span> : 'No album'}
                {' · '}
                {img.isFeatured ? 'Hero banner' : 'Gallery only'}
              </p>
            </div>
            <button
              onClick={() => toggleFeatured(img)}
              className={img.isFeatured ? 'text-mainText shrink-0' : 'text-mutedText shrink-0'}
              title={img.isFeatured ? 'Remove from hero' : 'Show in hero banner'}
            >
              {img.isFeatured ? <ToggleRight size={18} className="sm:w-5 sm:h-5" /> : <ToggleLeft size={18} className="sm:w-5 sm:h-5" />}
            </button>
            <KebabMenu
              items={[
                { label: 'Edit', icon: <Pencil size={15} />, onClick: () => startEdit(img) },
                { label: 'Delete', icon: <Trash2 size={15} />, danger: true, onClick: () => handleDelete(img.id) },
              ]}
            />
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-2xl border border-secondary/30" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-mainText font-bold text-lg">Edit Image</h3>
              <button onClick={() => setEditing(null)} className="text-mutedText hover:text-mainText transition">
                <X size={20} />
              </button>
            </div>
            <img src={editing.imageURL} alt="" className="w-full h-40 object-cover rounded-xl mb-4 border border-secondary/30" />
            <label className="text-mutedText text-sm block mb-1.5 font-semibold">Caption</label>
            <input
              className="w-full bg-black/20 text-mainText rounded-xl p-3 mb-3 outline-none border border-secondary/40 focus:border-mainText text-sm sm:text-base"
              placeholder="Caption (optional)"
              value={editCaption}
              onChange={e => setEditCaption(e.target.value.replace(/\b\w/g, c => c.toUpperCase()))}
            />
            <AlbumPicker
              albums={albums}
              value={editAlbum}
              newValue={editNewAlbum}
              onValue={setEditAlbum}
              onNewValue={setEditNewAlbum}
              label="Album"
            />
            <button onClick={saveEdit} className="w-full bg-primary text-white rounded-xl p-3 font-semibold hover:bg-primary/90 transition">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
