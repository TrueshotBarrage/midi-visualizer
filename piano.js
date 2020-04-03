import parse from "./music/parser.js";

var notes;
var tempo;
var div;

var music;

// Default CSV/MIDI file.
var csvFile = "music/csv/psalm_139.csv";
var midiFile = "music/midi/psalm_139.mid";

// Selects a random song from the music directory.
const selectRandomSong = function () {
  let songList = ["psalm_139", "holy_is_the_lord", "fur_elise"];
  let csvDir = "music/csv/";
  let musicDir = "music/midi/";

  let chosenSong = songList[Math.floor(Math.random() * songList.length)];
  csvFile = csvDir + chosenSong + ".csv";
  midiFile = musicDir + chosenSong + ".mid";
  // console.log(csvFile);
}

const loadMIDI = async function () {
  selectRandomSong();
  music = await parse(csvFile);
  // console.log(music);
  notes = music.filter(
    d => d.type === "Note_on_c" || d.type === "Note_off_c");
  // console.log(notes);

  let md = createPianoChart(notes);

  // Create a visible SVG element for each note in the range
  let visualKeys = md.svg.append("g").attr("id", "notes")
    .attr("transform", "translate(" + md.margins.left + ","
      + (md.margins.top + md.ch / 4) + ")");

  let whiteNotes = [0, 2, 4, 5, 7, 9, 11];

  // Used to track white notes' bottom halves
  let whiteTracker = md.extent[0];

  for (let i = whiteTracker; i < md.extent[1]; i++) {
    let note = visualKeys.append("g").attr("id", "note" + i);
    // If white note
    if (whiteNotes.includes(i % 12)) {
      note.attr("class", "white");
      // Top half of the white keys.
      // The "+2 and -4" are offsets to show the full borders (which have 
      // "stroke-width" set to 2 currently)
      note.append("rect")
        .attr("x", md.pianoScale(i) + 2)
        .attr("y", 1)
        .attr("width", md.pianoScale(i + 1) - md.pianoScale(i) - 4)
        .attr("height", md.blackKeyHeight)
        .attr("fill", "white");
      // Bottom half of the white keys.
      let threshold = (whiteTracker - Math.floor(whiteTracker)) * 7;
      if (threshold > 2.8 && threshold < 3.2) { // if threshold ~= 3 (third key)
        note.append("rect")
          .attr("x", md.pianoScale(whiteTracker) + 2)
          .attr("y", md.blackKeyHeight + 1)
          .attr("width", md.pianoScale(i + 11 / 7) - md.pianoScale(i) - 4)
          .attr("height", md.ch / 2 - md.blackKeyHeight - 2)
          .attr("fill", "white");
      } else if (threshold > 0.8 && threshold < 1.2) { // if threshold ~= 1 (fourth key)
        note.append("rect")
          .attr("x", md.pianoScale(whiteTracker - 1 / 7) + 2)
          .attr("y", md.blackKeyHeight + 1)
          .attr("width", md.pianoScale(i + 13 / 7) - md.pianoScale(i) - 4)
          .attr("height", md.ch / 2 - md.blackKeyHeight - 2)
          .attr("fill", "white");
      } else { // all the other keys (aka the normal *cough* easy *cough* ones)
        note.append("rect")
          .attr("x", md.pianoScale(whiteTracker) + 2)
          .attr("y", md.blackKeyHeight + 1)
          .attr("width", md.pianoScale(i + 12 / 7) - md.pianoScale(i) - 4)
          .attr("height", md.ch / 2 - md.blackKeyHeight - 2)
          .attr("fill", "white");
      }
      whiteTracker += 12 / 7;

    } else { // If black note
      note.attr("class", "black");
      // Top half of the black keys.
      // The "+1 and -2" are offsets to show the full borders (which have 
      // "stroke-width" set to 2 currently)
      note.append("rect")
        .attr("x", md.pianoScale(i) + 1)
        .attr("y", 1)
        .attr("width", md.pianoScale(i + 1) - md.pianoScale(i) - 2)
        .attr("height", md.blackKeyHeight - 2)
        .attr("fill", "black");
    }
  }

  // Tempo needed to calculate the speed of the animation
  tempo = music.filter(d => d.type === "Tempo");
  tempo = tempo[0].channel;

  div = music.filter(d => d.type === "Header");
  div = div[0].velocity;

  asyncSetup();
}

