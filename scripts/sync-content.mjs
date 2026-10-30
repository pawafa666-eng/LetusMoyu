import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
writeFileSync(new URL('../src/content.json',import.meta.url),JSON.stringify(require('../cloudfunctions/letusMoyu/content.cjs'),null,2));
