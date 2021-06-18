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