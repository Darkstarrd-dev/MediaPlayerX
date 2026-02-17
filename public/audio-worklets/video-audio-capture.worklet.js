class VideoAudioCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const processorOptions = options?.processorOptions ?? {};
    this.targetSampleRate = Number(processorOptions.targetSampleRate) || 16000;
    this.chunkSamples = Math.max(160, Number(processorOptions.chunkSamples) || 1600);
    this._pendingSamples = [];
    this._sourcePos = 0;
    this._lastSample = 0;
    this._targetSampleCount = 0;
  }

  _mixToMono(inputChannels) {
    if (!inputChannels || inputChannels.length === 0) {
      return null;
    }

    const frameLength = inputChannels[0]?.length ?? 0;
    if (frameLength <= 0) {
      return null;
    }

    const mono = new Float32Array(frameLength);
    const channelCount = inputChannels.length;

    for (let i = 0; i < frameLength; i += 1) {
      let sum = 0;
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        sum += inputChannels[channelIndex]?.[i] ?? 0;
      }
      mono[i] = sum / channelCount;
    }

    return mono;
  }

  _pushTargetSample(value) {
    this._pendingSamples.push(value);

    if (this._pendingSamples.length < this.chunkSamples) {
      return;
    }

    const chunk = new Float32Array(this.chunkSamples);
    for (let i = 0; i < this.chunkSamples; i += 1) {
      chunk[i] = this._pendingSamples[i];
    }
    this._pendingSamples = this._pendingSamples.slice(this.chunkSamples);

    this._targetSampleCount += chunk.length;
    const audioTimeEnd = this._targetSampleCount / this.targetSampleRate;
    this.port.postMessage(
      {
        type: 'chunk',
        sampleRate: this.targetSampleRate,
        channelCount: 1,
        audioTimeEnd,
        samples: chunk.buffer,
      },
      [chunk.buffer],
    );
  }

  _resampleToTarget(mono) {
    if (this.targetSampleRate <= 0) {
      return;
    }

    if (sampleRate === this.targetSampleRate) {
      for (let i = 0; i < mono.length; i += 1) {
        this._pushTargetSample(mono[i]);
      }
      this._lastSample = mono[mono.length - 1] ?? this._lastSample;
      return;
    }

    const ratio = sampleRate / this.targetSampleRate;
    let pos = this._sourcePos;

    while (pos < mono.length) {
      const i0 = Math.floor(pos);
      const frac = pos - i0;
      const s0 = i0 === 0 ? this._lastSample : mono[i0 - 1] ?? this._lastSample;
      const s1 = mono[i0] ?? mono[mono.length - 1] ?? this._lastSample;
      const interpolated = s0 + (s1 - s0) * frac;
      this._pushTargetSample(interpolated);
      pos += ratio;
    }

    this._sourcePos = pos - mono.length;
    this._lastSample = mono[mono.length - 1] ?? this._lastSample;
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (input && output) {
      const channelCount = Math.min(input.length, output.length);
      for (let channelIndex = 0; channelIndex < channelCount; channelIndex += 1) {
        output[channelIndex].set(input[channelIndex]);
      }
    }

    const mono = this._mixToMono(input);
    if (mono) {
      this._resampleToTarget(mono);
    }

    return true;
  }
}

registerProcessor('video-audio-capture', VideoAudioCaptureProcessor);
