import React, { useEffect, useRef, useState } from "react";
import { Canvas, IShape } from '@antv/g-canvas';
import { getCirclePath } from '../utils'

interface SCircleProps {
  data?: number[];
  isPlaying: boolean;
}

export default function SCircle(props: SCircleProps) {
  const X = 200
  const Y = 200
  const R = 100
  const LINE_COLOR = '#fff'

  const canvas = useRef<Canvas>()
  const c1 = useRef<IShape>()
  const c2 = useRef<IShape>()
  const [c2IsStart, setC2IsStart] = useState(false)

  useEffect(() => {
    if (!canvas.current) {
      canvas.current = new Canvas({
        container: 'SCircle',
        width: 400,
        height: 400,
      });
      
      canvas.current.addShape('circle', {
        attrs: {
          x: X,
          y: Y,
          r: R,
          fill: '#f5f5f7',
          shadowColor: '#fcc8d9',
          shadowBlur: 10
        }
      });
  
      c1.current = canvas.current.addShape('path', {
        attrs: {
          stroke: LINE_COLOR,
          lineWidth: 2,
          path: getCirclePath(X, Y, R)
        }
      })
      c1.current.animate((ratio: number) => {
        return {
          path: getCirclePath(X, Y, R + ratio * 80),
          opacity: 1 - ratio * 1
        }
      }, {
        duration: 6000,
        easing: 'easeLinear',
        repeat: true
      })

      c2.current = canvas.current.addShape('path', {
        attrs: {
          stroke: LINE_COLOR,
          lineWidth: 2,
          path: getCirclePath(X, Y, R)
        }
      })
      c2.current.animate((ratio: number) => {
        return {
          path: getCirclePath(X, Y, R + ratio * 80),
          opacity: 1 - ratio * 1
        }
      }, {
        duration: 6000,
        easing: 'easeLinear',
        repeat: true
      })
    }

    if (props.isPlaying) {
      c1.current?.resumeAnimate()
      if (c2IsStart) {
        c2.current?.resumeAnimate()
      } else {
        setTimeout(() => {
          c2.current?.resumeAnimate()
          setC2IsStart(true)
        }, 3000)
      }
    } else {
      setTimeout(() => {
        c1.current?.pauseAnimate()
        c2.current?.pauseAnimate()
      })
    }
  }, [props.isPlaying])

  return (
    <div className="s-model">
      <div id="SCircle" className="s-canvas-wrapper"></div>
    </div>
  )
}