# react-fiber-export
This package exports the "shared" part of [React/src/renderers](https://github.com/facebook/react/tree/master/src/renderers).

The author [toxicFork](https://github.com/toxicfork/) uses it to make [react-three-renderer](http://github.com/toxicfork/react-three-renderer) work using react fiber.

[At least until Facebook](https://github.com/facebook/react/issues/9103) publishes [react-reconciler](https://github.com/facebook/react/pull/10758).

Most of the code belongs to Facebook, under the [MIT license](https://github.com/facebook/react/blob/master/LICENSE).

The rest of the code is just exporting the relevant bits that the author cared about in order ot make `react-three-renderer` work..
