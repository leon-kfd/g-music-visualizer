import React, { useEffect, useRef, useState } from "react";
import { Canvas, IShape } from '@antv/g-canvas';
import { getCirclePath } from '../utils'
import { getImageCircle } from '../utils/base';

interface SCircleProps {
  isPlaying: boolean;
  data: number[];
}

export default function SCircle(props: SCircleProps) {
  const X = 200
  const Y = 200
  const R = 100
  const LINE_COLOR = '#fff'
  const DOT_COLOR = '#e9dcf7'
  const DOT_R = 5
  const CIRCLE_NUM = 3
  const CIRCLE_DELAY = 2000

  const canvas = useRef<Canvas>()
  const circle = useRef<IShape>()

  const circleArr = useRef<IShape[]>([])
  const circleDotArr = useRef<IShape[]>([])
  const circleDotDegArr = useRef<number[]>([])
  const circleArrStart = useRef<boolean[]>([])

  const realtimeData = useRef<number[]>([])

  // 拾取初始角度
  const pickStartPoint = () => {
    // 以下realtimeData为实时音频数据，将随机峰值最高的10个选出1个作为初始角度
    const arr = realtimeData.current || []
    const _arr = arr.sort((a, b) => b - a).slice(0, 10)
    const random = ~~(Math.random() * 10)
    const randomValue = _arr[random]
    const index = arr.findIndex(i => i === randomValue)
    const result = ~index ? index * 360 / arr.length : 1

    // 未对音频数据进行拾取，直接使用了随机角度，未找到合适算法
    // const result = ~~(Math.random() * 360)
    return result
  }

  useEffect(() => {
    realtimeData.current = props.data || []
  }, [props.data])

  useEffect(() => {
    if (!canvas.current) {
      canvas.current = new Canvas({
        container: 'SCircle',
        width: 400,
        height: 400,
      });

      circle.current = getImageCircle(canvas.current, {
        x: X,
        y: Y,
        r: R,
        shadowColor: '#fcc8d9'
      })

      const addCircle = () => {
        return (canvas.current as Canvas).addShape('path', {
          attrs: {
            stroke: LINE_COLOR,
            lineWidth: 2,
            path: getCirclePath(X, Y, R),
            opacity: 0
          }
        })
      };
      const addCircleDot = () => {
        return (canvas.current as Canvas).addShape('circle', {
          attrs: {
            x: X,
            y: Y - R,
            r: DOT_R,
            fill: LINE_COLOR,
            shadowColor: DOT_COLOR,
            shadowBlur: DOT_R,
            opacity: 0
          }
        })
      }
      const animateOption = {
        duration: 6000,
        easing: 'easeLinear',
        repeat: true
      }
      Array.from({ length: CIRCLE_NUM }, (item, index) => {
        circleArrStart.current.push(false)
        // circle
        circleArr.current.push(addCircle())
        circleArr.current[index].animate((ratio: number) => {
          return {
            path: getCirclePath(X, Y, R + ratio * 80),
            opacity: ratio > 0.02 && ratio < 0.9 ? 0.8 - ratio * 0.8 : 0
          }
        }, animateOption)
        // circle-dot
        circleDotArr.current.push(addCircleDot())
        circleDotDegArr.current.push(0)
        circleDotArr.current[index].animate((ratio: number) => {
          if (props.data && ratio < 0.05 && !circleDotDegArr.current[index]) {
            circleDotDegArr.current[index] = pickStartPoint()
          } else if (ratio > 0.9) {
            circleDotDegArr.current[index] = 0
          }
          const deg = circleDotDegArr.current[index] + ratio * 360 - 180
          const l = Math.cos(deg * Math.PI / 180)
          const t = Math.sin(deg * Math.PI / 180)
          const r = R + ratio * 80
          return {
            x: X + l * r,
            y: Y + t * r,
            r: DOT_R * (1 - ratio / 2),
            opacity: ratio > 0.05 && ratio < 0.9 ? 0.8 - ratio * 0.8 : 0
          }
        }, animateOption)
      })
    }

    if (props.isPlaying) {
      for(let i = 0; i < circleArr.current.length; i++) {
        if (circleArrStart.current[i]) {
          circleArr.current[i].resumeAnimate()
          circleDotArr.current[i].resumeAnimate()
        } else {
          setTimeout(() => {
            circleArr.current[i].resumeAnimate()
            circleDotArr.current[i].resumeAnimate()
            circleArrStart.current[i] = true 
          }, i * CIRCLE_DELAY)
        }
      }
    } else {
      setTimeout(() => {
        for(let i = 0; i < circleArr.current.length; i++) {
          circleArr.current[i].pauseAnimate()
          circleDotArr.current[i].pauseAnimate()
        }
      })
    }
  }, [props.isPlaying])

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
      <div id="SCircle" className="s-canvas-wrapper"></div>
    </div>
  )
}