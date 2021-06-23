import React, { useEffect, useRef } from "react";
import { Canvas } from '@antv/g-canvas';
import { IElement, IShape } from "@antv/g-canvas/lib/types";
// import { formatToTransit } from '../utils'
import { getImageCircle } from '../utils/base'
interface SLineProps {
  isPlaying: boolean
  data: number[];
}

export default function SLine(props: SLineProps) {
  const POINT_NUM = 64
  const X = 200
  const Y = 200
  const R = 100
  const OFFSET = 10
  const RECT_WIDTH = 4
  const RECT_COLOR = '#e9dcf7'

  const canvas = useRef<Canvas>()
  const circle = useRef<IShape>()
  const sArr = useRef<IElement[]>([])

  function getArray(arr: number[]) {
    const filterArr = arr.reduce((prev: number[], curr: number, index: number) => {
      if (index % 2) {
        prev.push(curr)
      }
      return prev
    }, [])
    // return formatToTransit(filterArr, 5, 0.6)
    return filterArr
  }

  useEffect(() => {
    if (props.data?.length) {
      const arr = getArray(props.data)
      arr.map((item,index) => {
        sArr.current[index].attr('height', item * item / 65025 * 50 + RECT_WIDTH)
      })
    }
  }, [
    props.data
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SLine',
      width: 400,
      height: 400,
    });

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: RECT_COLOR
    })

    sArr.current = Array.from({ length: POINT_NUM }, (item, index: number) => {
      const deg = index * (360 / POINT_NUM) - 150;
      const l = Math.cos(deg * Math.PI / 180)
      const t = Math.sin(deg * Math.PI / 180)
      const r = R + OFFSET
      return (canvas.current as Canvas).addShape('rect', {
        attrs: {
          width: RECT_WIDTH,
          height: RECT_WIDTH,
          radius: RECT_WIDTH / 2,
          x: X + l * r - RECT_WIDTH / 2,
          y: Y + t * r - RECT_WIDTH / 2,
          fill: RECT_COLOR
        }
      }).rotateAtPoint(X + l * r, Y + t * r, (deg - 90) * Math.PI / 180)
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
      <div id="SLine" className="s-canvas-wrapper"></div>
    </div>
  )
}