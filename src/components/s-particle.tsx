import React, { useEffect, useRef } from 'react';
import { Canvas, Image, Circle } from '@antv/g';
import { Renderer } from '@antv/g-canvas'
import { getImageCircle } from '../utils/base'
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

export default function SPaticle(props: SComponentProps) {
  const POINT_NUM = 64
  const PARTICLE_NUM = 12
  const OFFSET = 0
  const POINT_MOVE_LENGTH = 18
  const POINT_ACTIVE_MOVE_LENGTH = 48
  const POINT_CREATE_DELAY = 4000

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const particleArr = useRef<Circle[]>([])
  const particleStartArr = useRef<boolean[]>([])
  const particleActiveArr = useRef<number[]>([])

  const currentActiveIndex = useRef<number>(-1)
  const timer = useRef<number>()

  const isPlaying = useRef(false)

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
            if (!isPlaying.current) return
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
    isPlaying.current = props.isPlaying
  }, [props.isPlaying])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  return (
    <div id="SParticle" className="s-canvas-wrapper"></div>
  )
}