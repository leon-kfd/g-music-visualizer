import React, { useEffect, useRef } from "react";
import { Canvas, Image, Path } from '@antv/g-lite';
import { Renderer } from '@antv/g-canvas';
import { formatToTransit, addColorOpacity } from '../utils'
import { line, curveCardinalClosed } from 'd3'
import { getImageCircle } from '../utils/base';
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

export default function SLine(props: SComponentProps) {
  const POINT_NUM = 64
  const POINT_OFFSET = 60
  const COLORS = ['#90E3F5', '#5C8AF4', '#BEABF0', '#E1A2E1']

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const SPathFillArr = useRef<Path[]>([])

  function getArray(arr: number[]) {
    let _arr: number[] = [];
    arr.map((item,index) => {
      if (index % 2) {
        _arr.push(item)
      }
    })
    return formatToTransit(_arr, 5, 0.75)
  }

  function getPointByIndex(index: number, addHeight = 0):[number, number] {
    const deg = index * (360 / POINT_NUM) - 150;
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    const r = R + addHeight
    return [X + l * r, Y + t * r]
  }

  useEffect(() => {
    if (props.data?.length) {
      const pathArr: any[] = [[],[],[],[]]
      getArray(props.data).map((item,index) => {
        pathArr[index % 4].push(getPointByIndex(index, item * item / 65025 * POINT_OFFSET))
      })
      pathArr.map((item,index) => {
        const path = line().x((d: [number,number]) => d[0]).y((d: [number, number]) => d[1]).curve(curveCardinalClosed)(item)
        if (path) {
          SPathFillArr.current[index].attr('path', path)
        }
      })
    }
  }, [
    props.data
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SPathFill',
      width: 2 * X,
      height: 2 * Y,
      renderer: new Renderer()
    });

    const PointArr = Array.from({ length: POINT_NUM / 4 }, (item, index: number) => {
      return getPointByIndex(index * 4)
    })
    const path = line().x((d: [number,number]) => d[0]).y((d: [number, number]) => d[1]).curve(curveCardinalClosed)(PointArr)
    Array.from({ length: 4 }, (item, index: number) => {
      if (path) {
        const pathEl = new Path({
          style: {
            stroke: COLORS[index],
            lineWidth: 2,
            path,
            fill: 'rgba(255,255,255,0.2)'
            // fill: addColorOpacity(COLORS[index], 0.3)
          }
        })
        canvas.current?.appendChild(pathEl)
        SPathFillArr.current.push(pathEl)
      }
    })

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: '#ffffff'
    })
  }, [])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SPathFill" className="s-canvas-wrapper"></div>
  )
}