import React, { useEffect, useRef } from "react";
import { Canvas } from '@antv/g-canvas';
import { formatToTransit } from '../utils'
import { IElement, IShape } from "@antv/g-canvas/lib/types";
import { getImageCircle } from '../utils/base';
interface SDotProps {
  isPlaying: boolean;
  data: number[];
}

export default function SDot(props: SDotProps) {
  const POINT_NUM = 64
  const X = 200
  const Y = 200
  const R = 100
  const OFFSET = 10
  const DOT_R = 2
  const DOT_COLOR = '#e9dcf7'
  const DOT_OFFSET = 24
  const SHADOW_OFFSET = 5
  const SHADOW_BLUR = 4
  const SHADOW_COLOR = '#22aaff'
  

  const canvas = useRef<Canvas>()
  const circle = useRef<IShape>()

  const sArr = useRef<IElement[]>([])
  const lArr = useRef<IElement[]>([])

  function getArray(arr: number[]) {
    // return formatToTransit(arr, 13, 0.92)
    return arr.reduce((pre: number[],curr,index) => {
      if (index % 2) return [...pre, curr]
      return pre
    }, [])
  }

  function getPointByIndex(index: number, addHeight = 0) {
    const deg = index * (360 / POINT_NUM) - 150;
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    const r = R + OFFSET + addHeight
    return [X + l * r, Y + t * r, l, t]
  }

  useEffect(() => {
    if (props.data?.length) {
      getArray(props.data).map((item,index) => {
        const [x, y] = getPointByIndex(index, item * item / 65025 * DOT_OFFSET + 4)
        sArr.current[index].attr('x', x)
        sArr.current[index].attr('y', y)
        lArr.current[index].attr('x2', x)
        lArr.current[index].attr('y2', y)
      })
    }
  }, [
    props.data
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SDot',
      width: 400,
      height: 400,
    });

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: DOT_COLOR
    })

    // sArr.current = Array.from({ length: POINT_NUM }, (item, index: number) => {
    //   const [x, y, l, t] = getPointByIndex(index)
    //   const shadowOffsetX = l * SHADOW_OFFSET
    //   const shadowOffsetY = t * SHADOW_OFFSET
    //   return (canvas.current as Canvas).addShape('circle', {
    //     attrs: {
    //       x,
    //       y,
    //       r: DOT_R,
    //       fill: DOT_COLOR,
    //       shadowColor: SHADOW_COLOR,
    //       shadowOffsetX: -shadowOffsetX,
    //       shadowOffsetY: -shadowOffsetY,
    //       shadowBlur: SHADOW_BLUR
    //     }
    //   })
    // })
    Array.from({ length: POINT_NUM }, (item, index: number) => {
      const [x, y, l, t] = getPointByIndex(index)
      const deg = ~~(index * (360 / POINT_NUM) + 210)
      const dot = (canvas.current as Canvas).addShape('circle', {
        attrs: {
          x,
          y,
          r: DOT_R,
          fill: DOT_COLOR
        }
      })
      const line = (canvas.current as Canvas).addShape('line', {
        attrs: {
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          lineWidth: DOT_R * 1.4,
          stroke: `l(${deg}) 0.3:rgba(255,255,255,0) 1:${DOT_COLOR}`
        }
      })
      sArr.current.push(dot)
      lArr.current.push(line)
    })
  }, [])

  useEffect(() => {
    setTimeout(() => {
      if (props.isPlaying) {
        circle.current?.resumeAnimate()
      } else {
        circle.current?.pauseAnimate()
      }
    })
  }, [props.isPlaying])

  return (
    <div className="s-model">
      <div id="SDot" className="s-canvas-wrapper"></div>
    </div>
  )
}