### @sc-voice/pali
JavaScript library for searching
[Digital Pali Dictionary](https://digitalpalidictionary.github.io/titlepage.html)

### Command Line
The command line program requires 
NodeJS version 20 or later.
If you do not have NodeJS installed, consider using 
[nvm to install NodeJS](https://github.com/nvm-sh/nvm).
For a command line program that gives quick access to DPD:

```
git clone https://github.com/sc-voice/pali
cd pali
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
npm install @sc-voice/pali@latest
```

The primary class of interest is Dictionary:

```
import { Dictionary } from '@sc-voice/pali/main.mjs'

let dict = await Dictionary.create();
let dhamma = dict.find("dhamma", {method: 'entry'});
```
