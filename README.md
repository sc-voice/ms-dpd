### @sc-voice/ms-dpd
MS-DPD: A JavaScript library for searching
[Digital Pali Dictionary](https://digitalpalidictionary.github.io/titlepage.html)

### Command Line
The command line program requires 
NodeJS version 20 or later.
If you do not have NodeJS installed, consider using 
[nvm to install NodeJS](https://github.com/nvm-sh/nvm).
For a command line program that gives quick access to DPD:

```
git clone https://github.com/sc-voice/ms-dpd
cd ms-dpd
npm install
./scripts/dpd --help
./scripts/dpd dhamma
./scripts/dpd -mu dhamma
./scripts/dpd -md 'superior virtue'
```

### Library
For an existing Javascript project (browser or web),
install the library as follows:

```
npm install @sc-voice/ms-dpd@latest
```

The primary class of interest is Dictionary:

```
import { Dictionary } from '@sc-voice/pali/main.mjs'

let dict = await Dictionary.create();
let dhamma = dict.find("dhamma", {method: 'entry'});
```

### Development
The [Digital Pali Dictionary](https://digitalpalidictionary.github.io/titlepage.html)
(DPD) uses a SQLite3 database which needs to be
downloaded for development:

```
git clone https://github.com/sc-voice/ms-dpd
cd ms-dpd
npm install
./scripts/dpd-install
npm run test
```

The purpose of MS-DPD is to provide a small and compact
version of the DPD as a multilingual Javascript library for DPD content.

DPD itself is enormous.
The DPD SQLite3 database alone is 1.8G.
In fact, the DPD is too large for use as a JS library.
THerefore, to create a JS library for the DPD, we need to drastically reduce DPD content to a manageable size.