// Wrapper to call for dependencies and then show button to be ready.
const asyncSetup = async function () {
  await fetchDependencies();
}

// Fetches resources needed to load the music file concurrently with the 
// visual animations.
const fetchDependencies = async function () {
  MIDIjs.message_callback = function (msg) {
    let promise = new Promise((resolve) => {
      if (msg.substring(0, 7) === "Playing") {
        // console.log(msg);
        resolve("Ready!");
      }
    })
    promise.then(function () {
      setTimeout(MIDIjs.pause, 15); // to ensure music STOPS after init loading
      setButtonReady();
    });
  }
  MIDIjs.play(midiFile);
}

// Allows the button to be pressed, and changes its status to "ready".
const setButtonReady = function () {
  let button = d3.select("g#button")
    .on("click", function () {
      play(notes, tempo, div);
    });
  button.select("rect#buttonRect")
    .attr("fill", "#4CC550");
  button.select("text#buttonText")
    .transition().duration(100)
    .text("Ready!");
  // console.log("Button ready!");
}

// Starts the MIDI file.
const play = function (notes, tempo, div) {
  MIDIjs.resume();
  // console.log("Start!");

  setTimeout(() => {
    notes.forEach(row => {
      setTimeout(() => {
        if (row.type == "Note_off_c") {
          noteOff(row.note);
        } else if (row.type == "Note_on_c") {
          if (row.velocity == 0) {
            noteOff(row.note);
          } else {
            noteOn(row.note);
          }
        } else {
          console.log("Done!");
        }
      }, row.time * (500 / div) * (tempo / 500000));
      // Long story short, some calculations were done based on the MIDICSV 
      // documentation's info about "Tempo", "Header", and the random_chords file.
    });
  }, Math.floor((music.length) / 16)); // <-- This value here should be adjusted 
  //         with more precision to help with the delay of the visual animation.

  // Disables button after starting the animation
  let button = d3.select("g#button")
    .on("click", null);
  button.select("text#buttonText")
    .transition().duration(100)
    .text("Enjoy! <3");
}

// Changes the color of a note when pressed (played).
const noteOn = function (note) {
  let n = d3.select("#note" + note);
  if (n.attr("class") == "white") {
    n.selectAll("rect")
      .transition().duration(50)
      .attr("fill", "#ff9999");
  } else {
    n.selectAll("rect")
      .transition().duration(50)
      .attr("fill", "#ff6666");
  }
}

// Reverts the color of a note back when depressed.
const noteOff = function (note) {
  let n = d3.select("#note" + note);
  if (n.attr("class") == "white") {
    n.selectAll("rect")
      .transition().duration(100)
      .attr("fill", "white");
  } else {
    n.selectAll("rect")
      .transition().duration(100)
      .attr("fill", "black");
  }
}

