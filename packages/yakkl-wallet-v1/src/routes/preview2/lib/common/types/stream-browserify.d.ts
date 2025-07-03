// File: src/types/stream-browserify.d.ts
declare module 'stream-browserify' {
	import { Duplex as NodeDuplex } from 'readable-stream';
	export class Duplex extends NodeDuplex {}
}
