import React, { useEffect, useRef } from 'react';
import { Canvas, Image, Circle, runtime } from '@antv/g';
import { Renderer } from '@antv/g-canvas'
import { getImageCircle } from '../utils/base'
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";

runtime.enableDataset = true

export default function SPaticle(props: SComponentProps) {
  const POINT_NUM = 64
  const PARTICLE_NUM = 12
  const OFFSET = 0
  const POINT_MOVE_LENGTH = 24
  const POINT_ACTIVE_MOVE_LENGTH = 64
  const POINT_CREATE_DELAY = 4000

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const particleArr = useRef<Circle[]>([])
  const particleStartArr = useRef<boolean[]>([])
  const particleActiveArr = useRef<number[]>([])

  const currentActiveIndex = useRef<number>(-1)
  const timer = useRef<ReturnType<typeof setTimeout>>()

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
          timer.current = undefined
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
        renderer: new Renderer(),
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

          const particleShape = new Circle({
            style: {
              cx: x,
              cy: y,
              r: 0.8,
              fill: '#fff',
              opacity: 0,
              transformOrigin: `${-l * R + 0.8}px ${-t * R + 0.8}px`,
              // ⚠开启阴影会掉帧
              // shadowColor: '#fcc8d9',
              // shadowBlur: 1
            }
          })
          particleShape.dataset.deg = deg
          particleShape.dataset.index1 = index1
          canvas.current?.appendChild(particleShape)
          // const particleShape = (canvas.current as Canvas).addShape('circle', {
          //   attrs: {
          //     x,
          //     y,
          //     r: 0.8,
          //     fill: '#fff',
          //     opacity: 0,
          //     // ⚠开启阴影会掉帧
          //     // shadowColor: '#fcc8d9',
          //     // shadowBlur: 1
          //   }
          // })
          // particleShape.animate((ratio: number) => {
          //   const deg = index1 * (360 / POINT_NUM) - 150 + Math.sin(ratio * 20) * 4;
          //   const l = Math.cos(deg * Math.PI / 180)
          //   const t = Math.sin(deg * Math.PI / 180)

          //   const _index = POINT_NUM * index1 + index2
          //   if (particleActiveArr.current[_index]) {
          //     if (ratio < 0.02) {
          //       particleActiveArr.current[_index] = 
          //         index1 >= currentActiveIndex.current - 1 && index1 <= currentActiveIndex.current + 1 
          //         ? POINT_ACTIVE_MOVE_LENGTH 
          //         : POINT_MOVE_LENGTH
          //     } else if (ratio > 0.98) {
          //       particleActiveArr.current[_index] = POINT_MOVE_LENGTH
          //     }
          //   }
          //   const offset = particleActiveArr.current[_index] || POINT_MOVE_LENGTH

          //   return {
          //     x: x + l * ratio * offset,
          //     y: y + t * ratio * offset,
          //     opacity: 1 - ratio
          //   }
          // }, {
          //   duration: POINT_CREATE_DELAY,
          //   repeat: true,
          //   easing: 'easeSinInOut'
          // })
          particleArr.current.push(particleShape)
          particleStartArr.current.push(false)
          particleActiveArr.current.push(POINT_MOVE_LENGTH)
        })
      })
    }

    if (props.isPlaying) {
      particleArr.current.map((item,index) => {
        if (particleStartArr.current[index]) {
          item.getAnimations()?.[0]?.play()
        } else {
          setTimeout(() => {
            if (!isPlaying.current) return
            runParticleAnimation(item)
            particleStartArr.current[index] = true 
          }, Math.random() * POINT_CREATE_DELAY)
        }
      })
    } else {
      setTimeout(() => {
        particleArr.current.map(item => {
          item.getAnimations()?.[0]?.pause()
        })
      })
    }
  }, [props.isPlaying])

  useEffect(() => {
    isPlaying.current = props.isPlaying
  }, [props.isPlaying])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  function runParticleAnimation(shape: Circle) {
    const deg = ~~shape.dataset.deg
    const index1 = ~~shape.dataset.index1
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    const length = index1 >= currentActiveIndex.current - 1 && index1 <= currentActiveIndex.current + 1 ? POINT_ACTIVE_MOVE_LENGTH : POINT_MOVE_LENGTH
    const arr = Array.from({ length: 4 }, (item, index) => {
      const randomDeg = Math.random() * 24 + deg
      const offset = 0.2 * (index + 1)
      const l = Math.cos(randomDeg * Math.PI / 180)
      const t = Math.sin(randomDeg * Math.PI / 180)
      return { transform: `translate(${l * length * offset }, ${t * length * offset})`, offset}
    })
    const animation = shape.animate(
      [
        { transform: 'translate(0, 0)', opacity: 1 },
        ...arr,
        { transform: `translate(${l * length}, ${t * length})`, opacity: 0 }
      ],
      {
        duration: POINT_CREATE_DELAY
      }
    )
    if (animation) {
      animation.onfinish = () => {
        animation.cancel() // release memory??
        runParticleAnimation(shape)
      }
    }
  }

  return (
    <div id="SParticle" className="s-canvas-wrapper"></div>
  )
}