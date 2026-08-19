import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'
import { PROGRAMME_TYPES, PARTICIPATION_TYPES } from '../supabase/queries'

// Setup pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

export const APPROVED_CATEGORIES = [
  'Minor',
  'HS',
  'Premier',
  'Sub Junior',
  'Junior',
  'General Cat-A',
  'General Cat-B'
]

export const APPROVED_TYPES = PROGRAMME_TYPES // ['On-Stage', 'Off-stage'] or ['On Stage', 'Off Stage']
export const APPROVED_PARTICIPATION = PARTICIPATION_TYPES // ['Individual', 'Group']

/**
 * Intelligent Programme Bulk Parser
 * Fields: name, category, programmeType, participationType, resultNo
 */
export async function parseProgrammeFile(file, { existingProgrammes = [], existingCategories = [] }) {
  const extension = file.name.split('.').pop().toLowerCase()
  let rawRows = []

  if (extension === 'csv') {
    rawRows = await parseCSV(file)
  } else if (extension === 'xlsx' || extension === 'xls') {
    rawRows = await parseExcel(file)
  } else if (extension === 'pdf') {
    rawRows = await parsePDF(file)
  } else {
    throw new Error('Unsupported file format. Please upload a PDF, CSV, or XLSX file.')
  }

  if (!rawRows || rawRows.length === 0) {
    throw new Error('No readable data could be extracted from the file.')
  }

  const validCategories = existingCategories.length > 0 ? existingCategories : APPROVED_CATEGORIES

  // 1. Process raw rows to 5 fields
  const parsedItems = processRawProgrammeRows(rawRows, { validCategories })

  // 2. Validate parsed items against DB
  const validatedItems = validateProgrammes(parsedItems, { existingProgrammes, validCategories })

  return validatedItems
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => resolve(results.data || []),
      error: (err) => reject(new Error(`CSV Parse Error: ${err.message}`))
    })
  })
}

async function parseExcel(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[firstSheetName]
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  return data.filter(row => row && row.some(cell => String(cell).trim() !== ''))
}

async function parsePDF(file) {
  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjsLib.getDocument({ data: buffer })
  const pdf = await loadingTask.promise
  let allLines = []
  let totalTextItems = 0

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    totalTextItems += textContent.items.length

    const itemsByY = {}
    textContent.items.forEach(item => {
      if (!item.str || !item.str.trim()) return
      const y = Math.round(item.transform[5])
      const x = Math.round(item.transform[4])

      let matchingY = Object.keys(itemsByY).find(existingY => Math.abs(Number(existingY) - y) <= 4)
      if (!matchingY) {
        matchingY = y
        itemsByY[matchingY] = []
      }
      itemsByY[matchingY].push({ text: item.str.trim(), x })
    })

    const sortedYKeys = Object.keys(itemsByY).sort((a, b) => Number(b) - Number(a))
    sortedYKeys.forEach(yKey => {
      const lineItems = itemsByY[yKey].sort((a, b) => a.x - b.x)
      const lineCells = lineItems.map(i => i.text)
      if (lineCells.length > 0) allLines.push(lineCells)
    })
  }

  if (totalTextItems < 10) {
    console.log('PDF text is empty or image-only. Running OCR...')
    const ocrLines = await performPDFOCR(pdf)
    if (ocrLines && ocrLines.length > 0) return ocrLines
  }

  return allLines
}

async function performPDFOCR(pdf) {
  const worker = await createWorker('eng')
  const lines = []

  try {
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      const viewport = page.getViewport({ scale: 1.5 })
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      canvas.width = viewport.width
      canvas.height = viewport.height

      await page.render({ canvasContext: ctx, viewport }).promise
      const dataUrl = canvas.toDataURL('image/png')
      const { data: { text } } = await worker.recognize(dataUrl)

      text.split('\n').forEach(rawLine => {
        const line = rawLine.trim()
        if (line) {
          const cells = line.split(/\t|,|\s{2,}/).map(c => c.trim()).filter(Boolean)
          if (cells.length > 0) lines.push(cells)
        }
      })
    }
  } catch (err) {
    console.warn('OCR processing failed:', err)
  } finally {
    await worker.terminate()
  }

  return lines
}

export function normalizeCategory(val, validCategories = APPROVED_CATEGORIES) {
  if (!val) return ''
  const str = String(val).trim().toLowerCase()

  // Direct match
  const direct = validCategories.find(c => c.toLowerCase() === str)
  if (direct) return direct

  // Synonym / Alias mapping
  if (str.includes('cat-a') || str.includes('cat a') || str.includes('general a')) return 'General Cat-A'
  if (str.includes('cat-b') || str.includes('cat b') || str.includes('general b')) return 'General Cat-B'
  if (str.includes('sub') || str.includes('sub-junior')) return 'Sub Junior'
  if (str.includes('junior')) return 'Junior'
  if (str.includes('premier')) return 'Premier'
  if (str.includes('minor')) return 'Minor'
  if (str === 'hs' || str.includes('high school')) return 'HS'

  return val // return raw if unmapped so validator flags it
}

export function normalizeType(val) {
  if (!val) return ''
  const str = String(val).trim().toLowerCase()

  if (str.includes('on') || str.includes('stage') && !str.includes('off')) {
    // Check whether database uses 'On-stage' or 'On Stage'
    const onStageOpt = PROGRAMME_TYPES.find(t => t.toLowerCase().includes('on')) || 'On-stage'
    return onStageOpt
  }
  if (str.includes('off')) {
    const offStageOpt = PROGRAMME_TYPES.find(t => t.toLowerCase().includes('off')) || 'Off-stage'
    return offStageOpt
  }

  return val
}

