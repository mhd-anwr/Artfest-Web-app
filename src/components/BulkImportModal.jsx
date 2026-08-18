import { useState } from 'react'
import { supabase } from '../supabase/client'
import { parseParticipantFile, validateParticipants } from '../utils/bulkImportParser'
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Trash2, RefreshCw } from 'lucide-react'

export default function BulkImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingStudents = [],
  existingTeams = [],
  existingCategories = [],
}) {
  const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'summary'
  const [file, setFile] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [items, setItems] = useState([])
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'errors' | 'valid'
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState({ imported: 0, skipped: 0, errors: 0 })

  if (!isOpen) return null

  const handleFileSelect = async (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setParseError('')
    setIsParsing(true)

    try {
      const result = await parseParticipantFile(selectedFile, {
        existingStudents,
        existingTeams,
        existingCategories,
      })
      setItems(result)
      setStep('preview')
    } catch (err) {
      console.error('File parsing failed:', err)
      setParseError(err.message || 'Failed to extract data from file.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleItemChange = (rIdx, field, val) => {
    const updated = items.map((item, idx) => {
      if (idx !== rIdx) return item
      const newItem = { ...item, [field]: val }

      // If team field changed, map team name/id to teamId
      if (field === 'team') {
        const found = existingTeams.find(t => t.id === val || t.name.toLowerCase() === val.toLowerCase())
        newItem.team = found ? found.name : val
        newItem.teamId = found ? found.id : ''
      }

      return newItem
    })

    // Revalidate items after edit
    const revalidated = validateParticipants(updated, {
      existingStudents,
      existingTeams,
      existingCategories,
    })
    setItems(revalidated)
  }

  const handleToggleSelect = (rIdx) => {
    setItems(prev => prev.map((item, idx) => idx === rIdx ? { ...item, selected: !item.selected } : item))
  }

  const handleRemoveRow = (rIdx) => {
    const updated = items.filter((_, idx) => idx !== rIdx)
    const revalidated = validateParticipants(updated, {
      existingStudents,
      existingTeams,
      existingCategories,
    })
    setItems(revalidated)
  }

  const handleImport = async () => {
    const selectedValidItems = items.filter(item => item.selected && item.isValid)
    if (selectedValidItems.length === 0) return

    setIsImporting(true)

    const payload = selectedValidItems.map(item => ({
      name: item.name,
      chestNo: item.chestNo,
      class: item.category,
      team: item.teamId,
      programmeIds: [],
    }))

    const { data, error } = await supabase.from('students').insert(payload).select()

    setIsImporting(false)

    if (error) {
      console.error('Bulk import error:', error)
      alert(`Import failed: ${error.message}`)
      return
    }

    const importedCount = data ? data.length : 0
    const skippedCount = items.length - importedCount

    setImportSummary({
      imported: importedCount,
      skipped: skippedCount,
      errors: items.filter(i => !i.isValid).length,
    })
    setStep('summary')
  }

  const resetState = () => {
    setStep('upload')
    setFile(null)
    setParseError('')
    setItems([])
    setFilterTab('all')
    setIsImporting(false)
  }

  const handleClose = () => {
    if (step === 'summary') {
      onImportSuccess()
    }
    resetState()
    onClose()
  }

  // Summary counts
  const totalCount = items.length
  const validCount = items.filter(i => i.isValid).length
  const errorCount = items.filter(i => !i.isValid).length
  const selectedValidCount = items.filter(i => i.selected && i.isValid).length

  const filteredItems = items.filter(item => {
    if (filterTab === 'errors') return !item.isValid
    if (filterTab === 'valid') return item.isValid
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-6" onClick={handleClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-secondary/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-secondary/30 bg-black/20">
          <div>
            <h3 className="text-mainText font-bold text-lg sm:text-xl flex items-center gap-2">
              <FileText className="text-primary" size={22} /> Bulk Participant Import
            </h3>
            <p className="text-mutedText text-xs sm:text-sm mt-0.5">
              Extract and import participants using the 4 existing fields (Full name, Chest No, Category, Team)
            </p>
          </div>
          <button onClick={handleClose} className="text-mutedText hover:text-mainText p-1 transition rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* STEP 1: Upload File */}
          {step === 'upload' && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div
                className="w-full max-w-md border-2 border-dashed border-secondary/50 rounded-2xl p-8 bg-black/20 hover:bg-black/30 hover:border-primary transition cursor-pointer flex flex-col items-center"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0])
                }}
                onClick={() => document.getElementById('bulk-file-input')?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <Upload size={32} />
                </div>
                <p className="text-mainText font-semibold text-base sm:text-lg mb-1">
                  Upload Participant List PDF, CSV, or XLSX
                </p>
                <p className="text-mutedText text-xs sm:text-sm mb-4">
                  Drag and drop file here or click to browse
                </p>
                <span className="inline-block bg-primary text-white text-xs font-semibold px-4 py-2 rounded-xl">
                  Select File
                </span>
                <input
                  id="bulk-file-input"
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                />
              </div>

              {isParsing && (
                <div className="flex items-center gap-3 mt-6 text-primary font-semibold">
                  <RefreshCw className="animate-spin" size={20} /> Extracting participant data from file…
                </div>
              )}

              {parseError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-sm max-w-md">
                  {parseError}
                </div>
              )}

              <div className="mt-8 text-left max-w-md text-xs text-mutedText space-y-1 bg-black/20 p-4 rounded-xl border border-secondary/20">
                <p className="font-semibold text-mainText text-sm mb-1">Expected 4 Fields:</p>
                <p>1. <strong className="text-mainText">Full name</strong> (e.g. Muhammed Anwar)</p>
                <p>2. <strong className="text-mainText">Chest No</strong> (e.g. 101)</p>
                <p>3. <strong className="text-mainText">Category</strong> ({existingCategories.join(', ') || 'Minor, HS, Premier, Sub Junior, Junior'})</p>
                <p>4. <strong className="text-mainText">Team</strong> ({existingTeams.map(t => t.name).join(', ') || 'Team Names'})</p>
              </div>
            </div>
          )}

          {/* STEP 2: Preview & Validation Table */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Stats & Filter Tabs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/20 p-3 sm:p-4 rounded-xl border border-secondary/20">
                <div className="flex items-center gap-3 flex-wrap text-xs sm:text-sm">
                  <span className="text-mainText font-bold">Detected: {totalCount}</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                    Valid: {validCount}
                  </span>
                  {errorCount > 0 && (
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                      Errors: {errorCount}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-secondary/30 text-xs">
                  <button
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      filterTab === 'all' ? 'bg-primary text-white' : 'text-mutedText hover:text-mainText'
                    }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('valid')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      filterTab === 'valid' ? 'bg-primary text-white' : 'text-mutedText hover:text-mainText'
                    }`}
                  >
                    Valid ({validCount})
                  </button>
                  <button
                    onClick={() => setFilterTab('errors')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${
                      filterTab === 'errors' ? 'bg-primary text-white' : 'text-mutedText hover:text-mainText'
                    }`}
                  >
                    Errors ({errorCount})
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-secondary/30 rounded-xl max-h-[50vh]">
                <table className="w-full text-left text-xs sm:text-sm text-mainText border-collapse">
                  <thead className="sticky top-0 bg-secondary/40 backdrop-blur-md text-mutedText text-xs font-semibold uppercase">
                    <tr>
                      <th className="p-3 w-10 text-center">Import</th>
                      <th className="p-3">Full name</th>
                      <th className="p-3 w-28">Chest No</th>
                      <th className="p-3 w-36">Category</th>
                      <th className="p-3 w-40">Team</th>
                      <th className="p-3 w-40">Validation</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/20">
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-mutedText italic">
                          No items match the selected filter.
                        </td>
                      </tr>
                    )}
                    {filteredItems.map((item) => {
                      const realIdx = items.findIndex(i => i.rowId === item.rowId)
                      return (
                        <tr
                          key={item.rowId}
                          className={`transition ${
                            !item.isValid ? 'bg-rose-500/10' : item.selected ? 'bg-white/5' : 'opacity-60'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={() => handleToggleSelect(realIdx)}
                              className="accent-primary w-4 h-4 rounded cursor-pointer"
                            />
                          </td>

                          {/* Full name */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => handleItemChange(realIdx, 'name', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2.5 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm font-medium"
                              placeholder="Full name"
                            />
                          </td>

                          {/* Chest No */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.chestNo}
                              onChange={e => handleItemChange(realIdx, 'chestNo', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2.5 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm font-mono"
                              placeholder="101"
                            />
                          </td>

                          {/* Category */}
                          <td className="p-2">
                            <select
                              value={item.category}
                              onChange={e => handleItemChange(realIdx, 'category', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm"
                            >
                              <option value="">Select Category</option>
                              {existingCategories.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>

                          {/* Team */}
                          <td className="p-2">
                            <select
                              value={item.teamId || ''}
                              onChange={e => handleItemChange(realIdx, 'team', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm"
                            >
                              <option value="">Select Team</option>
                              {existingTeams.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          </td>

                          {/* Validation Status */}
                          <td className="p-2">
                            {item.isValid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                                <CheckCircle2 size={14} /> Ready
                              </span>
                            ) : (
                              <div className="space-y-0.5">
                                {item.errors.map((err, i) => (
                                  <div key={i} className="text-rose-400 text-[11px] font-medium leading-tight flex items-start gap-1">
                                    <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                                    <span>{err}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Action */}
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveRow(realIdx)}
                              className="text-mutedText hover:text-rose-400 transition p-1"
                              title="Delete row"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: Summary Screen */}
          {step === 'summary' && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 size={36} />
              </div>
              <h4 className="text-2xl font-bold text-mainText">Import Completed!</h4>

              <div className="bg-black/20 p-6 rounded-2xl border border-secondary/30 text-center max-w-md w-full space-y-2">
                <p className="text-emerald-400 font-semibold text-lg">
                  Successfully imported: {importSummary.imported}
                </p>
                <p className="text-mutedText text-sm">
                  Skipped: {importSummary.skipped}
                </p>
                {importSummary.errors > 0 && (
                  <p className="text-rose-400 text-sm">
                    Errors: {importSummary.errors}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-secondary/30 bg-black/20 flex items-center justify-between gap-3">
          {step === 'preview' && (
            <>
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 bg-black/30 border border-secondary/40 text-mainText hover:bg-black/50 rounded-xl font-semibold text-xs sm:text-sm transition"
              >
                Upload Different File
              </button>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-mutedText hover:text-mainText font-semibold text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedValidCount === 0 || isImporting}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-white text-xs sm:text-sm transition flex items-center gap-2 ${
                    selectedValidCount > 0 && !isImporting
                      ? 'bg-primary hover:bg-primary/90 shadow-md'
                      : 'bg-gray-600/50 cursor-not-allowed opacity-60'
                  }`}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} /> Importing…
                    </>
                  ) : (
                    `Import ${selectedValidCount} Participants`
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'summary' && (
            <button
              onClick={handleClose}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 rounded-xl transition text-sm sm:text-base shadow-md"
            >
              Done & Refresh List
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
