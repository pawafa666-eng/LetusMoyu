import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const content=structuredClone(require('../cloudfunctions/letusMoyu/content.cjs'));
const {publicDefinition}=require('../cloudfunctions/letusMoyu/mail-content.cjs');
content.research.mailTemplates=content.research.mailTemplates.map(publicDefinition);
writeFileSync(new URL('../src/content.json',import.meta.url),JSON.stringify(content,null,2));
