import React, { useEffect, useRef } from 'react';
import { Canvas, IShape } from '@antv/g-canvas';
import { getImageCircle } from '../utils/base'

interface SPaticle {
  isPlaying: boolean;
  data: number[];
}

export default function SPaticle(props: SPaticle) {
  const POINT_NUM = 64
  const PARTICLE_NUM = 8
  const X = 200
  const Y = 200
  const R = 100
  const OFFSET = 0
  const POINT_MOVE_LENGTH = 18
  const POINT_ACTIVE_MOVE_LENGTH = 48
  const POINT_CREATE_DELAY = 4000

  const canvas = useRef<Canvas>()
  const circle = useRef<IShape>()

  const particleArr = useRef<IShape[]>([])
  const particleStartArr = useRef<boolean[]>([])
  const particleActiveArr = useRef<number[]>([])

  const currentActiveIndex = useRef<number>(-1)
  const timer = useRef<number>()
  useEffect(() => {
    if (props.isPlaying && props.data && props.data.length) {
      if (timer.current) {
        return
      } else {
        timer.current = setTimeout(() => {
          const arr = props.data ? props.data.reduce((pre: number[],curr,index) => {
            if (index % 2) return [...pre, curr]
            return pre
          }, []) : []
          const _arr = arr.sort((a, b) => b - a).slice(0, 10)
          const random = ~~(Math.random() * 10)
          const randomValue = _arr[random]
          const result = arr.findIndex(i => i === randomValue)

          // currentActiveIndex.current = ~~(Math.random() * POINT_NUM)
          currentActiveIndex.current = result
          timer.current = 0
          clearTimeout(timer.current)
        }, 300)
      }
    }
  }, [props.isPlaying, props.data])

  useEffect(() => {
    if (!canvas.current) {
      canvas.current = new Canvas({
        container: 'SParticle',
        width: 400,
        height: 400,
      });

      circle.current = getImageCircle(canvas.current, {
        x: X,
        y: Y,
        r: R,
        shadowColor: '#fcc8d9'
      })
      
      Array.from({ length: POINT_NUM }, (point, index1) => {
        Array.from({ length: PARTICLE_NUM }, (particle, index2) => {
          const deg = index1 * (360 / POINT_NUM) - 150 + (Math.random() - 0.5) * 10;
          const l = Math.cos(deg * Math.PI / 180)
          const t = Math.sin(deg * Math.PI / 180)
          const r = R + OFFSET

          const x = X + l * r
          const y = Y + t * r

          const particleShape = (canvas.current as Canvas).addShape('circle', {
            attrs: {
              x,
              y,
              r: 0.8,
              fill: '#fff',
              opacity: 0,
              // ⚠开启阴影会掉帧
              // shadowColor: '#fcc8d9',
              // shadowBlur: 1
            }
          })
          particleShape.animate((ratio: number) => {
            const deg = index1 * (360 / POINT_NUM) - 150 + Math.sin(ratio * 20) * 4;
            const l = Math.cos(deg * Math.PI / 180)
            const t = Math.sin(deg * Math.PI / 180)

            const _index = POINT_NUM * index1 + index2
            if (particleActiveArr.current[_index]) {
              if (ratio < 0.02) {
                particleActiveArr.current[_index] = 
                  index1 >= currentActiveIndex.current - 1 && index1 <= currentActiveIndex.current + 1 
                  ? POINT_ACTIVE_MOVE_LENGTH 
                  : POINT_MOVE_LENGTH
              } else if (ratio > 0.98) {
                particleActiveArr.current[_index] = POINT_MOVE_LENGTH
              }
            }
            const offset = particleActiveArr.current[_index] || POINT_MOVE_LENGTH

            return {
              x: x + l * ratio * offset,
              y: y + t * ratio * offset,
              opacity: 1 - ratio
            }
          }, {
            duration: POINT_CREATE_DELAY,
            repeat: true,
            easing: 'easeSinInOut'
          })
          particleArr.current.push(particleShape)
          particleStartArr.current.push(false)
          particleActiveArr.current.push(POINT_MOVE_LENGTH)
        })
      })
    }

    if (props.isPlaying) {
      particleArr.current.map((item,index) => {
        if (particleStartArr.current[index]) {
          item.resumeAnimate()
        } else {
          setTimeout(() => {
            item.resumeAnimate()
            particleStartArr.current[index] = true 
          }, Math.random() * POINT_CREATE_DELAY)
        }
      })
    } else {
      setTimeout(() => {
        particleArr.current.map(item => {
          item.pauseAnimate()
        })
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
      <div id="SParticle" className="s-canvas-wrapper"></div>
    </div>
  )
}