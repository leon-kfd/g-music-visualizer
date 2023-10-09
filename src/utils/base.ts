import { Canvas, Circle, Image } from "@antv/g";

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
      })
    }
  })
  canvas.appendChild(circle)
  canvas.appendChild(image)
  const animation = image.animate([
    { transform: 'rotate(0)' }, 
    { transform: 'rotate(360deg)' }
  ], {
    duration: 10000,
    iterations: Infinity
  })

  setTimeout(() => {
    animation?.pause()
  })

  return image
}
