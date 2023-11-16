import React, { useEffect, useRef } from 'react';
import { Canvas, Image, Circle } from '@antv/g-lite';
import { Renderer } from '@antv/g-canvas'
import { getImageCircle } from '../utils/base'
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg"
import useDocumentVisibility from '@/hooks/useDocumenVisiblity'
import Timer from '@/utils/timer'

export default function SPaticle(props: SComponentProps) {
  const POINT_NUM = 48
  const PARTICLE_NUM = 8
  const OFFSET = 0
  const POINT_MOVE_LENGTH = 20
  const POINT_ACTIVE_MOVE_LENGTH = 64
  const POINT_CREATE_DELAY = 4000

  const DOT_R = 0.64

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const particleArr = useRef<Array<Circle & { _timer?: Timer }>>([])

  const currentActiveIndex = useRef<number>(-1)
  const timer = useRef<ReturnType<typeof setTimeout>>()

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
        renderer: new Renderer() as any,
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
              r: DOT_R,
              fill: '#fff',
              opacity: 0,
              transformOrigin: `${-l * R + DOT_R}px ${-t * R + DOT_R}px`
            }
          })
          particleShape.dataset.deg = deg
          particleShape.dataset.index1 = index1
          canvas.current?.appendChild(particleShape)
          particleArr.current.push(particleShape)
        })
      })
    }

    if (props.isPlaying) {
      togglePlay(true)
    } else {
      togglePlay(false)
    }
  }, [props.isPlaying])

  useAudioImg(canvas, circle, props.isPlaying, props.audioImg)

  function togglePlay(toPlay = true) {
    const key = toPlay ? 'play' : 'pause'
    for(let i = 0; i < particleArr.current.length; i++) {
      const particleAn = particleArr.current[i].getAnimations()?.[0]
      if (particleAn) {
        particleAn[key]()
      } else {
        if (particleArr.current[i]._timer) {
          particleArr.current[i]._timer?.[key]()
        } else if (toPlay) {
          particleArr.current[i]._timer = new Timer(() => {
            runParticleAnimation(particleArr.current[i])
          }, Math.random() * POINT_CREATE_DELAY)
        }
      }
    }
  }

  function runParticleAnimation(shape: Circle) {
    const deg = ~~shape.dataset.deg
    const index1 = ~~shape.dataset.index1
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    const isActive = index1 >= currentActiveIndex.current - 1 && index1 <= currentActiveIndex.current + 1
    const length = isActive ? POINT_ACTIVE_MOVE_LENGTH : POINT_MOVE_LENGTH
    const arr = Array.from({ length: 4 }, (item, index) => {
      const offset = 0.2 * (index + 1)
      const randomDeg = deg + Math.sin(offset * 20) * 6
      const l = Math.cos(randomDeg * Math.PI / 180)
      const t = Math.sin(randomDeg * Math.PI / 180)
      return { transform: `translate(${l * length * offset }, ${t * length * offset})`, offset }
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

  const documentVisibility = useDocumentVisibility()
  useEffect(() => {
    if (props.isPlaying) {
      togglePlay(documentVisibility)
    }
  }, [documentVisibility])

  return (
    <div id="SParticle" className="s-canvas-wrapper"></div>
  )
}