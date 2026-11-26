// The barcode scanner decodes with a WebAssembly module. By default the library
// downloads it from a public CDN at runtime, which sends the user's IP address
// to a third party and breaks the scanner offline. Ship the file with the app.
import { prepareZXingModule } from 'barcode-detector';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

prepareZXingModule({
  overrides: {
    locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : `${prefix}${path}`),
  },
});
