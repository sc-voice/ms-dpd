import { compress, decompress } from 'shrink-string';

let APIURL = 'https://suttacentral.net/api';
let url = `${APIURL}/dictionaries/lookup?from=pli&to=en`;
let res = await fetch(url);
let data = await res.json();
let dataMap = {};
for (let i = 0; i < data.length; i++) {
  let di = data[i];
  let key = di.entry;
  let { definition } = di;
  let info = JSON.stringify({ v:definition });
  if (definition) {
    if (1) {
      let infoCompress = await compress(info);
      dataMap[key] = infoCompress;
    } else {
      dataMap[key] = info;
    }
  }
}
let out = JSON.stringify(dataMap,null,1);
console.log(dataMap.dhamma);
let keys = Object.keys(dataMap);
console.log(keys.length, out.length);