const createPianoChart = function (notes) {
  // Chart specs
  let svg = d3.select("#piano").append("svg")
    .attr("width", "1400")
    .attr("height", "500");
  let w = svg.attr("width");
  let h = svg.attr("height");
  let margins = { "top": 50, "right": 50, "bottom": 50, "left": 50 };
  let cw = w - margins.left - margins.right;
  let ch = h - margins.top - margins.bottom;
  let extent;

  // SVG elements for plotting
  let piano = svg.append("g").attr("id", "piano")
    .attr("transform", "translate(" + margins.left + ","
      + (margins.top + ch / 4) + ")")
    .attr("stroke", "black")
    .attr("stroke-width", "2");
  piano.append("rect") // Actual "canvas" of the piano
    .attr("x", "0")
    .attr("y", "0")
    .attr("width", cw)
    .attr("height", ch / 2)
    .attr("fill", "none");

  let blackKeyHeight = ch / 4 * 1.2; // Adjust this to fit chart properly

  // Contains the text elements, buttons, etc.
  let canvas = svg.append("g").attr("id", "canvas")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");
  // Rectangle below is for debugging, but can be added.
  // canvas.append("rect")
  //   .attr("x", "0")
  //   .attr("y", "0")
  //   .attr("width", cw)
  //   .attr("height", ch)
  //   .attr("stroke", "grey")
  //   .attr("stroke-width", "0.5")
  //   .attr("fill", "none");

  // Actual minmax values of the MIDI file's notes
  const min = d3.min(notes, (d) => { return d.note });
  const max = d3.max(notes, (d) => { return d.note });

  // Adjusted minmax values for lower and upper bounds of the piano
  let pianoMin = Math.floor(min / 12);
  let pianoMax = Math.ceil(max / 12);
  const numScales = pianoMax - pianoMin;
  pianoMin = pianoMin * 12;
  pianoMax = pianoMax * 12;
  extent = [pianoMin, pianoMax];
  // console.log("Piano range: [" + extent + "]");

  let pianoScale = d3.scaleLinear().domain([pianoMin, pianoMax]).range([0, cw]);

  for (let i = 0; i < numScales; i++) {
    let left = pianoMin + i * 12;
    let right = left + 12;
    let blackBottoms = [1, 3, 6, 8, 10];
    // console.log(left + " " + right + "\n");

    for (let j = left; j < right; j++) {
      // All keys (top half)
      piano.append("line")
        .attr("x1", pianoScale(j))
        .attr("y1", 0)
        .attr("x2", pianoScale(j))
        .attr("y2", blackKeyHeight);
    }
    // Bottom of black keys
    blackBottoms.forEach(d => {
      piano.append("line")
        .attr("x1", pianoScale(left + d))
        .attr("y1", blackKeyHeight)
        .attr("x2", pianoScale(left + d + 1))
        .attr("y2", blackKeyHeight);
    });
    // White keys (bottom half)
    for (let j = 0; j < 7; j++) {
      if (j != 3) {
        piano.append("line")
          .attr("x1", pianoScale(left + (j * 12 / 7)))
          .attr("y1", blackKeyHeight)
          .attr("x2", pianoScale(left + (j * 12 / 7)))
          .attr("y2", ch / 2);
      }
    }
    // Bottom half between two consecutive white keys
    piano.append("line")
      .attr("x1", pianoScale(left))
      .attr("y1", blackKeyHeight)
      .attr("x2", pianoScale(left))
      .attr("y2", ch / 2);
    piano.append("line")
      .attr("x1", pianoScale(left + 5))
      .attr("y1", blackKeyHeight)
      .attr("x2", pianoScale(left + 5))
      .attr("y2", ch / 2);
  }

  // Container to hold all the chart elements together.
  canvas.append("text") // Title text
    .text("MIDI Visualizer")
    .attr("x", cw / 2)
    .attr("y", ch / 10)
    .attr("font-size", "30")
    .attr("letter-spacing", "1.6px")
    .style("text-anchor", "middle")
    .style("font-weight", "bold");
  canvas.append("text") // Header text
    .text("Refresh the page to get a random song! Currently working on custom MIDI...")
    .attr("x", cw / 2)
    .attr("y", ch / 5)
    .attr("font-size", "22")
    .attr("letter-spacing", "1.6px")
    .style("text-anchor", "middle");
  let button = canvas.append("g") // Button grouped into a single element
    .attr("id", "button");
  button.append("rect") // Button
    .attr("x", cw / 2 - 50)
    .attr("y", 5 * ch / 6)
    .attr("width", "100")
    .attr("height", "50")
    .attr("stroke", "#4C8F50")
    .attr("stroke-width", "0.5")
    .attr("fill", "red")
    .attr("id", "buttonRect");
  button.append("text") // Button text
    .text("Loading...")
    .attr("x", cw / 2)
    .attr("y", 5 * ch / 6 + 30)
    .attr("font-size", "14")
    .attr("letter-spacing", "1px")
    .attr("id", "buttonText")
    .attr("fill", "white")
    .style("text-anchor", "middle");

  return {
    svg: svg,
    margins: margins,
    cw: cw,
    ch: ch,
    blackKeyHeight: blackKeyHeight,
    extent: extent,
    pianoScale: pianoScale
  };
}

// Makes XMLHttpRequests (XHR) to a resource at a given URL.
// Turns out I didn't need to do this. Wasted 12 hours fml.
const makeRequest = function (method, url) {
  return new Promise(function (resolve, reject) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.onload = function () {
      if (this.status >= 200 && this.status < 300) {
        resolve(xhr.response);
      } else {
        reject({
          status: this.status,
          statusText: xhr.statusText
        });
      }
    };
    xhr.onerror = function () {
      reject({
        status: this.status,
        statusText: xhr.statusText
      });
    };
    xhr.send();
  });
}

loadMIDI();
