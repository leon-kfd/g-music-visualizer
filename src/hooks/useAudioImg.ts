import { Canvas, Image } from "@antv/g";
import { useEffect } from "react";

export default function(canvas: React.MutableRefObject<Canvas | undefined>, circle: React.MutableRefObject<Image | undefined>, isPlaying: boolean, audioImg: string | undefined) {
  useEffect(() => {
    setTimeout(() => {
      const animations = circle.current?.getAnimations()
      if (animations && animations.length) {
        const an = animations[0]
        if (isPlaying) {
          an.play()
        } else {
          an.pause()
        }
      }
    })
  }, [isPlaying])

  useEffect(() => {
    const imgEl = canvas.current?.document.querySelector('#audioImg')
    if (imgEl) {
      imgEl.setAttribute('img', audioImg)
    }
  }, [audioImg])
}