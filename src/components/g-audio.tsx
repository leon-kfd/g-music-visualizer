import React, { useEffect, useRef, useState } from "react";
import { MusicVisualizer } from '../plugins/MusicVisualizer'
import Modules from './g-audio.module.scss'
import SLine from './s-line'
import SPath from './s-path'
import SPathDot from './s-path-dot'
import SPathFill from './s-path-fill'
import SCircle from './s-circle'
import SPathDouble from './s-path-double'
import SDot from "./s-dot";
import SPaticle from "./s-particle";
import { apiURL } from '@/global'

export const MusicVisualizerCtx = new MusicVisualizer()
export default function GAudio() {
  const audio = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    MusicVisualizerCtx.setAudioEl(audio.current as HTMLAudioElement)
  }, [])

  const [musicName, setMusicName] = useState('Please load a music...')
  const [audioURL, setAudioURL] = useState<string>()
  const [audioData, setAudioData] = useState<number[]>([])
  const [isPlaying, setIsPlaying] = useState(false)

  const hiddenFileInput = useRef<HTMLInputElement>(null)

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

  async function handleLoadRandomMusic() {
    try {
      const res1 = await fetch('https://api.uomg.com/api/rand.music?sort=%E7%83%AD%E6%AD%8C%E6%A6%9C&format=json')
      const { data } = await res1.json()
      const { name, url, artistsname, picurl } = data
      const res2 = await fetch(`${apiURL}/api/neteaseMusic?target=${url}`)
      const { url: redirect } = await res2.json()
      setMusicName(`${name} - ${artistsname}`)
      setAudioURL(redirect.replace('http:', ''))
      pause()
    } catch(e) {
      console.error(e)
      audio.current?.pause()
      pause()
      alert('API busy...')
    }
  }

  function handleChooseRandomMusic() {
    hiddenFileInput.current?.click()
  }

  function handleFileChange(e: any) {
    const file = e.target.files[0]
    const url = URL.createObjectURL(file)
    setMusicName(file.name)
    setAudioURL(url)
  }

  return (
    <>
      <div className={Modules.operationWrapper}>
        <button className="btn m10" onClick={handleLoadRandomMusic}>Random a online music</button>
        <button className="btn m10" onClick={handleChooseRandomMusic}>Choose a local muisc</button>
        <div className="strong-text m10" style={{minWidth: '200px'}}>{musicName}</div>
        <input type="file" style={{display: 'none'}} ref={hiddenFileInput} onChange={handleFileChange} />
      </div>
      <div className={Modules.audioWrapper}>
        <audio controls onPlay={play} onPause={pause} ref={audio} src={audioURL} crossOrigin="anonymous"></audio>
      </div>
      <div className={Modules.exampleWrapper}>
        <SLine isPlaying={isPlaying} data={audioData} />
        <SPathDouble isPlaying={isPlaying} data={audioData} />
        <SPath isPlaying={isPlaying} data={audioData} />
        <SPathFill isPlaying={isPlaying} data={audioData} />
        <SCircle isPlaying={isPlaying} data={audioData} />
        <SPaticle isPlaying={isPlaying} data={audioData} />
        <SDot isPlaying={isPlaying} data={audioData} />
        <SPathDot isPlaying={isPlaying} data={audioData} />
        {
          Array.from({length: 5}).map((item,index) => {
            return <div key={index} className="s-module-fake"></div>
          })
        }
      </div>
    </>
  )
}
