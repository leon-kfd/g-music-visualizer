import React, { useEffect, useRef } from "react";
import { Canvas, Image, Circle } from '@antv/g-lite';
import { Renderer } from '@antv/g-canvas';
import { formatToTransit } from '../utils'
import { getImageCircle } from '../utils/base'
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

export default function SLine(props: SComponentProps) {
  const CIRCLE_NUM = 8
  const OFFSET = 8
  const CIRCLE_COLOR = '#e9dcf7'

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()
  const sArr = useRef<Circle[]>([])

  function getArray(arr: number[]) {
    let _arr: number[] = [];
    arr.map((item,index) => {
      if (index % 2) {
        _arr.push(item)
      }
    })
    return formatToTransit(_arr, 5, 0.75)
  }

  useEffect(() => {
    if (props.data?.length) {
      const arr = getArray(props.data)
      const part = 64 / CIRCLE_NUM
      arr.map((item,index) => {
        if (index % part === 0) {
          const _index = index / part
          const offset = item / 8
          const deg = _index * (360 / CIRCLE_NUM) - 150;
          const l = Math.cos(deg * Math.PI / 180)
          const t = Math.sin(deg * Math.PI / 180)
          sArr.current[_index]?.attr('cx', X + l * offset)
          sArr.current[_index]?.attr('cy', Y + t * offset)
        }
      })
    }
  }, [
    props.data
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SCircleMultiple',
      width: 2 * X,
      height: 2 * Y,
      renderer: new Renderer()
    });

    sArr.current = Array.from({ length: CIRCLE_NUM }, (item, index: number) => {
      const circle = new Circle({
        style: {
          cx: X,
          cy: Y,
          r: R + OFFSET,
          stroke: CIRCLE_COLOR,
          strokeWidth: 1,
          shadowColor: '#ffaa44',
          shadowBlur: 2,
        }
      })

      canvas.current?.appendChild(circle)
      return circle
    })

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: CIRCLE_COLOR
    })
  }, [])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SCircleMultiple" className="s-canvas-wrapper"></div>
  )
}