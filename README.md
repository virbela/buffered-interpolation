# buffered-interpolation-babylon

This is a port of Mozilla's [buffered-interpolation](https://github.com/InfiniteLee/buffered-interpolation) to BabylonJS

This package aims to provide a solution for interpolation of position, rotation, and scale for networked BabylonJS objects.

It specifically aims to work well both in situations with continuous and sparse network updates. 

Inspired by: [godot-snapshot-interpolation-demo](https://github.com/empyreanx/godot-snapshot-interpolation-demo)

For position and scale, uses either linear interpolation (default) or [hermite](https://en.wikipedia.org/wiki/Hermite_interpolation) function (which takes into account velocity).

For rotation (quaternions), uses spherical interpolation.

## Usage

```
import {
  InterpolationBuffer,
  BufferState,
  BufferMode
} from "buffered-interpolation-babylon";

const buffer = new InterpolationBuffer(BufferMode.MODE_LERP, 0.1);
```

on receipt of networked data:
```
buffer.appendBuffer(position, velocity, orientation, scale)
```

in an onBeforeRender observable:
```
buffer.update(scene.deltaTime)
if (buffer.state === BufferState.PLAYING) {
  mesh.setEnabled(true);
  mesh.position.copyFrom(buffer.position);
  mesh.rotationQuaternion.copyFrom(buffer.quaternion);
  mesh.scaling.copyFrom(buffer.scale);
}
```