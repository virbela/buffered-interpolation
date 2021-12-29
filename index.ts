import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";

enum STATE {
  INITIALIZING = 0,
  BUFFERING = 1,
  PLAYING = 2
}

enum MODE {
  MODE_LERP = 0,
  MODE_HERMITE = 1
}

interface frame {
  position: Vector3;
  velocity: Vector3;
  scale: Vector3;
  quaternion: Quaternion;
  time: number;
}

// const vectorPool: Vector3[] = [];
// const quatPool: Quaternion[] = [];
const framePool: frame[] = [];

// const getPooledVector: () => Vector3 = () => vectorPool.shift() || new Vector3();
// const getPooledQuaternion: () => Quaternion = () => quatPool.shift() || new Quaternion();

const getPooledFrame: () => frame = () => {
  let frame = framePool.pop();

  if (!frame) {
    frame = { position: new Vector3(), velocity: new Vector3(), scale: new Vector3(), quaternion: new Quaternion(), time: 0 };
  }

  return frame;
};

const freeFrame: (f: frame) => void = f => framePool.push(f);

export class InterpolationBuffer {
  state: STATE;
  mode: MODE;
  buffer: frame[];
  originFrame: frame;
  position: Vector3;
  scale: Vector3;
  quaternion: Quaternion;
  time: number;
  bufferTime: number;

  constructor(mode = MODE.MODE_LERP, bufferTime = 0.15) {
    this.state = STATE.INITIALIZING;
    this.buffer = [];
    this.bufferTime = bufferTime * 1000;
    this.time = 0;
    this.mode = mode;

    this.originFrame = getPooledFrame();
    this.position = new Vector3();
    this.quaternion = new Quaternion();
    this.scale = new Vector3(1, 1, 1);
  }

  hermite(target: Vector3, t: number, p1: Vector3, p2: Vector3, v1: Vector3, v2: Vector3) {
    const t2 = t * t;
    const t3 = t * t * t;
    const a = 2 * t3 - 3 * t2 + 1;
    const b = -2 * t3 + 3 * t2;
    const c = t3 - 2 * t2 + t;
    const d = t3 - t2;

    target.copyFrom(p1.scaleInPlace(a));
    target.add(p2.scaleInPlace(b));
    target.add(v1.scaleInPlace(c));
    target.add(v2.scaleInPlace(d));
  }

  lerp(target: Vector3, v1: Vector3, v2: Vector3, alpha: number) {
    Vector3.LerpToRef(v1, v2, alpha, target);
  }

  slerp(target: Quaternion, r1: Quaternion, r2: Quaternion, alpha: number) {
    Quaternion.SlerpToRef(r1, r2, alpha, target);
  }

  updateOriginFrameToBufferTail() {
    freeFrame(this.originFrame);
    this.originFrame = this.buffer.shift() || getPooledFrame();
  }

  appendBuffer(position?: Vector3, velocity?: Vector3, quaternion?: Quaternion, scale?: Vector3) {
    const tail = this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
    // update the last entry in the buffer if this is the same frame
    if (tail && tail.time === this.time) {
      if (position) {
        tail.position.copyFrom(position);
      }

      if (velocity) {
        tail.velocity.copyFrom(velocity);
      }

      if (quaternion) {
        tail.quaternion.copyFrom(quaternion);
      }

      if (scale) {
        tail.scale.copyFrom(scale);
      }
    } else {
      const priorFrame = tail || this.originFrame;
      const newFrame = getPooledFrame();
      newFrame.position.copyFrom(position || priorFrame.position);
      newFrame.velocity.copyFrom(velocity ||  priorFrame.velocity);
      newFrame.quaternion.copyFrom(quaternion || priorFrame.quaternion);
      newFrame.scale.copyFrom(scale || priorFrame.scale);
      newFrame.time = this.time;

      this.buffer.push(newFrame);
    }
  }

  setTarget(position: Vector3, velocity: Vector3, quaternion: Quaternion, scale: Vector3) {
    this.appendBuffer(position, velocity, quaternion, scale);
  }

  setPosition(position: Vector3, velocity: Vector3) {
    this.appendBuffer(position, velocity, undefined, undefined);
  }

  setQuaternion(quaternion: Quaternion) {
    this.appendBuffer(undefined, undefined, quaternion, undefined);
  }

  setScale(scale: Vector3) {
    this.appendBuffer(undefined, undefined, undefined, scale);
  }

  update(delta: number) {
    if (this.state === STATE.INITIALIZING) {
      if (this.buffer.length > 0) {
        this.updateOriginFrameToBufferTail();
        this.position.copyFrom(this.originFrame.position);
        this.quaternion.copyFrom(this.originFrame.quaternion);
        this.scale.copyFrom(this.originFrame.scale);
        this.state = STATE.BUFFERING;
      }
    }

    if (this.state === STATE.BUFFERING) {
      if (this.buffer.length > 0 && this.time > this.bufferTime) {
        this.state = STATE.PLAYING;
      }
    }

    if (this.state === STATE.PLAYING) {
      const mark = this.time - this.bufferTime;
      //Purge this.buffer of expired frames
      while (this.buffer.length > 0 && mark > this.buffer[0].time) {
        //if this is the last frame in the buffer, just update the time and reuse it
        if (this.buffer.length > 1) {
          this.updateOriginFrameToBufferTail();
        } else {
          this.originFrame.position.copyFrom(this.buffer[0].position);
          this.originFrame.velocity.copyFrom(this.buffer[0].velocity);
          this.originFrame.quaternion.copyFrom(this.buffer[0].quaternion);
          this.originFrame.scale.copyFrom(this.buffer[0].scale);
          this.originFrame.time = this.buffer[0].time;
          this.buffer[0].time = this.time + delta;
        }
      }
      if (this.buffer.length > 0 && this.buffer[0].time > 0) {
        const targetFrame = this.buffer[0];
        const delta_time = targetFrame.time - this.originFrame.time;
        const alpha = (mark - this.originFrame.time) / delta_time;

        if (this.mode === MODE.MODE_LERP) {
          this.lerp(this.position, this.originFrame.position, targetFrame.position, alpha);
        } else if (this.mode === MODE.MODE_HERMITE) {
          this.hermite(
            this.position,
            alpha,
            this.originFrame.position,
            targetFrame.position,
            this.originFrame.velocity.scaleInPlace(delta_time),
            targetFrame.velocity.scaleInPlace(delta_time)
          );
        }

        this.slerp(this.quaternion, this.originFrame.quaternion, targetFrame.quaternion, alpha);

        this.lerp(this.scale, this.originFrame.scale, targetFrame.scale, alpha);
      }
    }

    if (this.state !== STATE.INITIALIZING) {
      this.time += delta;
    }
  }

  getPosition() {
    return this.position;
  }

  getQuaternion() {
    return this.quaternion;
  }

  getScale() {
    return this.scale;
  }
}
