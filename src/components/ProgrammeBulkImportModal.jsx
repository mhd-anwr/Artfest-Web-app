import { useState } from 'react'
import { supabase } from '../supabase/client'
import { parseProgrammeFile, validateProgrammes, APPROVED_CATEGORIES } from '../utils/programmeBulkParser'
import { PROGRAMME_TYPES, PARTICIPATION_TYPES } from '../supabase/queries'
import { X, Upload, FileText, CheckCircle2, AlertTriangle, Trash2, RefreshCw, Download, FileCheck } from 'lucide-react'

export default function ProgrammeBulkImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  existingProgrammes = [],
  existingCategories = [],
}) {
  const [step, setStep] = useState('select_file') // 'select_file' | 'file_ready' | 'preview' | 'summary'
  const [file, setFile] = useState(null)
  const [isParsing, setIsParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [items, setItems] = useState([])
  const [filterTab, setFilterTab] = useState('all') // 'all' | 'errors' | 'valid'
  const [isImporting, setIsImporting] = useState(false)
  const [importSummary, setImportSummary] = useState({ imported: 0, skipped: 0, errors: 0 })

  if (!isOpen) return null

  const validCategories = existingCategories.length > 0 ? existingCategories : APPROVED_CATEGORIES

  const handleFileChoose = (selectedFile) => {
    if (!selectedFile) return
    setFile(selectedFile)
    setParseError('')
    setStep('file_ready')
  }

  const handleExtract = async () => {
    if (!file) return
    setParseError('')
    setIsParsing(true)

    try {
      const result = await parseProgrammeFile(file, {
        existingProgrammes,
        existingCategories: validCategories,
      })
      setItems(result)
      setStep('preview')
    } catch (err) {
      console.error('Programme file parsing failed:', err)
      setParseError(err.message || 'Failed to extract data from file. Please check file format and try again.')
    } finally {
      setIsParsing(false)
    }
  }

  const handleDownloadTemplate = () => {
    const csvContent = [
      'Programme Name,Category,Type,Individual / Group,Result Number',
      `Elocution English,${validCategories[0] || 'HS'},${PROGRAMME_TYPES[0] || 'On-Stage'},${PARTICIPATION_TYPES[0] || 'Individual'},1`,
      `Group Song,${validCategories[1] || 'Junior'},${PROGRAMME_TYPES[0] || 'On-Stage'},${PARTICIPATION_TYPES[1] || 'Group'},2`,
      `Essay Writing Malayalam,${validCategories[2] || 'Premier'},${PROGRAMME_TYPES[1] || 'Off-Stage'},${PARTICIPATION_TYPES[0] || 'Individual'},3`,
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'programme_import_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleItemChange = (rIdx, field, val) => {
    const updated = items.map((item, idx) => {
      if (idx !== rIdx) return item
      return { ...item, [field]: val }
    })

    const revalidated = validateProgrammes(updated, {
      existingProgrammes,
      validCategories,
    })
    setItems(revalidated)
  }

  const handleToggleSelect = (rIdx) => {
    setItems(prev => prev.map((item, idx) => idx === rIdx ? { ...item, selected: !item.selected } : item))
  }

  const handleRemoveRow = (rIdx) => {
    const updated = items.filter((_, idx) => idx !== rIdx)
    const revalidated = validateProgrammes(updated, {
      existingProgrammes,
      validCategories,
    })
    setItems(revalidated)
  }

  const handleImport = async () => {
    const selectedValidItems = items.filter(item => item.selected && item.isValid)
    if (selectedValidItems.length === 0) return

    setIsImporting(true)

    let importedCount = 0
    let errorCount = 0

    for (const item of selectedValidItems) {
      // 1. Insert programme
      const { data: newProg, error: progErr } = await supabase.from('programmes').insert({
        name: item.name,
        category: item.category,
        programmeType: item.programmeType,
        participationType: item.participationType,
        isFinished: false,
      }).select('id')

      if (progErr || !newProg || newProg.length === 0) {
        console.error(`Failed to insert programme ${item.name}:`, progErr)
        errorCount++
        continue
      }

      importedCount++
      const addedId = newProg[0].id

      // 2. Set resultNo if specified
      if (item.resultNo && !isNaN(Number(item.resultNo))) {
        await supabase.rpc('admin_set_result_no', {
          p_programme_id: addedId,
          p_programme_name: item.name,
          p_result_no: Number(item.resultNo),
        })
      }
    }

    setIsImporting(false)
    const skippedCount = items.length - importedCount

    setImportSummary({
      imported: importedCount,
      skipped: skippedCount,
      errors: errorCount + items.filter(i => !i.isValid).length,
    })
    setStep('summary')
  }

  const resetState = () => {
    setStep('select_file')
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

  const totalCount = items.length
  const validCount = items.filter(i => i.isValid).length
  const totalErrors = items.filter(i => !i.isValid).length
  const selectedValidCount = items.filter(i => i.selected && i.isValid).length

  const filteredItems = items.filter(item => {
    if (filterTab === 'errors') return !item.isValid
    if (filterTab === 'valid') return item.isValid
    return true
  })

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-3 sm:p-6" onClick={handleClose}>
      <div
        className="bg-card rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-secondary/30 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-secondary/30 bg-black/20">
          <div>
            <h3 className="text-mainText font-bold text-lg sm:text-xl flex items-center gap-2">
              <FileText className="text-primary" size={22} /> Bulk Import Programmes
            </h3>
            <p className="text-mutedText text-xs sm:text-sm mt-0.5">
              Upload PDF or Data File matching Programme Name, Category, Type, Individual/Group & Result No
            </p>
          </div>
          <button onClick={handleClose} className="text-mutedText hover:text-mainText p-1.5 transition rounded-lg hover:bg-white/10">
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* STEP 1: Select File */}
          {step === 'select_file' && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div
                className="w-full max-w-lg border-2 border-dashed border-secondary/50 rounded-2xl p-8 bg-black/20 hover:bg-black/30 hover:border-primary transition cursor-pointer flex flex-col items-center"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault()
                  if (e.dataTransfer.files?.[0]) handleFileChoose(e.dataTransfer.files[0])
                }}
                onClick={() => document.getElementById('bulk-prog-pdf-input')?.click()}
              >
                <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary mb-4">
                  <Upload size={32} />
                </div>
                <p className="text-mainText font-bold text-base sm:text-lg mb-1">
                  Upload Programme List PDF, CSV, or XLSX
                </p>
                <p className="text-mutedText text-xs sm:text-sm mb-5">
                  Drag and drop your file here, or click to choose
                </p>

                <div className="flex items-center gap-3 flex-wrap justify-center" onClick={e => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => document.getElementById('bulk-prog-pdf-input')?.click()}
                    className="bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl shadow-md transition flex items-center gap-2"
                  >
                    <Upload size={16} /> Choose PDF / File
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="bg-black/40 hover:bg-black/60 text-mainText border border-secondary/40 text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
                  >
                    <Download size={16} /> Download Template
                  </button>
                </div>

                <input
                  id="bulk-prog-pdf-input"
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls"
                  className="hidden"
                  onChange={e => e.target.files?.[0] && handleFileChoose(e.target.files[0])}
                />
              </div>

              {parseError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-sm max-w-lg">
                  {parseError}
                </div>
              )}

              <div className="mt-6 text-left max-w-lg text-xs text-mutedText space-y-1.5 bg-black/20 p-4 rounded-xl border border-secondary/20">
                <p className="font-semibold text-mainText text-sm mb-1">Allowed Field Values:</p>
                <p>• <strong className="text-mainText">Category</strong>: {validCategories.join(', ')}</p>
                <p>• <strong className="text-mainText">Type</strong>: {PROGRAMME_TYPES.join(', ')}</p>
                <p>• <strong className="text-mainText">Individual / Group</strong>: {PARTICIPATION_TYPES.join(', ')}</p>
                <p>• <strong className="text-mainText">Result Number</strong>: Optional numeric order index</p>
              </div>
            </div>
          )}

          {/* STEP 2: File Ready -> Extract Button */}
          {step === 'file_ready' && (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                <FileCheck size={40} />
              </div>

              <div>
                <p className="text-mutedText text-xs uppercase tracking-wider font-semibold mb-1">Selected File</p>
                <h4 className="text-xl font-bold text-mainText max-w-md truncate">{file?.name}</h4>
                <p className="text-mutedText text-xs mt-1">{(file?.size / 1024).toFixed(1)} KB</p>
              </div>

              {isParsing ? (
                <div className="flex items-center gap-3 text-primary font-semibold py-2">
                  <RefreshCw className="animate-spin" size={20} /> Extracting programmes from file…
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setStep('select_file')}
                    className="px-4 py-2.5 bg-black/30 border border-secondary/40 text-mainText hover:bg-black/50 rounded-xl font-semibold text-sm transition"
                  >
                    Change File
                  </button>

                  <button
                    type="button"
                    onClick={handleExtract}
                    className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold text-sm transition shadow-md flex items-center gap-2"
                  >
                    <RefreshCw size={16} /> Extract Programmes
                  </button>
                </div>
              )}

              {parseError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-400 text-sm max-w-md">
                  {parseError}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preview Table & Validation */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Summary Stats & Filter Tabs */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/20 p-3 sm:p-4 rounded-xl border border-secondary/20">
                <div className="flex items-center gap-3 flex-wrap text-xs sm:text-sm">
                  <span className="text-mainText font-bold">Extracted: {totalCount}</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                    Valid: {validCount}
                  </span>
                  {totalErrors > 0 && (
                    <span className="bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-semibold">
                      Errors: {totalErrors}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-secondary/30 text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${filterTab === 'all' ? 'bg-primary text-white' : 'text-mutedText hover:text-mainText'
                      }`}
                  >
                    All ({totalCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('valid')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${filterTab === 'valid' ? 'bg-primary text-white' : 'text-mutedText hover:text-mainText'
                      }`}
                  >
                    Valid ({validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('errors')}
                    className={`px-3 py-1 rounded-lg font-semibold transition ${filterTab === 'errors' ? 'bg-primary text-white' : 'text-mutedText hover:text-mainText'
                      }`}
                  >
                    Errors ({totalErrors})
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto border border-secondary/30 rounded-xl max-h-[50vh]">
                <table className="w-full text-left text-xs sm:text-sm text-mainText border-collapse">
                  <thead className="sticky top-0 bg-secondary/40 backdrop-blur-md text-mutedText text-xs font-semibold uppercase">
                    <tr>
                      <th className="p-3 w-10 text-center">Import</th>
                      <th className="p-3">Programme Name</th>
                      <th className="p-3 w-36">Category</th>
                      <th className="p-3 w-32">Type</th>
                      <th className="p-3 w-36">Individual / Group</th>
                      <th className="p-3 w-28">Result No</th>
                      <th className="p-3 w-36">Validation</th>
                      <th className="p-3 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-secondary/20">
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-mutedText italic">
                          No programmes match the selected filter.
                        </td>
                      </tr>
                    )}
                    {filteredItems.map((item) => {
                      const realIdx = items.findIndex(i => i.rowId === item.rowId)
                      return (
                        <tr
                          key={item.rowId}
                          className={`transition ${!item.isValid ? 'bg-rose-500/10' : item.selected ? 'bg-white/5' : 'opacity-60'
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

                          {/* Programme Name */}
                          <td className="p-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => handleItemChange(realIdx, 'name', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2.5 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm font-medium"
                              placeholder="Programme Name"
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
                              {validCategories.map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </td>

                          {/* Type */}
                          <td className="p-2">
                            <select
                              value={item.programmeType}
                              onChange={e => handleItemChange(realIdx, 'programmeType', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm"
                            >
                              <option value="">Select Type</option>
                              {PROGRAMME_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </td>

                          {/* Individual / Group */}
                          <td className="p-2">
                            <select
                              value={item.participationType}
                              onChange={e => handleItemChange(realIdx, 'participationType', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm"
                            >
                              <option value="">Select</option>
                              {PARTICIPATION_TYPES.map(t => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          </td>

                          {/* Result No */}
                          <td className="p-2">
                            <input
                              type="number"
                              value={item.resultNo || ''}
                              onChange={e => handleItemChange(realIdx, 'resultNo', e.target.value)}
                              className="w-full bg-black/30 text-mainText px-2 py-1.5 rounded-lg border border-secondary/30 focus:border-primary outline-none text-xs sm:text-sm font-mono"
                              placeholder="e.g. 1"
                            />
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
                              type="button"
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

          {/* STEP 4: Summary Screen */}
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
                type="button"
                onClick={() => setStep('select_file')}
                className="px-4 py-2 bg-black/30 border border-secondary/40 text-mainText hover:bg-black/50 rounded-xl font-semibold text-xs sm:text-sm transition"
              >
                Upload Different File
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-mutedText hover:text-mainText font-semibold text-xs sm:text-sm transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={selectedValidCount === 0 || isImporting}
                  className={`px-5 py-2.5 rounded-xl font-semibold text-white text-xs sm:text-sm transition flex items-center gap-2 ${selectedValidCount > 0 && !isImporting
                    ? 'bg-primary hover:bg-primary/90 shadow-md'
                    : 'bg-gray-600/50 cursor-not-allowed opacity-60'
                    }`}
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="animate-spin" size={16} /> Importing…
                    </>
                  ) : (
                    `Import ${selectedValidCount} Programmes`
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'summary' && (
            <button
              type="button"
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
