### @sc-voice/pali
JavaScript library for searching
[Digital Pali Dictionary](https://digitalpalidictionary.github.io/titlepage.html)

### Installation
Installing the library also isntalls a Linux command line script
that searches the Digital Pali Dictionary

```
npm install @sc-voice/pali@latest
scripts/dpd --help
```

### Usage 

```
import { Dictionary } from '@sc-voice/pali/main.mjs'

let dict = await Dictionary.create();
let dhamma = dict.find("dhamma", {method: 'entry'});
```
