type ScriptItem = {start: number, text: string, translateText: string, end: number}

interface LrcJsonData {
   [key: string]: any
   scripts?: ScriptItem[]
 }