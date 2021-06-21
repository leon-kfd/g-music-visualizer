import React, { useEffect, useRef } from "react";
import { Canvas } from '@antv/g-canvas';
import { IElement } from "@antv/g-canvas/lib/types";
import { formatToTransit } from '../utils'
interface SLineProps {
  data?: number[];
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
  const sArr = useRef<IElement[]>([])

  function getArray(arr: number[]) {
    const filterArr = arr.reduce((prev: number[], curr: number, index: number) => {
      if (index % 2) {
        prev.push(curr)
      }
      return prev
    }, [])
    return formatToTransit(filterArr)
  }

  useEffect(() => {
    if (props.data?.length) {
      const arr = getArray(props.data)
      arr.map((item,index) => {
        sArr.current[index].attr('height', item * item / 65025 * 50 + RECT_WIDTH)
      })
      // for (let i = 0; i < arr.length / 2; i++) {
      //   const item1 = arr[i]
      //   const item2 = arr[arr.length - i - 1]
      //   sArr.current[i].attr('height', item1 * item1 / 65025 * 50 + RECT_WIDTH)
      //   sArr.current[arr.length / 2 + i].attr('height', item2 * item2 / 65025 * 50 + RECT_WIDTH)
      // }
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
    
    canvas.current.addShape('circle', {
      attrs: {
        x: X,
        y: Y,
        r: R,
        fill: '#f0f0f2',
        shadowColor: RECT_COLOR,
        shadowBlur: 10
      },
    });

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

  return (
    <div className="s-model">
      <div id="SLine" className="s-canvas-wrapper"></div>
    </div>
  )
}