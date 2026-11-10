declare module '*.glb' {
  const model: import('./glb.mjs').ModelAsset;
  export default model;
}
