// Canvas-based Image Compositing Utility for Gallery Footers

const compositeCache = new Map()

/**
 * Loads an image from a URL into an HTMLImageElement safely with CORS handling.
 */
async function loadImageSafely(src) {
  if (!src) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = async () => {
      // Fallback: fetch blob if direct img crossOrigin failed
      try {
        const response = await fetch(src)
        const blob = await response.blob()
        const blobUrl = URL.createObjectURL(blob)
        const fallbackImg = new Image()
        fallbackImg.onload = () => {
          URL.revokeObjectURL(blobUrl)
          resolve(fallbackImg)
        }
        fallbackImg.onerror = () => resolve(null)
        fallbackImg.src = blobUrl
      } catch {
        resolve(null)
      }
    }
    img.src = src
  })
}

/**
 * Composites a footer image onto a photo and returns a Data URL / Object URL.
 * If footerUrl is empty or null, returns the original photoUrl.
 */
export async function getCompositedGalleryImage(photoUrl, footerUrl) {
  if (!photoUrl) return ''
  if (!footerUrl) return photoUrl

  const cacheKey = `${photoUrl}|${footerUrl}`
  if (compositeCache.has(cacheKey)) {
    return compositeCache.get(cacheKey)
  }

  try {
    const [photoImg, footerImg] = await Promise.all([
      loadImageSafely(photoUrl),
      loadImageSafely(footerUrl)
    ])

    if (!photoImg) return photoUrl
    if (!footerImg) return photoUrl

    const canvas = document.createElement('canvas')
    const width = photoImg.naturalWidth || photoImg.width || 1200
    const height = photoImg.naturalHeight || photoImg.height || 800

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')

    // 1. Draw base photo
    ctx.drawImage(photoImg, 0, 0, width, height)

    // 2. Calculate proportional footer dimensions
    const footerNatWidth = footerImg.naturalWidth || footerImg.width || 800
    const footerNatHeight = footerImg.naturalHeight || footerImg.height || 200

    let targetWidth = width * 0.90 // 90% of photo width
    let targetHeight = (footerNatHeight / footerNatWidth) * targetWidth

    const maxHeight = height * 0.16 // Max 16% of photo height
    if (targetHeight > maxHeight) {
      targetHeight = maxHeight
      targetWidth = (footerNatWidth / footerNatHeight) * targetHeight
    }

    const x = (width - targetWidth) / 2
    const y = height - targetHeight - (height * 0.02) // 2% padding from bottom

    // 3. Draw footer overlay with transparency preserved
    ctx.drawImage(footerImg, x, y, targetWidth, targetHeight)

    const compositedDataUrl = canvas.toDataURL('image/jpeg', 0.95)
    compositeCache.set(cacheKey, compositedDataUrl)
    return compositedDataUrl
  } catch (err) {
    console.warn('Image compositing fallback to original:', err)
    return photoUrl
  }
}

/**
 * Downloads the composited image (with footer baked in) to user's device.
 */
export async function downloadCompositedImage(photoUrl, footerUrl, filename = 'gallery-photo.jpg') {
  try {
    const finalUrl = await getCompositedGalleryImage(photoUrl, footerUrl)

    if (finalUrl.startsWith('data:')) {
      const a = document.createElement('a')
      a.href = finalUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } else {
      const res = await fetch(finalUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    }
  } catch (err) {
    console.error('Download composited image failed:', err)
    // Fallback: direct download
    const a = document.createElement('a')
    a.href = photoUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

/**
 * Clears the memory cache when active footer changes.
 */
export function clearCompositorCache() {
  compositeCache.clear()
}
