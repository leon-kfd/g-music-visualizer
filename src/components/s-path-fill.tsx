import React, { useEffect, useRef } from "react";
import { Canvas, IShape } from '@antv/g-canvas';
import { formatToTransit, addColorOpacity } from '../utils'
import { line, curveCardinalClosed } from 'd3'
import { getImageCircle } from '../utils/base';
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

export default function SLine(props: SComponentProps) {
  const POINT_NUM = 64
  const POINT_OFFSET = 60
  // const COLORS = ['#cdf5dd', '#e8fdc8', '#dafcf0', '#f3f8c9']
  const COLORS = ['#81D8F2', '#67A1E0', '#5263C2', '#74E1A5']

  const canvas = useRef<Canvas>()
  const circle = useRef<IShape>()

  const SPathFillArr = useRef<IShape[]>([])

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
        SPathFillArr.current[index].attr('path', path)
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
    });

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: '#ffffff'
    }).setZIndex(2)

    const PointArr = Array.from({ length: POINT_NUM / 4 }, (item, index: number) => {
      return getPointByIndex(index * 4)
    })
    const path = line().x((d: [number,number]) => d[0]).y((d: [number, number]) => d[1]).curve(curveCardinalClosed)(PointArr)
    Array.from({ length: 4 }, (item, index: number) => {
      SPathFillArr.current.push((canvas.current as Canvas).addShape('path', {
        attrs: {
          stroke: COLORS[index],
          lineWidth: 1,
          path,
          fill: addColorOpacity(COLORS[index], 0.2)
        }
      }).setZIndex(1))
    })
  }, [])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div className="s-model">
      <div id="SPathFill" className="s-canvas-wrapper"></div>
    </div>
  )
}