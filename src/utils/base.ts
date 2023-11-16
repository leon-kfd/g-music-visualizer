import { Canvas, Circle, Image } from "@antv/g-lite";
import { DEFAULT_IMG } from '@/global'

type ImageCircleConfig = {
  x: number;
  y: number;
  r: number;
  shadowColor?: string
}
export function getImageCircle(canvas: Canvas, { x, y, r, shadowColor }: ImageCircleConfig) {
  const shadowConfig = shadowColor ? {
    shadowColor,
    shadowBlur: 16
  } : {}
  const circle = new Circle({
    style: {
      cx: x,
      cy: y,
      r,
      fill: '#262626',
      ...shadowConfig
    }
  })
  const image = new Image({
    id: 'audioImg',
    style: {
      x: x - r,
      y: y - r,
      width: 2 * r,
      height: 2 * r,
      transformOrigin: 'center',
      clipPath: new Circle({
        style: {
          cx: x,
          cy: y,
          r
        }
      }),
      img: DEFAULT_IMG
    }
  })
  canvas?.appendChild(circle)
  canvas?.appendChild(image)
  const animation = image?.animate([
    { transform: 'rotate(0)' }, 
    { transform: 'rotate(360deg)' }
  ], {
    duration: 12000,
    iterations: Infinity
  })

  setTimeout(() => {
    animation?.pause()
  })

  return image
}


function getImageThemeColor(img: HTMLImageElement) {
  // 提取图片主题色
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const { width, height } = img
  canvas.width = width
  canvas.height = height
  ctx.drawImage(img, 0, 0, width, height)
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const avgR = ~~(r / (width * height))
  const avgG = ~~(g / (width * height))
  const avgB = ~~(b / (width * height))
  const hex = rgbToHex(avgR, avgG, avgB)
  return hex
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}