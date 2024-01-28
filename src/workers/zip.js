var window = self;

const JSZip = require('jszip');


const difficulties = [];

const xhrs = {};

// Fetch and unzip.
addEventListener('message', async function (evt) {
  const difficulties = JSON.parse(evt.data.difficulties);
  const version = evt.data.version;
  const hash = evt.data.hash;

  console.log("in zip in unzip")

  // check if we have downloaded the zip before
  const downloadedSongs = []
  retrieveSong(evt.data.directDownload).then(async (result) => {
    console.log("zip in unzip")
    console.log(result)
    if (result != null){
      const [short] = version.split('-');
      try {
        console.log(result.zip)
        
          const zipData = result.zip
          const zip = await JSZip.loadAsync(zipData);
      
          const entries = Object.values(zip.files);
      
          const data = {
            audio: undefined,
            beats: {}
          };
      
          const beatFiles = {};
      
          for (const entry of entries) {
            if (entry.dir) continue; // Skip directories
      
            const chunks = await entry.async('uint8array');
      
      
            if (entry.name.endsWith('.egg') || entry.name.endsWith('.ogg')) {
              const blob = new Blob([chunks], { type: 'application/octet-binary' });
              const url = URL.createObjectURL(blob);
      
              data.audio = url;
            } else {
              const filename = entry.name;
              if (!filename.toLowerCase().endsWith('.dat')) continue;
      
              const string = new TextDecoder().decode(chunks);
              const value = JSON.parse(string);
      
              if (filename.toLowerCase() === 'info.dat') {
                data.info = value;
              } else {
                value._beatsPerMinute = evt.data.bpm;
                beatFiles[filename] = value;
              }
            }
      
            if (data.audio === undefined || data.info === undefined) continue;
      
            for (const difficultyBeatmapSet of data.info._difficultyBeatmapSets) {
              const beatmapCharacteristicName = difficultyBeatmapSet._beatmapCharacteristicName;
      
              for (const difficultyBeatmap of difficultyBeatmapSet._difficultyBeatmaps) {
                const difficulty = difficultyBeatmap._difficulty;
                const beatmapFilename = difficultyBeatmap._beatmapFilename;
      
                if (beatFiles[beatmapFilename] === undefined) continue;
      
                const id = beatmapCharacteristicName + '-' + difficulty;
                data.beats[id] = beatFiles[beatmapFilename];
              }
            }
      
            postMessage({ message: 'load', data: data, version: version, hash: hash });
          }    
      } catch (err) {
        console.error(err);
      }
    } else {
      const [short] = version.split('-');
      try {
        fetch(evt.data.directDownload).then(async function(response){
          const zipData = await response.blob();
          const zip = await JSZip.loadAsync(zipData);
      
          const entries = Object.values(zip.files);
      
          const data = {
            audio: undefined,
            beats: {}
          };
      
          const beatFiles = {};
      
          for (const entry of entries) {
            if (entry.dir) continue; // Skip directories
      
            const chunks = await entry.async('uint8array');
      
      
            if (entry.name.endsWith('.egg') || entry.name.endsWith('.ogg')) {
              const blob = new Blob([chunks], { type: 'application/octet-binary' });
              const url = URL.createObjectURL(blob);
      
              data.audio = url;
            } else {
              const filename = entry.name;
              if (!filename.toLowerCase().endsWith('.dat')) continue;
      
              const string = new TextDecoder().decode(chunks);
              const value = JSON.parse(string);
      
              if (filename.toLowerCase() === 'info.dat') {
                data.info = value;
              } else {
                value._beatsPerMinute = evt.data.bpm;
                beatFiles[filename] = value;
              }
            }
      
            if (data.audio === undefined || data.info === undefined) continue;
      
            for (const difficultyBeatmapSet of data.info._difficultyBeatmapSets) {
              const beatmapCharacteristicName = difficultyBeatmapSet._beatmapCharacteristicName;
      
              for (const difficultyBeatmap of difficultyBeatmapSet._difficultyBeatmaps) {
                const difficulty = difficultyBeatmap._difficulty;
                const beatmapFilename = difficultyBeatmap._beatmapFilename;
      
                if (beatFiles[beatmapFilename] === undefined) continue;
      
                const id = beatmapCharacteristicName + '-' + difficulty;
                data.beats[id] = beatFiles[beatmapFilename];
              }
            }
      
            postMessage({ message: 'load', data: data, version: version, hash: hash });
          }
    
        })
    
      } catch (err) {
        console.error(err);
      }
    }
  })
});



function retrieveSong(url){
  return new Promise((resolve, reject) => {

  const dbName = 'songs';
  const dbVersion = 1;
  const db_request = indexedDB.open(dbName, dbVersion);
  db_request.onerror = function(event) {
    console.log("error: ");
    reject()
  };
  db_request.onsuccess = function(event) {
    const db = event.target.result;
    const transaction = db.transaction(["songs"]);
    const objectStore = transaction.objectStore("songs");
    const request = objectStore.get(url);
    request.onsuccess = function(event) {
      console.log("success: "+event.target.result);
      const cursor = event.target.result;
      resolve(cursor);
    };  
  
    request.onerror = function(event) {
      console.log("error: event." + event);

      reject();
    };
  }
})
}