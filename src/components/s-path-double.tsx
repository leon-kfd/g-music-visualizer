import React, { useEffect, useRef } from "react";
import { Canvas, IShape } from '@antv/g-canvas';
import { formatToTransit, getCirclePath } from '../utils'
import { line, curveCardinalClosed } from 'd3'
import { getImageCircle } from '../utils/base';
interface SPathDouble {
  isPlaying: boolean;
  data: number[];
}

export default function SPath(props: SPathDouble) {
  const POINT_NUM = 64
  const X = 200
  const Y = 200
  const R = 100
  const OFFSET = 10
  const COLOR = '#e9dcf7'
  // const COLORS = ['#e9dcf7', '#cdd9f5', '#cdf5dd', '#f3dfbb']

  const canvas = useRef<Canvas>()
  const circle = useRef<IShape>()

  const sPath = useRef<IShape>()
  const lineArr = useRef<IShape[]>([])

  function getArray(arr: number[]) {
    let _arr: number[] = [];
    arr.map((item,index) => {
      if (index % 2) {
        _arr.push(item)
      }
    })
    return formatToTransit(_arr, 3, 0.5)
  }

  function getPointByIndex(index: number, addHeight = 0):[number, number] {
    const deg = index * (360 / POINT_NUM) - 150;
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    const r = R + OFFSET + addHeight
    return [X + l * r, Y + t * r]
  }

  useEffect(() => {
    if (props.data?.length) {
      const pathPointArr: [number,number][] = []
      const arr = getArray(props.data)
      arr.map((item,index) => {
        const point1 = getPointByIndex(index, item * item / 65025 * 60)
        const point2 = getPointByIndex(index, -item * item / 65025 * 12)
        pathPointArr[index] = point1
        pathPointArr[arr.length + index] = point2
        lineArr.current[index].attr('x1', point1[0])
        lineArr.current[index].attr('y1', point1[1])
        lineArr.current[index].attr('x2', point2[0])
        lineArr.current[index].attr('y2', point2[1])
      })
      const path = line().x((d: [number,number]) => d[0]).y((d: [number, number]) => d[1]).curve(curveCardinalClosed)(pathPointArr)
      sPath.current?.attr('path', path)
    }
  }, [
    props.data
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SPathDouble',
      width: 400,
      height: 400,
    });

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: COLOR
    })

    sPath.current = canvas.current.addShape('path', {
      attrs: {
        stroke: COLOR,
        lineWidth: 1,
        path: getCirclePath(X, Y, R + OFFSET)
      }
    })

    lineArr.current = Array.from({length: POINT_NUM}, (item, index) => {
      return (canvas.current as Canvas).addShape('line', {
        attrs: {
          x1: X,
          y1: Y - R,
          x2: X,
          y2: Y - R,
          stroke: COLOR,
          lineWidth: 1
        }
      })
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
      <div id="SPathDouble" className="s-canvas-wrapper"></div>
    </div>
  )
}