var window = self;

const JSZip = require('jszip');
const difficulties = [];
const xhrs = {};

// Fetch and unzip.
addEventListener('message', async function (evt) {
  const difficulties = JSON.parse(evt.data.difficulties);
  const version = evt.data.version;
  const hash = evt.data.hash;

  const [short] = version.split('-');

  try {
    const zip = await JSZip.loadAsync(evt.data.directDownload);

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
});
