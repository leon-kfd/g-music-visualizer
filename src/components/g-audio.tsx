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

  // const fullList = [
  //   {
  //     name: 'SLine',
  //     c: SLine
  //   },
  //   {
  //     name: 'SPath',
  //     c: SPath
  //   },
  //   {
  //     name: 'SPaticle',
  //     c: SPaticle
  //   }
  // ]
  // const [checkList, setCheckList] = useState(fullList.map(item => item.name))

  // function changeList(event: any) {
  //   const target = event.target as HTMLInputElement;
  //   const value = target.value
  //   const index = checkList.indexOf(value)
  //   console.log('value', value, 'checked', target.checked, 'index', index)
  //   const _checkList = [...checkList]
  //   if (target.checked) {
  //     _checkList.push(value)
  //   } else {
  //     _checkList.splice(index, 1)
  //   }
  //   setCheckList(_checkList)
  // }

  return (
    <>
      <div style={
        {
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          padding: '20px'
        }
      }>
        <audio controls onPlay={play} onPause={pause} ref={audio} src={audioURL} style={{marginRight: '10px'}}></audio>
        <input type="file" onChange={handleFileChange} />
      </div>
      {/* <div>
        {
          fullList.map(item => {
            return (
              <div key={item.name}>
                <input type="checkbox" name="list" value={item.name} checked={checkList.includes(item.name)} onChange={changeList}/>
                <span>{item.name}</span>
              </div>
            )
          })
        }
      </div> */}
      <div className={Modules.wrapper}>
        {
          // fullList.filter(item => checkList.includes(item.name)).map(item => {
          //   const Component = item.c
          //   return <Component isPlaying={isPlaying} data={audioData} key={item.name} />
          // })
          // fullList.map(item => {
          //   const Component = item.c
          //   const show = checkList.includes(item.name)
          //   return <Component isPlaying={isPlaying} data={audioData} key={item.name} show={show} />
          // })
        }
        <SLine isPlaying={isPlaying} data={audioData} />
        <SPathDouble isPlaying={isPlaying} data={audioData} />
        <SPath isPlaying={isPlaying} data={audioData} />
        <SPathFill isPlaying={isPlaying} data={audioData} />
        <SCircle isPlaying={isPlaying} data={audioData} />
        <SPaticle isPlaying={isPlaying} data={audioData} />
        <SDot isPlaying={isPlaying} data={audioData} />
        <SPathDot isPlaying={isPlaying} data={audioData} />
      </div>
    </>
  )
}