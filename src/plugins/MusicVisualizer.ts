const _analyser = new window.AudioContext();

type MusicVisualizerOptions = {
	audioEl?: HTMLAudioElement;
	size?: number;
}

export class MusicVisualizer {
	private analyser: AnalyserNode;
	private gainNode: GainNode;
	private audioSource?: MediaElementAudioSourceNode;
	private options: MusicVisualizerOptions & {
		size: number
	};
	private visualArr: Uint8Array;
	constructor (options?: MusicVisualizerOptions) {
		const defaultOptions = {
			size: 128
		}
		this.options = {
			...defaultOptions,
			...options
		}
		this.analyser = _analyser.createAnalyser();
		this.analyser.fftSize = this.options.size * 2;

		this.gainNode = _analyser.createGain();
		this.gainNode.connect(_analyser.destination);

		this.analyser.connect(this.gainNode);

		if (this.options.audioEl) {
			this.audioSource = _analyser.createMediaElementSource(this.options.audioEl)
			this.audioSource.connect(this.analyser)
		}

		this.visualArr = new Uint8Array(this.analyser.frequencyBinCount);
		this.resumeAudioContext();
	}

	private resumeAudioContext () {
		if (_analyser) {
			const resumeAudio = () => {
				if (_analyser.state === 'suspended') _analyser.resume();
				document.removeEventListener('click', resumeAudio)
			}
			document.addEventListener('click', resumeAudio)
		}
	}

	destory() {
		this.analyser.disconnect(this.gainNode);
		this.audioSource?.disconnect(this.analyser)
		this.gainNode.disconnect(_analyser.destination);
	}

	setAudioEl(el: HTMLAudioElement) {
		if (this.audioSource) {
			this.audioSource.disconnect(this.analyser)
		}
		this.audioSource = _analyser.createMediaElementSource(el)
		this.audioSource.connect(this.analyser)
	}

	// 更改音量
	changeVolumn (value: number) {
		this.gainNode.gain.value = value
	}

	// 获取音频频域数据
	getVisualizeValue () {
		this.analyser.getByteFrequencyData(this.visualArr)
		return this.visualArr;
	}
}