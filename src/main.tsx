import React from 'react'
import ReactDOM from 'react-dom'
import './index.scss'
import App from './App'
import Stats from 'stats.js'

import { runtime } from '@antv/g-lite'
import { AnimationTimeline } from '@antv/g-web-animations-api'

runtime.enableDataset = true
// runtime.enableCSSParsing = false
runtime.AnimationTimeline = AnimationTimeline

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
)

const stats = new Stats();
const fps = document.querySelector('#fps')
if (fps) {
  fps.appendChild(stats.dom);
  requestAnimationFrame(function loop(){
    stats.update();
    requestAnimationFrame(loop)
  });
}

