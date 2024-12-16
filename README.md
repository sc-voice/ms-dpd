### @sc-voice/ms-dpd
MS-DPD: A multilingual JavaScript library for searching
a condensed version of the
[Digital Pali Dictionary](https://digitalpalidictionary.github.io/titlepage.html)

### MS-DPD Command Line Interface
In its simplest form, MS-DPD can be installed as a command line
script on a Linux distribution.
In particular, the `dpd` script provides a
subset of the full capability of the Digital Pali Dictionary.

#### Install CLI
The Command Line Interpreter (CLI) requires 
NodeJS version 20 or later.
If you do not have NodeJS installed, consider using 
[nvm to install NodeJS](https://github.com/nvm-sh/nvm).

The first step in installing the CLI is to clone
the MS-DPD repository. 
If you are a contributor to MS-DPD itself, you should
use a read/write clone of MS-DPD:

```
git clone git@github.com:sc-voice/ms-dpd.git
```

However, for most users, the a read-only clone will
be fine:

```
git clone https://github.com/sc-voice/ms-dpd
```

Once you have cloned the repository, complete the
installation:

```
cd ms-dpd
npm install
./scripts/dpd --help
```

After installing the CLI, you can call it 
to find the meaning of a Pali word in supported
languages. The default language is EN, but we
are also working towards DE,PT,ES and FR translations.

#### German query
Sample output for finding the meaning of `evaṁ` in German:

```
./scripts/dpd -l de evam
-------------------------------
 find:"evam" method:unaccented
 -------------------------------
# WORD PAT MEANING
1 evaṁ     so; dies; solcherart; ähnlich; in derselben Art und Weise
2 evaṁ     ja!; das ist richtig!; genau!
```

#### English query
Sample output for finding the meaning of `devi` in the default language
English. The PAT field, if present, identifies the pattern of inflections
that apply to the word
(e.g. _feminine inflections with primary suffix `-i`_):

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

### Library
MS-DPD is also a Javascript library ready for web use.
MS-DPD has dynamically loaded language modules for
supported languages.
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
* `lemma_1` unique headword and number
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
git clone git@github.com:sc-voice/ms-dpd.git
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

### Multilingual

Multilingual content is split out by language code in the
[dpd](https://github.com/sc-voice/ms-dpd/tree/main/dpd)
directory.
The English meanings come directly from the DPD and should not be 
changed manualy since they are updated by whien building this library.

### Acknowledgements

This work would not have been possible without the help of many others.
Their kindness, dedication, thoroughness and energy are sources of 
inpiration to all of us. 
In particular, we would like to thank:

* Venerable Bodhirasa and the [Digital Pali Dictionary](https://digitalpalidictionary.github.io/titlepage.html) team for all their past and ongoing efforts to provide the world with the great gift of the Digital Pali Dictionary. 

* Venerable Sujato and the [SuttaCentral](https://suttacentral.net) team for the their impeccable efforts to translate and collect in one place the teachings of the Buddha found in the Early Buddhist Texts (EBT).

* All of the users of [SC-Voice](https://sc-voice.net), who are constantly teaching us better ways to access the wisdom found in the EBTs.


