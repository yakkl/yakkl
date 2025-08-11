// Browser polyfill wrapper for legacy imports
// With the unified loader, this just re-exports browser_ext
import { browser_ext } from './common/environment';
export default browser_ext;
