import React, { useState } from 'react'
import GAudio from './components/g-audio'
import { GlobalState } from '@/store'

function App() {
  const [state, setState] = useState({
    mainColor: '#262626' // 预留, 用以提取歌曲图片主题色
  })
  return (
    <GlobalState.Provider value={{state, setState}}>
      <div className="App">
        <GAudio />
      </div>
    </GlobalState.Provider>
  )
}

export default App
