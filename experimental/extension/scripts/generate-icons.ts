#!/usr/bin/env bun

/**
 * Generate placeholder icons for the extension
 * Creates simple colored square icons in required sizes
 */

import { join } from "path"

const ICONS_DIR = join(import.meta.dir, "..", "icons")
const SIZES = [16, 48, 128]

// Simple 1x1 teal pixel PNG, we'll scale it conceptually
// For a proper icon, this should be replaced with actual design
async function generateIcon(size: number): Promise<Uint8Array> {
  // This is a minimal valid PNG structure

  const width = size
  const height = size

  // PNG signature
  const signature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk
  const ihdr = createIHDRChunk(width, height)

  // IDAT chunk (image data) - simple solid color
  const idat = createIDATChunk(width, height)

  // IEND chunk
  const iend = createIENDChunk()

  // Combine all parts
  const totalLength = signature.length + ihdr.length + idat.length + iend.length
  const png = new Uint8Array(totalLength)

  let offset = 0
  png.set(signature, offset)
  offset += signature.length
  png.set(ihdr, offset)
  offset += ihdr.length
  png.set(idat, offset)
  offset += idat.length
  png.set(iend, offset)

  return png
}

function createIHDRChunk(width: number, height: number): Uint8Array {
  const data = new Uint8Array(13)
  const view = new DataView(data.buffer)

  view.setUint32(0, width, false) // width
  view.setUint32(4, height, false) // height
  data[8] = 8 // bit depth
  data[9] = 2 // color type (RGB)
  data[10] = 0 // compression
  data[11] = 0 // filter
  data[12] = 0 // interlace

  return wrapChunk("IHDR", data)
}

function createIDATChunk(width: number, height: number): Uint8Array {
  const rowSize = 1 + width * 3 // filter byte + RGB
  const rawData = new Uint8Array(rowSize * height)

  // Teal color: RGB(20, 184, 166) - matches Tailwind teal-500
  const r = 20,
    g = 184,
    b = 166

  for (let y = 0; y < height; y++) {
    const rowStart = y * rowSize
    rawData[rowStart] = 0 // No filter
    for (let x = 0; x < width; x++) {
      const pixelStart = rowStart + 1 + x * 3
      rawData[pixelStart] = r
      rawData[pixelStart + 1] = g
      rawData[pixelStart + 2] = b
    }
  }

  // Compress with zlib (deflate)
  const compressed = Bun.deflateSync(rawData)

  return wrapChunk("IDAT", compressed)
}

function createIENDChunk(): Uint8Array {
  return wrapChunk("IEND", new Uint8Array(0))
}

function wrapChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(4 + 4 + data.length + 4)
  const view = new DataView(chunk.buffer)

  // Length
  view.setUint32(0, data.length, false)

  // Type
  for (let i = 0; i < 4; i++) {
    chunk[4 + i] = type.charCodeAt(i)
  }

  // Data
  chunk.set(data, 8)

  // CRC32
  const crcData = new Uint8Array(4 + data.length)
  crcData.set(chunk.slice(4, 8), 0)
  crcData.set(data, 4)
  const crc = crc32(crcData)
  view.setUint32(8 + data.length, crc, false)

  return chunk
}

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i]
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

async function main() {
  console.log("🎨 Generating placeholder icons...")

  for (const size of SIZES) {
    const iconPath = join(ICONS_DIR, `icon${size}.png`)
    const iconData = await generateIcon(size)
    await Bun.write(iconPath, iconData)
    console.log(`✅ Generated icon${size}.png`)
  }

  console.log("✨ Icons generated!")
}

main()
