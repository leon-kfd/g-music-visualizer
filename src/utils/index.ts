export function formatToTransit(arr: number[], num = 5, rate = 0.8) {
  if (num < 3 || num > 13 || num % 2 === 0) {
    throw new Error('num value muse be singular, num >= 3, num <= 13')
  }
  return arr.map((v:number, i:number) => {
    const rest = i % num
    const offset = (num - 1) / 2 - rest
    const centerValue = arr[i + offset]
    const result = centerValue ? centerValue * (rate ** Math.abs(offset)) : v
    return ~~result
  })
}

export function addColorOpacity(color: string, opacity: number) {
  if (color[0] === '#') {
    color = color.slice(1);
  }
  const num = parseInt(color, 16);
  const r = num >> 16
  const g = num & 0x0000FF
  const b = (num >> 8) & 0x00FF
  return `rgba(${r}, ${g}, ${b}, ${opacity})`
}

export function getCirclePath(cx: number, cy: number, r: number) {
  return `M ${cx - r}, ${cy}
  a ${r}, ${r} 0 1, 0 ${r * 2}, 0 
  a ${r}, ${r} 0 1, 0 ${-r * 2}, 0`
}