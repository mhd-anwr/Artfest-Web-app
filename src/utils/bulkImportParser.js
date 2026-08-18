import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import * as pdfjsLib from 'pdfjs-dist'
import { createWorker } from 'tesseract.js'

// Setup pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

/**
 * Intelligent 4-Field Bulk Participant Parser
 * Fields: name (Full name), chestNo (Chest No), class (Category), team (Team)
 */

export async function parseParticipantFile(file, { existingStudents = [], existingTeams = [], existingCategories = [] }) {
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

  // 1. Identify columns and normalize data to { name, chestNo, category, team }
  const parsedItems = processRawRows(rawRows, { existingTeams, existingCategories })

  // 2. Validate parsed items against database logic
  const validatedItems = validateParticipants(parsedItems, { existingStudents, existingTeams, existingCategories })

  return validatedItems
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data || [])
      },
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

    // Group items by Y coordinate (lines)
    const itemsByY = {}
    textContent.items.forEach(item => {
      if (!item.str || !item.str.trim()) return
      const y = Math.round(item.transform[5]) // Y position
      const x = Math.round(item.transform[4]) // X position

      // Find an existing Y group within 4px threshold
      let matchingY = Object.keys(itemsByY).find(existingY => Math.abs(Number(existingY) - y) <= 4)
      if (!matchingY) {
        matchingY = y
        itemsByY[matchingY] = []
      }
      itemsByY[matchingY].push({ text: item.str.trim(), x })
    })

    // Sort lines from top to bottom (descending Y)
    const sortedYKeys = Object.keys(itemsByY).sort((a, b) => Number(b) - Number(a))
    sortedYKeys.forEach(yKey => {
      const lineItems = itemsByY[yKey].sort((a, b) => a.x - b.x)
      const lineCells = lineItems.map(i => i.text)
      if (lineCells.length > 0) {
        allLines.push(lineCells)
      }
    })
  }

  // If text items is very low, perform OCR fallback (Scanned PDF)
  if (totalTextItems < 10) {
    console.log('PDF text is empty or image-only. Attempting OCR...')
    const ocrLines = await performPDFOCR(pdf)
    if (ocrLines && ocrLines.length > 0) {
      return ocrLines
    }
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
          // split by tabs or 2+ spaces or commas
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

/**
 * Identify columns and extract the 4 fields
 */
function processRawRows(rawRows, { existingTeams, existingCategories }) {
  if (rawRows.length === 0) return []

  // Check if first row is a header row
  let headerIndex = -1
  let colMap = { name: -1, chestNo: -1, category: -1, team: -1 }

  for (let i = 0; i < Math.min(5, rawRows.length); i++) {
    const row = rawRows[i].map(cell => String(cell).toLowerCase().trim())
    
    row.forEach((cell, colIdx) => {
      if (colMap.name === -1 && cell.match(/name|student|participant|full\s*name/i)) {
        colMap.name = colIdx
      }
      if (colMap.chestNo === -1 && cell.match(/chest|reg|roll|no|#/i)) {
        colMap.chestNo = colIdx
      }
      if (colMap.category === -1 && cell.match(/cat|category|class|group|division/i)) {
        colMap.category = colIdx
      }
      if (colMap.team === -1 && cell.match(/team|house/i)) {
        colMap.team = colIdx
      }
    })

    // If we found at least 2 headers, assume this row is the header
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
    let rawChestNo = ''
    let rawCategory = ''
    let rawTeam = ''

    if (headerIndex !== -1 && Object.values(colMap).some(idx => idx !== -1)) {
      if (colMap.name !== -1) rawName = row[colMap.name] || ''
      if (colMap.chestNo !== -1) rawChestNo = row[colMap.chestNo] || ''
      if (colMap.category !== -1) rawCategory = row[colMap.category] || ''
      if (colMap.team !== -1) rawTeam = row[colMap.team] || ''
    } else {
      // Heuristic column matching if no header row was detected
      row.forEach(cellObj => {
        const val = String(cellObj).trim()
        if (!val) return

        // 1. Is it Chest No? (e.g. 101, #102)
        if (!rawChestNo && val.match(/^#?\d{1,4}$/)) {
          rawChestNo = val.replace('#', '')
          return
        }

        // 2. Is it a known Category?
        const matchCat = existingCategories.find(c => c.toLowerCase() === val.toLowerCase())
        if (!rawCategory && matchCat) {
          rawCategory = matchCat
          return
        }

        // 3. Is it a known Team?
        const matchTeam = existingTeams.find(t => t.name.toLowerCase() === val.toLowerCase() || t.id.toLowerCase() === val.toLowerCase())
        if (!rawTeam && matchTeam) {
          rawTeam = matchTeam.name
          return
        }

        // 4. Otherwise assume Name if empty
        if (!rawName && val.match(/^[a-zA-Z\s.'-]+$/)) {
          rawName = val
        }
      })
    }

    // Clean up
    const cleanName = String(rawName).trim().replace(/\b\w/g, c => c.toUpperCase())
    const cleanChestNo = String(rawChestNo).trim().replace(/^#/, '')
    const cleanCategory = String(rawCategory).trim()
    const cleanTeam = String(rawTeam).trim()

    return {
      rowId: rIdx + 1,
      name: cleanName,
      chestNo: cleanChestNo,
      category: cleanCategory,
      team: cleanTeam,
      selected: true,
    }
  }).filter(item => item.name || item.chestNo || item.category || item.team)
}

/**
 * Validate participants against DB lists & detect errors/duplicates
 */
export function validateParticipants(items, { existingStudents = [], existingTeams = [], existingCategories = [] }) {
  const chestMap = new Set(existingStudents.map(s => String(s.chestNo || '').trim()).filter(Boolean))
  const nameMap = new Set(existingStudents.map(s => String(s.name || '').toLowerCase().trim()))

  const teamNameMap = {}
  existingTeams.forEach(t => {
    teamNameMap[t.name.toLowerCase()] = t.id
    teamNameMap[t.id.toLowerCase()] = t.id
  })

  const batchChestNos = new Set()

  return items.map(item => {
    const errors = []
    const warnings = []

    // Field 1: Full Name
    if (!item.name) {
      errors.push('Missing Full Name')
    }

    // Field 2: Chest No
    if (!item.chestNo) {
      errors.push('Missing Chest No')
    } else {
      if (chestMap.has(item.chestNo)) {
        errors.push(`Chest No ${item.chestNo} already exists in database`)
      }
      if (batchChestNos.has(item.chestNo)) {
        errors.push(`Duplicate Chest No ${item.chestNo} in import file`)
      }
      batchChestNos.add(item.chestNo)
    }

    // Field 3: Category
    let resolvedCategory = item.category
    if (!item.category) {
      errors.push('Missing Category')
    } else {
      const matchCat = existingCategories.find(c => c.toLowerCase() === item.category.toLowerCase())
      if (matchCat) {
        resolvedCategory = matchCat
      } else {
        errors.push(`Invalid Category "${item.category}"`)
      }
    }

    // Field 4: Team
    let resolvedTeamId = ''
    if (!item.team) {
      errors.push('Missing Team')
    } else {
      const matchedId = teamNameMap[item.team.toLowerCase()]
      if (matchedId) {
        resolvedTeamId = matchedId
      } else {
        errors.push(`Invalid Team "${item.team}"`)
      }
    }

    // Duplicate Student Name Warning
    if (item.name && nameMap.has(item.name.toLowerCase())) {
      warnings.push(`Participant "${item.name}" already exists in database`)
    }

    return {
      ...item,
      category: resolvedCategory,
      teamId: resolvedTeamId,
      errors,
      warnings,
      isValid: errors.length === 0,
    }
  })
}
