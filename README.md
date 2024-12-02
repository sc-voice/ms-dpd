### @sc-voice/ms-dpd
MS-DPD: A multilingual JavaScript library for searching
a condensed version of the
[Digital Pali Dictionary](https://digitalpalidictionary.github.io/titlepage.html)

### Command Line
In its simplest form, MS-DPD can be installed as a command line
script on a Linux disttribution.
The command line MS-DPD gives users a quick access to
Pali lookup:

```
> ./scripts/dpd devi
--------------------------
 find:"devi" method:entry
--------------------------
# WORD PAT   MEANING
1 devi ī fem queen
2 devi ī fem goddess
> ./scripts/dpd help
```

The command line program requires 
NodeJS version 20 or later.
If you do not have NodeJS installed, consider using 
[nvm to install NodeJS](https://github.com/nvm-sh/nvm).

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

#### Dictionary
The primary class of interest is Dictionary:

```
import { Dictionary } from '@sc-voice/pali/main.mjs'

let dict = await Dictionary.create();
let dhamma = dict.find("dhamma", {method: 'entry'});
```
Returns `undefined` if not found.

Returns JS object if found:
```
{
  pattern: "dhamma",
  method: "entry",
  data: [...fields]
}
```

Data fields comprise [headword information](https://github.com/digitalpalidictionary/dpd-db/blob/main/docs/dpd_headwords_table.md):

* `construction` how is the word constructed?
* `meaning_1` contextual meaning in current language
* `meaning_2` contextual meaning per Buddhadatta in current language
* `meaning_lit` literal meaning in current language
* `pattern` inflection pattern
* `pos` part of speech
* `stem` stem upon which the inflection pattern is built.
* `word` Pali lookup word
* ...

Search methods include:

* `entry` search for exact Pali word
* `definition` search for definition pattern
* `unaccented` search for Pali words ignoring accents

### Development
The 
[Digital Pali Dictionary (DPD)](https://digitalpalidictionary.github.io/titlepage.html)
(DPD) uses a SQLite3 database which needs to be
downloaded for development:

```
git clone https://github.com/sc-voice/ms-dpd
cd ms-dpd
npm install
./scripts/dpd-install
npm run test
```

#### Design overview

MS-DPD is a Javascript library built 
upon a condensed version of the 
[Digital Pali Dictionary (DPD)](https://digitalpalidictionary.github.io/titlepage.html).
MS-DPD is multilingual by design: 
headwords can be translated into multiple languages
using individual translation files dedicated to a single contemporary language.

#### Condensed content

The DPD itself is enormous, with a goal to span the entire Pali corpus.
Indeed, the DPD SQLite3 database alone is 2G.
Simply put, the full DPD is much too large to squeeze into a simple JS library.
We need some way of condensing the content.

Fortunately, it is possible to select a minimal set of content
that can be used in applications such as SuttaCentral or SC-Voice.
Specifically, we can condense content as follows:

* Restrict lookup to prefixes of words in the Mahāsańghīti corpus
* Convert 5 digit headword keys to radix-62 as <=3 UTF-8 bytes.
* Replace HTML content with concise semantic equivalent
* Split headwords into two files: Pali grammar vs. language-specific meaning
* Omit unused headword fields such as Sanskrit
* Provide users with headword links back to main DPD website
* Only include meaning_2 if substantially different than meaning_1
* (TBD) share unique grammar content in a separate file

With the above condensation, we can reduce DPD content from 2G to ~8M,
which is a 25:1 reduction.
In addition, since headword meaning is separated from Pali grammar,
it is now possible to add multilingual translations
at a cost of about 3-4M per contemporary language.

### Updates
MS-DPD is updated regularly following updates to the DPD itself.

Process:
```
./scripts/dpd-install
./scripts/build-dpd
```

### Support
We welcome corrections and suggestions.
Direct support inquiries to 
email: sc.voice.friends@gmail.com

### References

Many thanks to Venerable Bodhirasa and the entire DPD team
for the wonderful gift of the Digital Pali Dictionary.

* [DPD tables used by MS-DPD](https://docs.google.com/drawings/d/1Vwx1OVHJUKU3vBxn1KSS4Ut-bdLQLl-WgtPpyVNIei4)
* [MS-DPD data files](https://docs.google.com/drawings/d/1HXNbbGY82Ma6mP7z42bzfERGKFbOv4pBnPrRPnwnVxc)

### DPD Updates
To update this library when DPD is updated:

```
./scripts/dpd-install
./scripts/build-dpd
./scripts/publish
```
