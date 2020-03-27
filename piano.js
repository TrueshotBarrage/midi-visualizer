import parse from "./music/parser.js";
const requestData = async function () {
  const music = await parse("/music/csv/random_chords.csv");
  console.log(music);

  // Chart specs
  let svg = d3.select("p#piano").append("svg")
    .attr("width", "1000")
    .attr("height", "600");
  let w = svg.attr("width");
  let h = svg.attr("height");
  let margins = { "top": 50, "right": 50, "bottom": 50, "left": 50 };
  let cw = w - margins.left - margins.right;
  let ch = h - margins.top - margins.bottom;

  // SVG elements for plotting
  let piano = svg.append("g").attr("id", "piano");
  let canvas = svg.append("g").attr("id", "canvas")
    .attr("transform", "translate(" + margins.left + "," + margins.top + ")");


}
requestData();