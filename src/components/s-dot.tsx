import React, { useEffect, useRef } from "react";
import { Canvas, Image, Circle, Line } from '@antv/g';
import { Renderer } from '@antv/g-canvas'
// import { formatToTransit } from '../utils'
import { getImageCircle } from '../utils/base';
import { X, Y, R } from '../utils/constanst';
import useAudioImg from "@/hooks/useAudioImg";

export default function SDot(props: SComponentProps) {
  const POINT_NUM = 64
  const OFFSET = 10
  const DOT_R = 2
  const DOT_COLOR = '#e9dcf7'
  const DOT_OFFSET = 24
  // const SHADOW_OFFSET = 5
  // const SHADOW_BLUR = 4
  // const SHADOW_COLOR = '#22aaff'
  

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const sArr = useRef<Circle[]>([])
  const lArr = useRef<Line[]>([])

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
        sArr.current[index].attr('cx', x)
        sArr.current[index].attr('cy', y)
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
      width: 2 * X,
      height: 2 * Y,
      renderer: new Renderer()
    });

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: DOT_COLOR
    })

    Array.from({ length: POINT_NUM }, (item, index: number) => {
      const [x, y, l, t] = getPointByIndex(index)
      const deg = ~~(index * (360 / POINT_NUM) + 210)
      const dot = new Circle({
        style: {
          cx: x,
          cy: y,
          r: DOT_R,
          fill: DOT_COLOR
        }
      })
      const line = new Line({
        style: {
          x1: x,
          y1: y,
          x2: x,
          y2: y,
          lineWidth: DOT_R * 1.4,
          stroke: `l(${deg}) 0.3:rgba(255,255,255,0) 1:${DOT_COLOR}`
        }
      })
      canvas.current?.appendChild(dot)
      canvas.current?.appendChild(line)
      sArr.current.push(dot)
      lArr.current.push(line)
    })
  }, [])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SDot" className="s-canvas-wrapper"></div>
  )
}