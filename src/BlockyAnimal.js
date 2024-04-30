// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotation;
  void main() {
    gl_Position = u_GlobalRotation * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

//Global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotation;

//get the canvas and gl context
function setupWebGL(){
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  //gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

//compile the shader programs, attach the javascript variables to the GLSL variables
function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotation = gl.getUniformLocation(gl.program, 'u_GlobalRotation');
  if (!u_GlobalRotation) {
    console.log('Failed to get the storage location of u_GlobalRotation');
    return;
  }

  // Set the initial value of this matrix to identity
  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);

}

//Constants
const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Global variables related to UI elements
let g_selectedColor=[1.0,1.0,1.0,1.0];
let g_selectedSize=5;
let g_selectedType=POINT;
let g_selectedSegments=10;
let g_globalAngle = 0;
let g_tailMiddleAngle = 0;
let g_tailBottomAngle = 0;
let g_tailTopAngle = 0;
let g_tailFullAnimation = false;
let g_tailMiddleAnimation = false;
let g_tailTopAnimation = false;
let g_tailBottomAnimation = false;

// Set up actions for the HTML UI elements
function addActionsForHtmlUI(){
    // Button Events (Shape Type)
    document.getElementById('animationFullOffButton').onclick   = function() { g_tailFullAnimation=false;};
    document.getElementById('animationFullOnButton').onclick   = function() { g_tailFullAnimation=true;};
    document.getElementById('animationTailMiddleOffButton').onclick   = function() { g_tailMiddleAnimation=false;};
    document.getElementById('animationTailMiddleOnButton').onclick   = function() { g_tailMiddleAnimation=true;};
    document.getElementById('animationTailTopOffButton').onclick   = function() { g_tailTopAnimation=false;};
    document.getElementById('animationTailTopOnButton').onclick   = function() { g_tailTopAnimation=true;};
    document.getElementById('animationTailBotoomOffButton').onclick   = function() { g_tailBottomAnimation=false;};
    document.getElementById('animationTailBottomOnButton').onclick   = function() { g_tailBottomAnimation=true;};

    document.getElementById('tailBottomSlide').addEventListener('mousemove',   function() { g_tailBottomAngle = this.value; renderScene();});
    document.getElementById('tailMiddleSlide').addEventListener('mousemove',   function() { g_tailMiddleAngle = this.value; renderScene();});
    document.getElementById('tailTopSlide').addEventListener('mousemove',   function() { g_tailTopAngle = this.value; renderScene();});
    document.getElementById('angleSlide').addEventListener('mousemove',   function() { g_globalAngle = this.value; renderScene();});
}

function main() {

  //Set up canvas and gl variables
  setupWebGL();
  // Set up GLSL shader programs and connect GLSL variables
  connectVariablesToGLSL();

  //Setup actions for the HTML UI variables
  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown = click;
  canvas.onmousemove = function(ev) { if (ev.buttons == 1) { click(ev) } };

  // Specify the color for clearing <canvas>
  gl.clearColor(1.0, 1.0, 1.0, 1.0);

  // Clear <canvas>
  //gl.clear(gl.COLOR_BUFFER_BIT);
  //renderScene();
  requestAnimationFrame(tick);

}

var g_shapesList = [];

