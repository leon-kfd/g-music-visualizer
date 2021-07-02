import { Canvas } from "@antv/g-canvas";
import { ext } from '@antv/matrix-util';

const { transform } = ext

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
  canvas.addShape('circle', {
    attrs: {
      x,
      y,
      r,
      fill: '#262626',
      ...shadowConfig
    }
  })
  const shape = canvas.addShape('image', {
    attrs: {
      x: x - r,
      y: y - r,
      width: 2 * r,
      height: 2 * r,
      img: `https://source.unsplash.com/random/${2 * r}x${2 * r}?Nature`
    }
  })
  shape.setClip({
    type: 'circle',
    attrs: {
      x,
      y,
      r
    }
  })

  // 旋转动画
  const matrix = shape.getMatrix()
  const radian = 2 * Math.PI
  shape.animate((ratio: number) => {
    return {
      matrix: transform(matrix, [
        ['t', -x, -y],
        ['r', radian * ratio],
        ['t', x, y],
      ])
    }
  }, {
    duration: 10000,
    repeat: true
  })
  setTimeout(() => {
    shape.pauseAnimate()
  })

  return shape
}
