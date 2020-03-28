import parse from "./music/parser.js";
const loadMIDI = async function () {
  const music = await parse("/music/csv/random_chords.csv");
  // console.log(music);
  const notes = music.filter(d => d.type === "Note_on_c" || d.type === "Note_off_c");
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
}

const createPianoChart = function (notes) {
  // Chart specs
  let svg = d3.select("p#piano").append("svg")
    .attr("width", "1000")
    .attr("height", "600");
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
  // Actual "canvas" of the piano
  piano.append("rect")
    .attr("x", "0")
    .attr("y", "0")
    .attr("width", cw)
    .attr("height", ch / 2)
    .attr("fill", "none");
  let blackKeyHeight = ch / 4 * 1.2; // Adjust this to fit chart properly

  let canvas = svg.append("g").attr("id", "canvas")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");
  // Here for now to help with debugging the area
  canvas.append("rect")
    .attr("x", "0")
    .attr("y", "0")
    .attr("width", cw)
    .attr("height", ch)
    .attr("stroke", "grey")
    .attr("stroke-width", "0.5")
    .attr("fill", "none");

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
  console.log("Piano range: [" + extent + "]");

  let pianoScale = d3.scaleLinear().domain([pianoMin, pianoMax]).range([0, cw]);

  for (let i = 0; i < numScales; i++) {
    let left = pianoMin + i * 12;
    let right = left + 12;
    let blackBottoms = [1, 3, 6, 8, 10];
    console.log(left + " " + right + "\n");

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
loadMIDI();