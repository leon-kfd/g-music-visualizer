import React, { useEffect, useRef } from "react";
import { Canvas, Image, Path, Circle } from '@antv/g';
import { Renderer } from '@antv/g-canvas'
import { line, curveCardinalClosed } from 'd3';
import { getImageCircle } from '../utils/base';
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

export default function SPathDot(props: SComponentProps) {
  const POINT_NUM = 128
  const PACE_NUM = 8 // 曲率优化跳点数, 2 ** n
  const JUME_OFFSET = 36 // 波动幅度
  const OFFSET = 10
  const DOT_R = 1.2
  const DOT_COLOR = '#e9dcf7'
  const SHADOW_OFFSET = 5
  const SHADOW_BLUR = 4
  const SHADOW_COLOR = '#22aaff'
  

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const sArr = useRef<Circle[]>([])
  const fakePath = useRef<Path>()

  function getArray(arr: number[]) {
    return arr
  }

  function getPointByIndex(index: number, addHeight = 0) {
    const deg = index * (360 / POINT_NUM) - 150;
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    const r = R + OFFSET + addHeight
    return [X + l * r, Y + t * r, l, t]
  }

  useEffect(() => {
    if (props.data?.length && fakePath.current) {
      const arr = getArray(props.data)
      const PointArr = arr.reduce((pre: any, item ,index) => {
        if (index % PACE_NUM) {
          return [...pre, getPointByIndex(index, item * item / 65025 * JUME_OFFSET + 4)]
        }
        return pre
      }, [])
      const path = line().x((d) => d[0]).y((d) => d[1]).curve(curveCardinalClosed)(PointArr) as string
      fakePath.current.attr('path', path)
      sArr.current.map((item,index) => {
        const { x, y } = (fakePath.current as any).getPoint(index / POINT_NUM)
        item.attr('cx', x)
        item.attr('cy', y)
      })
    }
  }, [
    props.data
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SPathDot',
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

    const PointArr = Array.from({ length: POINT_NUM / PACE_NUM }, (item, index: number) => {
      return getPointByIndex(index * PACE_NUM)
    })
    const path = line().x((d) => d[0]).y((d) => d[1]).curve(curveCardinalClosed)(PointArr as [number,number][]) as string
    fakePath.current = new Path({
      style: {
        lineWidth: 1,
        path
      }
    })
    canvas.current?.appendChild(fakePath.current)
    sArr.current = Array.from({ length: POINT_NUM }, (item, index: number) => {
      const { x, y } = (fakePath.current as Path)?.getPoint(index / POINT_NUM)
      const [, , l, t] = getPointByIndex(index)
      const shadowOffsetX = l * SHADOW_OFFSET
      const shadowOffsetY = t * SHADOW_OFFSET
      const circle = new Circle({
        style: {
          cx: x,
          cy: y,
          r: DOT_R,
          fill: DOT_COLOR,
          shadowColor: SHADOW_COLOR,
          shadowOffsetX: -shadowOffsetX,
          shadowOffsetY: -shadowOffsetY,
          shadowBlur: SHADOW_BLUR
        }
      })
      canvas.current?.appendChild(circle)
      return circle
    })
  }, [])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SPathDot" className="s-canvas-wrapper"></div>
  )
}