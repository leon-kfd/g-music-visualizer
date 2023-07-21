import React, { useEffect, useRef } from "react";
import { Canvas, IShape } from '@antv/g-canvas';
import { IElement } from "@antv/g-canvas/lib/types";
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
  const circle = useRef<IShape>()

  const sArr = useRef<IElement[]>([])
  const fakePath = useRef<IElement>()

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
      const path = line().x((d) => d[0]).y((d) => d[1]).curve(curveCardinalClosed)(PointArr)
      fakePath.current.attr('path', path)
      sArr.current.map((item,index) => {
        const { x, y } = (fakePath.current as any).getPoint(index / POINT_NUM)
        item.attr('x', x)
        item.attr('y', y)
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
    const path = line().x((d) => d[0]).y((d) => d[1]).curve(curveCardinalClosed)(PointArr as [number,number][])
    fakePath.current = canvas.current.addShape('path', {
      attrs: {
        lineWidth: 1,
        path
      }
    })
    sArr.current = Array.from({ length: POINT_NUM }, (item, index: number) => {
      const { x, y } = (fakePath.current as any).getPoint(index / POINT_NUM)
      const [, , l, t] = getPointByIndex(index)
      const shadowOffsetX = l * SHADOW_OFFSET
      const shadowOffsetY = t * SHADOW_OFFSET
      return (canvas.current as Canvas).addShape('circle', {
        attrs: {
          x,
          y,
          r: DOT_R,
          fill: DOT_COLOR,
          shadowColor: SHADOW_COLOR,
          shadowOffsetX: -shadowOffsetX,
          shadowOffsetY: -shadowOffsetY,
          shadowBlur: SHADOW_BLUR
        }
      })
    })
  }, [])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SPathDot" className="s-canvas-wrapper"></div>
  )
}