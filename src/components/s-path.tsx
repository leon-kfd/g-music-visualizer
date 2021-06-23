import React, { useEffect, useRef } from "react";
import { Canvas, IShape } from '@antv/g-canvas';
import { formatToTransit } from '../utils'
import { line, curveCardinalClosed } from 'd3'
import { getImageCircle } from '../utils/base';
interface SPathProps {
  isPlaying: boolean;
  data: number[];
}

export default function SPath(props: SPathProps) {
  const POINT_NUM = 64
  const X = 200
  const Y = 200
  const R = 100
  const OFFSET = 4
  const POINT_OFFSET = 30
  const COLORS = ['#e9dcf7', '#cdd9f5', '#cdf5dd', '#f3dfbb']
  // const COLORS = ['#4E4BD7', '#BB4BD7', '#4BD773', '#D7544B']

  const canvas = useRef<Canvas>()
  const circle = useRef<IShape>()
  const sPathArr = useRef<IShape[]>([])

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
    const r = R + OFFSET + addHeight
    return [X + l * r, Y + t * r]
  }

  useEffect(() => {
    if (props.data?.length) {
      const pathArr: any[] = [[],[],[],[]]
      getArray(props.data).map((item,index) => {
        pathArr[index % 4].push(getPointByIndex(index, item * item / 65025 * POINT_OFFSET + 4))
      })
      pathArr.map((item,index) => {
        const path = line().x((d: [number,number]) => d[0]).y((d: [number, number]) => d[1]).curve(curveCardinalClosed)(item)
        sPathArr.current[index]?.attr('path', path)
      })
    }
  }, [
    props.data
  ])

  useEffect(() => {
    canvas.current = new Canvas({
      container: 'SPath',
      width: 400,
      height: 400,
    });

    circle.current = getImageCircle(canvas.current, {
      x: X,
      y: Y,
      r: R,
      shadowColor: COLORS[0]
    })

    const PointArr = Array.from({ length: POINT_NUM / 4 }, (item, index: number) => {
      return getPointByIndex(index * 4)
    })
    const path = line().x((d: [number,number]) => d[0]).y((d: [number, number]) => d[1]).curve(curveCardinalClosed)(PointArr)
    Array.from({ length: 4 }, (item, index: number) => {
      sPathArr.current.push((canvas.current as Canvas).addShape('path', {
        attrs: {
          stroke: COLORS[index],
          lineWidth: 1,
          path
        }
      }))
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
      <div id="SPath" className="s-canvas-wrapper"></div>
    </div>
  )
}