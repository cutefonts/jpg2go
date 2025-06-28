declare module 'utif' {
  const UTIF: {
    encodeImage: (rgba: Uint8ClampedArray | Uint8Array, width: number, height: number) => Uint8Array;
    // Add more types as needed
  };
  export = UTIF;
} 