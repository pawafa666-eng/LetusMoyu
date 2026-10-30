import {rename} from 'node:fs/promises';
await rename(new URL('../dist-mailroom/office.html',import.meta.url),new URL('../dist-mailroom/index.html',import.meta.url));
