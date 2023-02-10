import { ICanvas, IShape } from "@antv/g-canvas";
import { useEffect } from "react";

export default function(canvas: React.MutableRefObject<ICanvas | undefined>, circle: React.MutableRefObject<IShape | undefined>, isPlaying: boolean, audioImg: string | undefined) {
  useEffect(() => {
    setTimeout(() => {
      if (isPlaying) {
        circle.current?.resumeAnimate()
      } else {
        circle.current?.pauseAnimate()
      }
    })
  }, [isPlaying])

  useEffect(() => {
    const imgEl = canvas.current?.findById('audioImg')
    if (imgEl) {
      imgEl.attr('img', audioImg)
    }
  }, [audioImg])
}