interface SComponentProps {
  isPlaying: boolean;
  data: number[];
  audioImg?: string;
}

interface LrcComponentProps {
  isPlaying: boolean;
  lrcContent: ScriptItem[];
}