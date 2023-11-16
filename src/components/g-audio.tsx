import React, { useEffect, useRef, useState } from "react";
import { MusicVisualizer } from '../plugins/MusicVisualizer'
import style from './g-audio.module.scss'
import SLine from './s-line'
import SPath from './s-path'
import SPathFill from './s-path-fill'
import SCircle from './s-circle'
import SPathDouble from './s-path-double'
import SDot from "./s-dot";
import SCircleMultiple from './s-circle-multiple';
import SPaticle from "./s-particle";
import { DEFAULT_IMG } from '@/global'
import lrcParser from "@/plugins/LrcParser";
import Lyric, { LyricRef } from './lyric'
// import { GlobalState } from "@/store";

export const MusicVisualizerCtx = new MusicVisualizer()

const exampleList = [
  SLine, 
  SPathDouble, 
  SPath, 
  SPathFill, 
  SDot, 
  SCircle, 
  SCircleMultiple,
  SPaticle, // 性能不行, 先屏蔽
]

export default function GAudio() {
  // const { setState: setGlobalState } = useContext(GlobalState)

  const audio = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    MusicVisualizerCtx.setAudioEl(audio.current as HTMLAudioElement)
  }, [])

  const [musicName, setMusicName] = useState('Please load a music...')
  const [audioURL, setAudioURL] = useState<string>()
  const [audioData, setAudioData] = useState<number[]>([])
  const [audioImg, setAudioImg] = useState<string>(DEFAULT_IMG)
  const [isPlaying, setIsPlaying] = useState(false)
  const [playList, setPlayList] = useState<any[]>([])

  const [lrcContent, setLrcContent] = useState<ScriptItem[]>([])

  const hiddenFileInput = useRef<HTMLInputElement>(null)
  const lyricCtx = useRef<LyricRef>(null)

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

  
  async function getPlayList() {
    try {
      const res = await (await fetch(`https://api.injahow.cn/meting/?type=playlist&id=8577182717`)).json()
      if (res && res.length > 0) {
        setPlayList(res)
      }
    } catch {
      //
    }
  }
  useEffect(() => {
    getPlayList()
  }, [])
  

  async function handleLoadRandomMusic() {
    try {
      let musicName = ''
      let musicURL = ''
      let posterPic = ''
      if (playList && playList.length > 0) {
        const randomIdx = ~~[Math.random() * playList.length]
        const { name, url, artist, pic, lrc } = playList[randomIdx]
        loadLRC(lrc)
        const { url: picURL } = await fetch(pic, { method: 'HEAD' })
        musicName = `${name} - ${artist}`
        musicURL = url
        posterPic = picURL.split('?')[0] + `?param=400y400`
        // setGlobalState({ mainColor: `#${~~(Math.random() * 1000000)}`})
      } else {
        throw new Error('Can not get play list')
      }
      setMusicName(musicName)
      setAudioURL(musicURL)
      setAudioImg(posterPic)
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

  function handleAudioTimeUpdate() {
    const audioCurrentTime = audio.current?.currentTime
    if (typeof audioCurrentTime !== 'undefined') {
      lyricCtx.current?.onUpdateTime(audioCurrentTime)
    }
  }

  async function loadLRC(url: string) {
    try {
      const lrcText = await (await fetch(url)).text()
      const lrc = lrcParser(lrcText)
      if (lrc.scripts && lrc.scripts.length > 0) {
        setLrcContent(lrc.scripts)
      } else {
        setLrcContent([])
      }
    } catch (e) {
      console.error(e)
      setLrcContent([])
    }
  }

  return (
    <>
      <main className={style.page}>
        <div className={style.operationWrapper}>
          <button className="btn m10" onClick={handleLoadRandomMusic}>Random an online music</button>
          <button className="btn m10" onClick={handleChooseRandomMusic}>Choose a local muisc</button>
          <div className="strong-text m10" style={{minWidth: '200px'}}>{musicName}</div>
          <input type="file" style={{display: 'none'}} ref={hiddenFileInput} onChange={handleFileChange} />
        </div>
        <div className={style.audioWrapper}>
          <audio controls onPlay={play} onPause={pause} ref={audio} src={audioURL} crossOrigin="anonymous" onTimeUpdate={handleAudioTimeUpdate}></audio>
          <div className="lyric-wrapper">
            <Lyric isPlaying={isPlaying} lrcContent={lrcContent} ref={lyricCtx} />
          </div>
        </div>
        <div className={style.exampleWrapper}>
          {
            exampleList.map((Example, index) => {
              return (
                <div className="s-model" key={index}>
                  <div className="img-bg-wrapper">
                    <img src={audioImg} />
                  </div>
                  <Example isPlaying={isPlaying} data={audioData} audioImg={audioImg} />
                </div>
              )
            })
          }
          {
            Array.from({length: 5}).map((item,index) => {
              return <div key={index} className="s-module-fake"></div>
            })
          }
        </div>
      </main>
      <footer className={style.footer}>
          &copy;<a href="mailto://kfd_personal@163.com">Leon.D</a>
          <a className={style.github} href="https://github.com/leon-kfd/g-music-visualizer" target="_blank">
            <svg viewBox="0 0 1024 1024" width="20" height="20">
              <path d="M960 512c0 97.76-28.704 185.216-85.664 263.264-56.96 78.016-130.496 131.84-220.64 161.856-10.304 1.824-18.368 0.448-22.848-4.032a22.4 22.4 0 0 1-7.2-17.504v-122.88c0-37.632-10.304-65.44-30.464-82.912a409.856 409.856 0 0 0 59.616-10.368 222.752 222.752 0 0 0 54.72-22.816c18.848-10.784 34.528-23.36 47.104-38.592 12.544-15.232 22.848-35.904 30.912-61.44 8.096-25.568 12.128-54.688 12.128-87.904 0-47.072-15.232-86.976-46.208-120.16 14.368-35.456 13.024-74.912-4.48-118.848-10.752-3.616-26.432-1.344-47.072 6.272s-38.56 16.16-53.824 25.568l-21.984 13.888c-36.32-10.304-73.536-15.232-112.096-15.232s-75.776 4.928-112.096 15.232a444.48 444.48 0 0 0-24.672-15.68c-10.336-6.272-26.464-13.888-48.896-22.432-21.952-8.96-39.008-11.232-50.24-8.064-17.024 43.936-18.368 83.424-4.032 118.848-30.496 33.632-46.176 73.536-46.176 120.608 0 33.216 4.032 62.336 12.128 87.456 8.032 25.12 18.368 45.76 30.496 61.44 12.544 15.68 28.224 28.704 47.072 39.04 18.848 10.304 37.216 17.92 54.72 22.816a409.6 409.6 0 0 0 59.648 10.368c-15.712 13.856-25.12 34.048-28.704 60.064a99.744 99.744 0 0 1-26.464 8.512 178.208 178.208 0 0 1-33.184 2.688c-13.024 0-25.568-4.032-38.144-12.544-12.544-8.512-23.296-20.64-32.256-36.32a97.472 97.472 0 0 0-28.256-30.496c-11.232-8.064-21.088-12.576-28.704-13.92l-11.648-1.792c-8.096 0-13.92 0.928-17.056 2.688-3.136 1.792-4.032 4.032-2.688 6.72s3.136 5.408 5.376 8.096 4.928 4.928 7.616 7.168l4.032 2.688c8.544 4.032 17.056 11.232 25.568 21.984 8.544 10.752 14.368 20.64 18.4 29.6l5.824 13.44c4.928 14.816 13.44 26.912 25.568 35.872 12.096 8.992 25.088 14.816 39.008 17.504 13.888 2.688 27.36 4.032 40.352 4.032s23.776-0.448 32.288-2.24l13.472-2.24c0 14.784 0 32.288 0.416 52.032 0 19.744 0.48 30.496 0.48 31.392a22.624 22.624 0 0 1-7.648 17.472c-4.928 4.48-12.992 5.824-23.296 4.032-90.144-30.048-163.68-83.84-220.64-161.888C92.256 697.216 64 609.312 64 512c0-81.152 20.192-156.064 60.096-224.672s94.176-122.88 163.232-163.232C355.936 84.192 430.816 64 512 64s156.064 20.192 224.672 60.096 122.88 94.176 163.232 163.232C939.808 355.488 960 430.848 960 512" fill="#585862"></path>
            </svg>
            <span> Github</span>
          </a>
      </footer>
    </>
  )
}
