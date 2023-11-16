import React, { useEffect, useRef } from "react";
import { Canvas, Image, Rect } from '@antv/g-lite';
import { Renderer } from '@antv/g-canvas';
// import { formatToTransit } from '../utils'
import { getImageCircle } from '../utils/base'
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

export default function SLine(props: SComponentProps) {
  const POINT_NUM = 64
  const OFFSET = 10
  const RECT_WIDTH = 4
  const RECT_COLOR = '#e9dcf7'

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()
  const sArr = useRef<Rect[]>([])

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
      width: 2 * X,
      height: 2 * Y,
      renderer: new Renderer()
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

      const rect = new Rect({
        style: {
          width: RECT_WIDTH,
          height: RECT_WIDTH,
          radius: RECT_WIDTH / 2,
          x: X + l * r,
          y: Y + t * r,
          fill: RECT_COLOR
        }
      })
      rect.setOrigin(X + l * r, Y + t * r)
      rect.rotate(deg - 90)
      canvas.current?.appendChild(rect)
      return rect
    })
  }, [])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SLine" className="s-canvas-wrapper"></div>
  )
}