import React, { useEffect, useRef } from "react";
import { Canvas } from '@antv/g-canvas';
import { formatToTransit } from '../utils'
import { IElement } from "@antv/g-canvas/lib/types";
interface SDotProps {
  data?: Uint8Array;
  freshTime?: number;
}

export default function SLine(props: SDotProps) {
  const POINT_NUM = 128
  const X = 200
  const Y = 200
  const R = 100
  const OFFSET = 10
  const DOT_R = 1.2

  const canvas = useRef<Canvas>()
  const sArr = useRef<IElement[]>([])

  function getArray(arr: Uint8Array) {
    return formatToTransit([...arr], 13, 0.95)
  }

  function getPointByIndex(index: number, addHeight = 0) {
    const deg = index * (360 / POINT_NUM) - 150;
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    const r = R + OFFSET + addHeight
    return [X + l * r, Y + t * r]
  }

  useEffect(() => {
    if (props.data) {
      const arr = getArray(props.data)
      for (let i = 0; i < arr.length / 2; i++) {
        const item1 = arr[i]
        const item2 = arr[arr.length - i - 1]
        
        const [x1, y1] = getPointByIndex(i, item1 * item1 / 65025 * 20 + 4)
        const [x2, y2] = getPointByIndex(arr.length / 2 + i, item2 * item2 / 65025 * 20 + 4)
        sArr.current[i].attr('x', x1)
        sArr.current[i].attr('y', y1)
        sArr.current[arr.length / 2 + i].attr('x', x2)
        sArr.current[arr.length / 2 + i].attr('y', y2)
      }
    }
  }, [
    props.freshTime
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SDot',
      width: 400,
      height: 400,
    });
    
    canvas.current.addShape('circle', {
      attrs: {
        x: X,
        y: Y,
        r: R,
        fill: '#f5f5f7',
        stroke: 'transparent',
        lineWidth: 4,
      },
    });

    sArr.current = Array.from({ length: POINT_NUM }, (item, index: number) => {
      const [x, y] = getPointByIndex(index)
      return (canvas.current as Canvas).addShape('circle', {
        attrs: {
          x,
          y,
          r: DOT_R,
          fill: '#e9dcf7'
        }
      })
    })
  }, [])

  return (
    <div className="s-model">
      <div id="SDot" className="s-canvas-wrapper"></div>
    </div>
  )
}