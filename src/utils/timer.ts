export default class Timer {
  public timerId: ReturnType<typeof setTimeout> | number
  public remaining: number
  public start: number
  public callback: TimerHandler
  public complete: boolean

  constructor (callback: Function, delay: number) {
    this.complete = false
    this.remaining = delay
    this.callback = () => {
      this.complete = true
      callback()
    }
    this.start = Date.now()
    this.timerId = setTimeout(this.callback, this.remaining)
  }

  public pause() {
    clearTimeout(this.timerId)
    this.remaining -= Date.now() - this.start
  }

  public play() {
    clearTimeout(this.timerId)
    if (this.remaining > 0) {
      this.start = Date.now()
      this.timerId = setTimeout(this.callback, this.remaining)
    }
  }
}