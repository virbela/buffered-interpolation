import { Vector3, Quaternion } from "@babylonjs/core/Maths/math.vector";
export declare enum BufferState {
    INITIALIZING = 0,
    BUFFERING = 1,
    PLAYING = 2
}
export declare enum BufferMode {
    MODE_LERP = 0,
    MODE_HERMITE = 1
}
export interface frame {
    position: Vector3;
    velocity: Vector3;
    scale: Vector3;
    quaternion: Quaternion;
    time: number;
}
export declare class InterpolationBuffer {
    state: BufferState;
    mode: BufferMode;
    buffer: frame[];
    originFrame: frame;
    position: Vector3;
    scale: Vector3;
    quaternion: Quaternion;
    time: number;
    bufferTime: number;
    constructor(mode?: BufferMode, bufferTime?: number);
    hermite(target: Vector3, t: number, p1: Vector3, p2: Vector3, v1: Vector3, v2: Vector3): void;
    lerp(target: Vector3, v1: Vector3, v2: Vector3, alpha: number): void;
    slerp(target: Quaternion, r1: Quaternion, r2: Quaternion, alpha: number): void;
    updateOriginFrameToBufferTail(): void;
    appendBuffer(position?: Vector3, velocity?: Vector3, quaternion?: Quaternion, scale?: Vector3): void;
    setTarget(position: Vector3, velocity: Vector3, quaternion: Quaternion, scale: Vector3): void;
    setPosition(position: Vector3, velocity: Vector3): void;
    setQuaternion(quaternion: Quaternion): void;
    setScale(scale: Vector3): void;
    update(delta: number): void;
    getPosition(): Vector3;
    getQuaternion(): Quaternion;
    getScale(): Vector3;
}