function click(ev) {
  //Extract the event click and return it in WebGL coordinates
  let [x,y] = convertCoordinatesEventToGL(ev);
  g_globalAngle = x * 120;
  renderScene();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//Extract the event click and return it in WebGL coordinates
function convertCoordinatesEventToGL(ev){
    var x = ev.clientX; // x coordinate of a mouse pointer
    var y = ev.clientY; // y coordinate of a mouse pointer
    var rect = ev.target.getBoundingClientRect();
  
    x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
    y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  
    return([x, y]);
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0 - g_startTime;

//Called by browser repeatedly whenever its time
function tick() {
  g_seconds = performance.now()/1000.0 - g_startTime;
  updateAnimationAngles();
  renderScene();
  requestAnimationFrame(tick);
}

//Update the angles of everything if currently animated
function updateAnimationAngles(){
  if (g_tailFullAnimation){
    g_tailBottomAngle = (15*Math.sin(g_seconds));
    g_tailMiddleAngle = (25*Math.sin(g_seconds));
    g_tailTopAngle = (20*Math.sin(g_seconds));
  }
  if (g_tailBottomAnimation){
    g_tailBottomAngle = (15*Math.sin(g_seconds));
  }
  if (g_tailMiddleAnimation){
    g_tailMiddleAngle = (25*Math.sin(g_seconds));
  }
  if (g_tailTopAnimation){
    g_tailTopAngle = (20*Math.sin(g_seconds));
  }
}

//OPTIMIZATION: Create vertices buffer only once
let vertices = null;

function drawCube(M, color){
  var rgba = color;
  //We have 4f below as we are passing 4 floating point values
  gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

  gl.uniformMatrix4fv(u_ModelMatrix, false, M.elements);

  drawTriangle3D([0,0,0,  1,1,0,  1,0,0]);
  drawTriangle3D([0,0,0,  0,1,0,  1,1,0]);

  //Fake the lighting by coloring different sides slightly different color
  gl.uniform4f(u_FragColor, rgba[0]*.9, rgba[1]*.9, rgba[2]*.9, rgba[3]);

  drawTriangle3D([0,1,0,  0,1,1,  1,1,1]);
  drawTriangle3D([0,1,0,  1,1,1,  1,1,0]);

  drawTriangle3D([1,1,0,  1,0,0,  1,1,1]);
  drawTriangle3D([1,0,0,  1,1,1,  1,0,1]);

  drawTriangle3D([0,1,0,  0,0,0,  0,0,1]);
  drawTriangle3D([0,1,0,  0,0,1,  0,1,1]);

  drawTriangle3D([0,0,0,  1,0,1,  0,0,1]);
  drawTriangle3D([0,0,0,  1,0,1,  1,0,0]);

  drawTriangle3D([0,0,1,  0,1,1,  1,1,1]);
  drawTriangle3D([0,0,1,  1,0,1,  1,1,1]);
}


//based on some data structure that is holding all the information about what to draw, 
//actually draw all the shapes.
function renderScene(){

  // Check the time at the start of this function
  var startTime = performance.now();

  var globalRotMat = new Matrix4().rotate(g_globalAngle, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotation, false, globalRotMat.elements);

  // Clear <canvas>
   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
   gl.clear(gl.COLOR_BUFFER_BIT);

    //var len = g_points.length;
 // var len = g_shapesList.length;
 // for(var i = 0; i < len; i++) {
 //   g_shapesList[i].render();
 // }

  var color = [1.0,0.0,0.0,1.0];
  var M = new Matrix4;

 //Draw the Head Cube
  color = [0.37,0.,0,1.0];
  M.setIdentity();
  M.translate(-.55,.35,0.0);
  M.scale(0.7,.4,.5);
  drawCube(M, color);

  //Draw eyes
  M.setIdentity();
  color = [1,1,1,1.0];
  M.translate(-.45,.59,-0.05);
  M.scale(0.1,.1,.1);
  drawCube(M, color);

  M.setIdentity();
  color = [0,0,0,1.0];
  M.translate(-.43,.6,-0.07);
  M.scale(0.05,.05,.05);
  drawCube(M, color);

  M.setIdentity();
  color = [1,1,1,1.0];
  M.translate(-.05,.59,-0.05);
  M.scale(0.1,.1,.1);
  drawCube(M, color);

  M.setIdentity();
  color = [0,0,0,1.0];
  M.translate(-.03,.6,-0.07);
  M.scale(0.05,.05,.05);
  drawCube(M, color);

  //Draw snout
  M.setIdentity();
  color = [0.48,0.,0,1.0];
  M.translate(-.3,0.36,-0.1);
  M.scale(0.2,.18,.2);
  drawCube(M, color);

  //Draw nose
  M.setIdentity();
  color = [0,0,0,1.0];
  M.translate(-0.25,.48,-0.13);
  M.scale(0.09,.07,.05);
  drawCube(M, color);

  //Draw mouth
  M.setIdentity();
  color = [0,0,0,1.0];
  M.translate(-0.21,.4,-0.11);
  M.scale(0.01,.1,.03);
  drawCube(M, color);

  M.setIdentity();
  color = [0,0,0,1.0];
  M.translate(-0.21,.4,-0.106);
  M.scale(0.07,.01,.03);
  drawCube(M, color);

  M.setIdentity();
  color = [0,0,0,1.0];
  M.translate(-0.27,.4,-0.106);
  M.scale(0.07,.01,.03);
  drawCube(M, color);

  //Draw ears
  M.setIdentity();
  color = [0.27,0.,0,1.0];
  M.translate(.16,0.41,-0.07);
  M.rotate(6,10,0,25); //6,10,0,25
  M.scale(0.1,0.35,.2);
  drawCube(M, color);

  M.setIdentity();
  color = [0.27,0.,0,1.0];
  M.translate(-.66,0.41,-0.07);
  M.rotate(-6,10,0,25);
  M.scale(0.1,0.35,.2);
  drawCube(M, color);

  //Draw neck
  M.setIdentity();
  color = [0.27,0.,0,1.0];
  M.translate(-0.3,0.2,0.2);
  //body.matrix.rotate(-5,1,0,0);
  M.scale(0.2,0.24,.2);
  drawCube(M, color);

  //Draw body
  M.setIdentity();
  color = [0.37,0.,0,1.0];
  M.translate(-0.5,-0.45,0.14);
  //body.matrix.rotate(-5,1,0,0);
  M.scale(0.6,.68,.4);
  drawCube(M, color);

  //Draw paws
  M.setIdentity();
  color = [0.2,0.,0,1.0];
  M.translate(-0.5,-0.47,-0.07);
  M.scale(0.2,0.24,.2);
  drawCube(M, color);

  M.setIdentity();
  color = [0.2,0.,0,1.0];
  M.translate(-0.7,-0.47,0.35);
  M.scale(0.2,0.24,.2);
  drawCube(M, color);

  M.setIdentity();
  color = [0.2,0.,0,1.0];
  M.translate(-0.1,-0.47,-0.07);
  M.scale(0.2,0.24,.2);
  drawCube(M, color);

  M.setIdentity();
  color = [0.2,0.,0,1.0];
  M.translate(0.1,-0.47,0.35);
  M.scale(0.2,0.24,.2);
  drawCube(M, color);

  //Draw legs
  M.setIdentity();
  color = [0.27,0.,0,1.0];
  M.translate(-0.5,-0.01,.04);
  M.scale(0.2,0.235,.1);
  drawCube(M, color);

  M.setIdentity();
  color = [0.27,0.,0,1.0];
  M.translate(-0.5,-0.24,.04);
  M.scale(0.2,0.235,.1);
  drawCube(M, color);

  M.setIdentity();
  color = [0.25,0.,0,1.0];
  M.translate(-0.61,-0.24,0.35);
  M.scale(0.11,0.47,.2);
  drawCube(M, color);

  M.setIdentity();
  color = [0.27,0.,0,1.0];
  M.translate(-0.1,-0.01,0.04);
  M.scale(0.2,0.235,.1);
  drawCube(M, color);

  M.setIdentity();
  color = [0.27,0.,0,1.0];
  M.translate(-0.1,-0.24,0.04);
  M.scale(0.2,0.235,.1);
  drawCube(M, color);


  M.setIdentity();
  color = [0.25,0.,0,1.0];
  //M.translate(0.1,-0.24,0.35);
  M.translate(0.1,-0.24,0.35);
  M.scale(0.11,0.47,.2);
  drawCube(M, color);

  //Draw tail
  M.setIdentity();
  color = [0.2,0.,0,1.0];
  //tail1.matrix.rotate(0,1,0,45);

  //var bottomTailCoordinatesMat = new Matrix4(M);
  //M.scale(0.15,0.15,.2);
  //M.translate(-0.26,-0.45,0.5);

    //Rotates up and down, the way we want the back leg
    //M.setTranslate(0,-0.45, 0.5);
    //M.rotate(g_tailBottomAngle,0,0,1);
    //var bottomTailCoordinatesMat = new Matrix4(M);
    //M.scale(0.15, 0.15, 0.2);
    //M.translate(-1.8,0, 0);

  //M.setTranslate(0,-0.45, 0);
  //M.rotate(g_tailBottomAngle,0,0,1);
  //var bottomTailCoordinatesMat = new Matrix4(M);
  
  //M.translate(-0.275,-0.45,0.5);
  //M.rotate(g_tailBottomAngle,0,0,1);
  //var bottomTailCoordinatesMat = new Matrix4(M);
 //M.scale(0.15, 0.15, 0.2);
  //drawCube(M, color);

  var bottomTail = new Cube();
  bottomTail.color = [0.7,0.,0,1.0];
  //Rotates up and down, not sideways
  bottomTail.matrix.setTranslate(0,-.5,0.0);
  bottomTail.matrix.rotate(-g_tailBottomAngle,0,0,1);
  var botTailCoordinatesMat = new Matrix4(bottomTail.matrix);
  bottomTail.matrix.scale(0.15, 0.5, 0.2);
  bottomTail.matrix.translate(-1.8,0.1,2.6);
  bottomTail.render();

   var middleTail = new Cube();
   middleTail.color = [0.5,0.,0,1.0];
   middleTail.matrix = botTailCoordinatesMat;
   middleTail.matrix.translate(-0.2,0.65,.3);
   middleTail.matrix.rotate(g_tailMiddleAngle,0,0,1);
  var midTailCoordinatesMat = new Matrix4(middleTail.matrix);
   middleTail.matrix.scale(0.1,.3,.1);
   middleTail.matrix.translate(-.5,-0.6,2.7);
   middleTail.render();

   var topTail = new Cube();
   topTail.color = [1,0.2,0,1.0];
   topTail.matrix = midTailCoordinatesMat;
   topTail.matrix.translate(-0.01,0.21,0.03);
   topTail.matrix.rotate(g_tailTopAngle,0,0,1);
   topTail.matrix.scale(0.1,.2,.1);
   topTail.matrix.translate(-.5,-0.6,2.7);
   topTail.render();

 // M.setIdentity();
 // color = [0.24,0.,0,1.0];
  //M = bottomTailCoordinatesMat;
 // M.translate(-0.253,-0.3,0.63);
 // M.rotate(g_tailMiddleAngle,0,0,1);
           //tail1.matrix.rotate(-4,10,0,25);
 // M.scale(0.1,0.2,.1);
  //drawCube(M, color);

  //M.setIdentity();
  //color = [0.27,0.,0,1.0];
  //M.translate(-0.23,-0.1,0.68);
  //tail3.matrix.rotate(0,10,-6,25);
  //M.scale(0.06,0.2,.07);
  //drawCube(M, color);

  //Using a non-cube primitive
  var hat = new Cone();
  hat.position = [1,1,1];
  hat.color = [1, 0, 0, 1.0];
  hat.render();

  // Check the time at the end of the function, and show on web page
  var duration = performance.now() - startTime;
  var len = 10;
  sendTextToHTML("Performance: " + " fps: " + Math.floor(10000/duration)/10, "numdot");

}


//Set the text of a HTML element
function sendTextToHTML(text, htmlID) {
    var htmlElm = document.getElementById(htmlID);
    if (!htmlElm) {
        console.log("Failed to get " + htmlID + " from HTML");
        return;
    }
    htmlElm.innerHTML = text;
}