export function normalizeParticipation(val) {
  if (!val) return ''
  const str = String(val).trim().toLowerCase()

  if (str.includes('ind') || str.includes('single') || str.includes('solo')) return 'Individual'
  if (str.includes('grp') || str.includes('group') || str.includes('team')) return 'Group'

  return val
}

function processRawProgrammeRows(rawRows, { validCategories }) {
  if (rawRows.length === 0) return []

  let headerIndex = -1
  let colMap = { name: -1, category: -1, programmeType: -1, participationType: -1, resultNo: -1 }

  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const row = rawRows[i].map(cell => String(cell).toLowerCase().trim())

    row.forEach((cell, colIdx) => {
      if (colMap.name === -1 && cell.match(/prog|programme|event|item|title|name/i)) {
        colMap.name = colIdx
      }
      if (colMap.category === -1 && cell.match(/cat|category|class|group/i) && !cell.match(/ind|participation/i)) {
        colMap.category = colIdx
      }
      if (colMap.programmeType === -1 && cell.match(/type|stage|format/i)) {
        colMap.programmeType = colIdx
      }
      if (colMap.participationType === -1 && cell.match(/participation|individual|group|solo/i)) {
        colMap.participationType = colIdx
      }
      if (colMap.resultNo === -1 && cell.match(/result|no|#|order|sl/i)) {
        colMap.resultNo = colIdx
      }
    })

    const matchedCount = Object.values(colMap).filter(idx => idx !== -1).length
    if (matchedCount >= 2) {
      headerIndex = i
      break
    }
  }

  const startRow = headerIndex !== -1 ? headerIndex + 1 : 0
  const dataRows = rawRows.slice(startRow)

  return dataRows.map((row, rIdx) => {
    let rawName = ''
    let rawCat = ''
    let rawType = ''
    let rawPart = ''
    let rawResNo = ''

    if (headerIndex !== -1 && Object.values(colMap).some(idx => idx !== -1)) {
      if (colMap.name !== -1) rawName = row[colMap.name] || ''
      if (colMap.category !== -1) rawCat = row[colMap.category] || ''
      if (colMap.programmeType !== -1) rawType = row[colMap.programmeType] || ''
      if (colMap.participationType !== -1) rawPart = row[colMap.participationType] || ''
      if (colMap.resultNo !== -1) rawResNo = row[colMap.resultNo] || ''
    } else {
      // Heuristic fallback
      row.forEach(cellObj => {
        const val = String(cellObj).trim()
        if (!val) return

        if (!rawResNo && val.match(/^#?\d{1,3}$/)) {
          rawResNo = val.replace('#', '')
          return
        }

        const normalizedCat = normalizeCategory(val, validCategories)
        if (!rawCat && validCategories.includes(normalizedCat)) {
          rawCat = normalizedCat
          return
        }

        if (!rawType && (val.toLowerCase().includes('stage') || val.toLowerCase().includes('off') || val.toLowerCase().includes('on'))) {
          rawType = val
          return
        }

        if (!rawPart && (val.toLowerCase().includes('indiv') || val.toLowerCase().includes('group'))) {
          rawPart = val
          return
        }

        if (!rawName) rawName = val
      })
    }

    const cleanName = String(rawName).trim().replace(/\b\w/g, c => c.toUpperCase())
    const cleanCat = normalizeCategory(rawCat, validCategories)
    const cleanType = normalizeType(rawType)
    const cleanPart = normalizeParticipation(rawPart)
    const cleanResNo = String(rawResNo).trim().replace('#', '')

    return {
      rowId: rIdx + 1,
      name: cleanName,
      category: cleanCat,
      programmeType: cleanType,
      participationType: cleanPart,
      resultNo: cleanResNo,
      selected: true,
    }
  }).filter(item => item.name || item.category || item.programmeType || item.participationType)
}

export function validateProgrammes(items, { existingProgrammes = [], validCategories = APPROVED_CATEGORIES }) {
  const existingNames = new Set(existingProgrammes.map(p => String(p.name || '').toLowerCase().trim()))
  const batchNames = new Set()

  return items.map(item => {
    const errors = []
    const warnings = []

    // Field 1: Programme Name
    if (!item.name) {
      errors.push('Missing Programme Name')
    } else {
      if (existingNames.has(item.name.toLowerCase())) {
        warnings.push(`Programme "${item.name}" already exists in database`)
      }
      if (batchNames.has(item.name.toLowerCase())) {
        errors.push(`Duplicate Programme "${item.name}" in import file`)
      }
      batchNames.add(item.name.toLowerCase())
    }

    // Field 2: Category
    if (!item.category) {
      errors.push('Missing Category')
    } else if (!validCategories.includes(item.category)) {
      errors.push(`Invalid Category "${item.category}" (allowed: ${validCategories.join(', ')})`)
    }

    // Field 3: Type
    if (!item.programmeType) {
      errors.push('Missing Type')
    } else if (!PROGRAMME_TYPES.includes(item.programmeType)) {
      errors.push(`Invalid Type "${item.programmeType}" (allowed: ${PROGRAMME_TYPES.join(', ')})`)
    }

    // Field 4: Individual / Group
    if (!item.participationType) {
      errors.push('Missing Individual / Group')
    } else if (!PARTICIPATION_TYPES.includes(item.participationType)) {
      errors.push(`Invalid Participation "${item.participationType}" (allowed: ${PARTICIPATION_TYPES.join(', ')})`)
    }

    // Field 5: Result Number (optional number)
    if (item.resultNo && isNaN(Number(item.resultNo))) {
      errors.push(`Result Number "${item.resultNo}" must be a number`)
    }

    return {
      ...item,
      errors,
      warnings,
      isValid: errors.length === 0,
    }
  })
}
