import React, { useEffect, useRef, useState } from "react";
import { MusicVisualizer } from '../plugins/MusicVisualizer'
import Modules from './g-audio.module.scss'
import SLine from './s-line'
// import SDot from './s-dot'
import SPath from './s-path'
import SPathDot from './s-path-dot'
import SPathFill from './s-path-fill'
import SCircle from './s-circle'

export const MusicVisualizerCtx = new MusicVisualizer()
export default function GAudio() {
  const audio = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    MusicVisualizerCtx.setAudioEl(audio.current as HTMLAudioElement)
  }, [])

  const [audioURL, setAudioURL] = useState<string>()
  const [audioData, setAudioData] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)

  let lastTime: number
  let raf = useRef<number>()
  function step(timestamp: number) {
    if (!lastTime) lastTime = timestamp
    const progress  = timestamp - lastTime
    if (progress === 0 || progress > 0) {
      setAudioData([...MusicVisualizerCtx.getVisualizeValue()])
      lastTime = timestamp
    }
    raf.current = requestAnimationFrame(step)
  }
  function play () {
    setIsPlaying(true)
    raf.current = requestAnimationFrame(step)
  }
  function pause() {
    setIsPlaying(false)
    raf.current && cancelAnimationFrame(raf.current)
  }

  function handleFileChange(e: any) {
    const url = URL.createObjectURL(e.target.files[0])
    setAudioURL(url)
  }

  return (
    <>
      <div style={
        {
          display: 'flex',
          alignItems: 'center',
          padding: '20px'
        }
      }>
        <audio controls onPlay={play} onPause={pause} ref={audio} src={audioURL} style={{marginRight: '10px'}}></audio>
        <input type="file" onChange={handleFileChange} />
      </div>
      <div className={Modules.wrapper}>
        <SLine data={audioData} />
        {/* <SDot data={audioData} freshTime={freshTime} /> // 不够平滑，弃用 */}
        <SPathDot data={audioData} />
        <SPath data={audioData} />
        <SPathFill data={audioData} />
        <SCircle isPlaying={isPlaying}/>
      </div>
    </>
  )
}