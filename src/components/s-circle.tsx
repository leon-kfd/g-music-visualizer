import React, { useEffect, useRef } from "react";
import { Canvas, Image, Circle, Group } from '@antv/g';
import { Renderer } from '@antv/g-canvas';
import { getImageCircle } from '../utils/base';
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

export default function SCircle(props: SComponentProps) {
  const LINE_COLOR = '#fff'
  const DOT_COLOR = '#e9dcf7'
  const DOT_R = 5
  const CIRCLE_NUM = 3
  const CIRCLE_DELAY = 2000
  const CIRCLE_SCALE_RARIO = 2

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const circleArr = useRef<Group[]>([])
  const circleDotArr = useRef<Circle[]>([])
  const circleDotDegArr = useRef<number[]>([])
  const circleArrStart = useRef<boolean[]>([])

  const realtimeData = useRef<number[]>([])

  const isPlaying = useRef(false)

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
        width: 2 * X,
        height: 2 * Y,
        renderer: new Renderer()
      });

      circle.current = getImageCircle(canvas.current, {
        x: X,
        y: Y,
        r: R,
        shadowColor: '#fcc8d9'
      })

      const addCircle = () => {
        const circle = new Circle({
          style: {
            stroke: LINE_COLOR,
            lineWidth: 2,
            opacity: 1,
            cx: X,
            cy: Y,
            r: R,
          }
        })
        // const circleDot = new Circle({
        //   style: {
        //     cx: X,
        //     cy: Y,
        //     r: DOT_R,
        //     fill: LINE_COLOR,
        //     shadowColor: DOT_COLOR,
        //     shadowBlur: DOT_R,
        //     opacity: 1,
        //     transform: `translate(${R}, 0)`
        //   }
        // })
        const group = new Group({
          style: {
            x: 0,
            y: 0
          }
        })
        // group.style.transform = `rotate(180deg) scale(1.5)`
        group.appendChild(circle)
        group.scaleLocal(1)
        // group.appendChild(circleDot)
        canvas.current?.appendChild(group)
        return group
      };
      const animateOption = {
        duration: CIRCLE_DELAY * CIRCLE_NUM,
        iterations: Infinity
      }
      Array.from({ length: CIRCLE_NUM }, (item, index) => {
        circleArrStart.current.push(false)
        circleArr.current.push(addCircle())
        // circleArr.current[index].animate(
        //   [
        //     { transform: 'scale(1)', opacity: 0.8 },
        //     { transform: `scale(${CIRCLE_SCALE_RARIO})`, opacity: 0 }
        //   ],
        //   animateOption
        // )
        // circle-dot
        // circleDotArr.current.push(addCircleDot())
        // circleDotDegArr.current.push(0)
        // circleDotArr.current[index].animate((ratio: number) => {
        //   if (props.data && ratio < 0.05 && !circleDotDegArr.current[index]) {
        //     circleDotDegArr.current[index] = pickStartPoint()
        //   } else if (ratio > 0.9) {
        //     circleDotDegArr.current[index] = 0
        //   }
        //   const deg = circleDotDegArr.current[index] + ratio * 360 - 180
        //   const l = Math.cos(deg * Math.PI / 180)
        //   const t = Math.sin(deg * Math.PI / 180)
        //   const r = R + ratio * CIRCLE_SCALE_OFFSET
        //   return {
        //     x: X + l * r,
        //     y: Y + t * r,
        //     r: DOT_R * (1 - ratio / 2),
        //     opacity: ratio > 0.05 && ratio < 0.9 ? 0.8 - ratio * 0.8 : 0
        //   }
        // }, animateOption)
      })
    }

    if (props.isPlaying) {
      for(let i = 0; i < circleArr.current.length; i++) {
        if (circleArrStart.current[i]) {
          // circleArr.current[i].getAnimations()?.[0]?.pause()
          // circleDotArr.current[i].resumeAnimate()
        } else {
          setTimeout(() => {
            if (!isPlaying.current) return
            circleArr.current[i].getAnimations()?.[0]?.play()
            // circleDotArr.current[i].resumeAnimate()
            circleArrStart.current[i] = true
          }, i * CIRCLE_DELAY)
        }
      }
    } else {
      setTimeout(() => {
        for(let i = 0; i < circleArr.current.length; i++) {
          circleArr.current[i].getAnimations()?.[0]?.pause()
          // circleDotArr.current[i].pauseAnimate()
        }
      })
    }
  }, [props.isPlaying])

  useEffect(() => {
    isPlaying.current = props.isPlaying
  }, [props.isPlaying])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SCircle" className="s-canvas-wrapper"></div>
  )
}