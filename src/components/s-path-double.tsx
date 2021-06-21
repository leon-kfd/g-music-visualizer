import React, { useEffect, useRef } from "react";
import { Canvas, IShape } from '@antv/g-canvas';
import { formatToTransit, getCirclePath } from '../utils'
import { line, curveCardinalClosed } from 'd3'
interface SPathDouble {
  data?: number[];
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
  const sPath = useRef<IShape>()

  function getArray(arr: number[]) {
    let _arr: number[] = [];
    arr.map((item,index) => {
      if (index % 2) {
        _arr.push(item)
      }
    })
    return formatToTransit(_arr, 7, 0.4)
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
      getArray(props.data).map((item,index) => {
        pathPointArr.push(getPointByIndex(index, item * item / 65025 * 60))
      })
      getArray(props.data).map((item, index) => {
        pathPointArr.push(getPointByIndex(index, -item * item / 65025 * 10))
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

    canvas.current.addShape('circle', {
      attrs: {
        x: X,
        y: Y,
        r: R,
        fill: '#f0f0f2',
        shadowColor: COLOR,
        shadowBlur: 10
      }
    });

    sPath.current = canvas.current.addShape('path', {
      attrs: {
        stroke: COLOR,
        lineWidth: 1,
        path: getCirclePath(X, Y, R + OFFSET)
      }
    })
    
  }, [])

  return (
    <div className="s-model">
      <div id="SPathDouble" className="s-canvas-wrapper"></div>
    </div>
  )
}