import React, { useEffect, useRef } from "react";
import { Canvas, Image, Circle } from '@antv/g';
import { Renderer } from '@antv/g-canvas';
import { getImageCircle } from '../utils/base';
import { X, Y, R } from '../utils/constanst'
import useAudioImg from "@/hooks/useAudioImg";
import useDocumentVisibility from '@/hooks/useDocumenVisiblity'
import Timer from '@/utils/timer'

type ICircleItem = {
  circle: Circle & { _timer?: Timer },
  dot: Circle & { _timer?: Timer }
}

export default function SCircle(props: SComponentProps) {
  const LINE_COLOR = '#fff'
  const DOT_COLOR = '#fa7'
  const DOT_R = 5
  const CIRCLE_NUM = 3
  const CIRCLE_DELAY = 2000
  const CIRCLE_SCALE_RARIO = 2

  const canvas = useRef<Canvas>()
  const circle = useRef<Image>()

  const circleArr = useRef<ICircleItem[]>([])

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
            cx: X,
            cy: Y,
            stroke: LINE_COLOR,
            lineWidth: 2,
            opacity: 1,
            r: R
          }
        })
        const circleDot = new Circle({
          style: {
            r: DOT_R,
            fill: LINE_COLOR,
            shadowColor: DOT_COLOR,
            shadowBlur: DOT_R,
            opacity: 0,
          },
        })
        canvas.current?.appendChild(circle)
        canvas.current?.appendChild(circleDot)
        return [circle, circleDot]
      };
      Array.from({ length: CIRCLE_NUM }, (item, index) => {
        const [circle, dot] = addCircle()
        circleArr.current.push({ circle, dot })
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
    for(let i = 0; i < circleArr.current.length; i++) {
      const circleAn = circleArr.current[i].circle.getAnimations()?.[0]
      if (circleAn) {
        circleAn[key]()
      } else {
        if (circleArr.current[i].circle._timer) {
          circleArr.current[i].circle._timer?.[key]()
        } else if (toPlay) {
          circleArr.current[i].circle._timer = new Timer(() => {
            runCircleAnimation(circleArr.current[i].circle)
          }, i * CIRCLE_DELAY)
        }
      }

      const dotAn = circleArr.current[i].dot.getAnimations()?.[0]
      if (dotAn) {
        dotAn[key]()
      } else {
        if (circleArr.current[i].dot._timer) {
          circleArr.current[i].dot._timer?.[key]()
        } else if (toPlay) {
          circleArr.current[i].dot._timer = new Timer(() => {
            runDotAnimation(circleArr.current[i].dot)
          }, i * CIRCLE_DELAY)
        }
      }
    }
  }

  function runCircleAnimation(shape: Circle) {
    const animation = shape.animate(
      [
        { transform: 'scale(1)', opacity: 0.8 },
        { transform: `scale(${CIRCLE_SCALE_RARIO})`, opacity: 0 }
      ],
      {
        duration: CIRCLE_DELAY * CIRCLE_NUM
      }
    )
    if (animation) {
      animation.onfinish = () => {
        console.log('an finish', new Date())
        animation.cancel() // release memory??
        runCircleAnimation(shape)
      }
    }
  }

  function runDotAnimation(shape: Circle) {
    const deg = -135 + pickStartPoint()
    const l = Math.cos(deg * Math.PI / 180)
    const t = Math.sin(deg * Math.PI / 180)
    shape.setAttribute('cx', X + l * R)
    shape.setAttribute('cy', Y + t * R)
    shape.setAttribute('transformOrigin', `${-l * R + DOT_R}px ${-t * R + DOT_R}px`);
    const animation = shape.animate(
      [
        { transform: 'rotate(0) translate(0, 0)', opacity: 0, offset: 0.01 },
        { opacity: 0.9, offset: 0.02 },
        { transform: `rotate(360deg) translate(${l * R}, ${t * R})`, opacity: 0 }
      ],
      {
        duration: CIRCLE_DELAY * CIRCLE_NUM
      }
    )
    if (animation) {
      animation.onfinish = () => {
        animation.cancel() // release memory??
        runDotAnimation(shape)
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
    <div id="SCircle" className="s-canvas-wrapper"></div>
  )
}