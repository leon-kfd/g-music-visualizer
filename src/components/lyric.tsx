import React, { useImperativeHandle, forwardRef, useEffect, useRef } from "react"

let activeIndex = -1
let an: Animation | null = null
export default forwardRef<LyricRef, LrcComponentProps>((props, ref) => {
  useImperativeHandle(ref, () => ({
    onUpdateTime
  }))

  const lyricEl = useRef<HTMLDivElement>(null)

  const onUpdateTime = (val: number) => {
    if (~activeIndex && props.lrcContent[activeIndex] && props.lrcContent[activeIndex].start <= val && props.lrcContent[activeIndex].end >= val) {
      // do nothing
    } else {
      activeIndex = -1
      for(let i = 0; i < props.lrcContent.length; i++) {
        if (val >= props.lrcContent[i].start && val <= props.lrcContent[i].end) {
          activeIndex = i
          break
        }
      }
      if (~activeIndex) {
        const target = props.lrcContent[activeIndex]
        const duration = target.end - target.start
        const startPercent = (val - target.start) / duration * 100
        runLrcAnimation(target.text, duration, startPercent)
      } else {
        runLrcAnimation('', 0)
      }
    }
  }

  function runLrcAnimation(text: string, duration: number, startPercent: number = 0) {
    if (!lyricEl.current) {
      return
    }
    lyricEl.current.innerHTML = text
    an = lyricEl.current.animate([
      { 'backgroundSize': `${startPercent}% 100%` },
      { 'backgroundSize': '100% 100%' }
    ], {
      duration: duration * 1000,
      easing: 'cubic-bezier(0.34, 0.08, 0.41, 0.82)'
    })
  }

  useEffect(() => {
    runLrcAnimation('', 0)
    an?.pause()
  }, [props.lrcContent])

  useEffect(() => {
    if (props.isPlaying) {
      an?.play()
    } else {
      an?.pause()
    }
  }, [props.isPlaying])

  return <div ref={lyricEl} className="lyric-content"></div>
})

export type LyricRef = {
  onUpdateTime: (val: number) => void
}