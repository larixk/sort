/* global dat, jQuery */

// Configuration stuff, settable with dat.Gui
var config = {
  strength:  0.75,
  threshold: 0.45,
  scale:     1,
  vertical:  true
};

// shim layer with setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
  })();

window.setImmediate = (function () {
    return  window.setImmediate              ||
            function( callback ) {
                return window.setTimeout(callback, 0);
              };
  })();

(function ($, container) {
  'use strict';

  var src = 'img/test.jpg',

    width,           // Canvas width
    rowWidth,        // Length of a row of pixels in the bitmap data
    height,          // Canvas height
    $canvas,         // jQuery canvas object
    $container,      // jQuery parent of canvas object
    img,             // HTML img with our source
    ctx,             // 2d canvas context
    running = false, // Is the requestAnimationFrame running for draws?

    gui,             // Controls

    thresholdInt,    // Threshold value converted to a scale of max 3 * 255
    a,               // Strength, used for alpha blending
    vertical,        // Orientation of comparisons

    maxColumn,       // If horizontal, all but the rightmost column
    maxRow,          // If vertical, all but the bottom row

    bitmap,          // ImageData object
    bitmapData;      // R's, G's, B's and A's for every X and Y

  // Change the color of a pixel in a bitmap with alpha blending
  function setPixel(index, r, g, b) {
    var orgR = bitmapData[index],
      orgG = bitmapData[index + 1],
      orgB = bitmapData[index + 2];

    // Linear interpolation with a
    bitmapData[index]     = orgR + a * (r - orgR);
    bitmapData[index + 1] = orgG + a * (g - orgG);
    bitmapData[index + 2] = orgB + a * (b - orgB);
  }

  // Compare the difference between two indexes in the bitmap
  function compare(sourceIndex, targetIndex) {
    var oldTotal = bitmapData[targetIndex] +
        bitmapData[targetIndex + 1] +
        bitmapData[targetIndex + 2],
      newTotal = bitmapData[sourceIndex] +
        bitmapData[sourceIndex + 1] +
        bitmapData[sourceIndex + 2];

    // Which way are we comparing?
    if (thresholdInt > 0) {
      return (oldTotal - newTotal) > thresholdInt;
    } else {
      return (oldTotal - newTotal) < thresholdInt;
    }
  }

  // Compare and recolor two bitmap indices
  function processIndexPair(sourceIndex, targetIndex) {
    if (!compare(sourceIndex, targetIndex)) {
      return;
    }

    // Save values before overwriting
    var oldR = bitmapData[targetIndex],
      oldG = bitmapData[targetIndex + 1],
      oldB = bitmapData[targetIndex + 2];

    // Swap them pixels
    setPixel(targetIndex, bitmapData[sourceIndex], bitmapData[sourceIndex + 1], bitmapData[sourceIndex + 2]);
    setPixel(sourceIndex, oldR, oldG, oldB);
  }

  // Do a single iteration
  function iterate() {
    // Loop through all the pixels
    for(var rowIndex = 0; rowIndex < maxRow; rowIndex += rowWidth) {
      var maxY = rowIndex + maxColumn;
      for(var columnIndex = rowIndex; columnIndex < maxY; columnIndex += 4) {
        if (vertical) {
          // Compare [x, y] with [x, y + 1]
          processIndexPair(columnIndex, columnIndex + rowWidth);
        } else {
          // Compare [x, y] with [x + 1, y]
          processIndexPair(columnIndex, columnIndex + 4);
        }
      }
    }

    // Repeat immediately
    window.setImmediate(iterate);
  }

  // Copy the latest bitmap to the canvas every frame
  function draw() {
    window.requestAnimFrame(draw);
    ctx.putImageData(bitmap, 0, 0);
  }

  // Start drawing, start moving
  function start() {
    if (running) {
      return;
    }
    running = true;
    draw();
    iterate();
  }

  // When image data is loaded
  function imageReady() {
    // How big is the image?
    width  = img.width  * config.scale;
    height = img.height * config.scale;

    // Fill the container
    $canvas.css('width', width)
      .css('height', height)
      .attr('width', width)
      .attr('height', height);

    // Define compared pixels
    rowWidth = width * 4;
    if (vertical) {
      // All but the bottom row
      maxColumn = rowWidth;
      maxRow = (height - 1) * rowWidth;
    } else {
      // All but the right column (= 4 values)
      maxColumn = rowWidth - 4;
      maxRow = height * rowWidth;
    }

    // Get the bitmap to paint on
    ctx.drawImage(img, 0, 0, width, height);
    bitmap = ctx.getImageData(0, 0, width, height);
    bitmapData = bitmap.data;

    // Start walking
    start();
  }

  // Stretch the canvas to fit the container and restart the magic
  function reload() {
    // Load config values
    a = config.strength;
    vertical = config.vertical;

    // Scale over maximum value
    thresholdInt = Math.floor(Math.pow(config.threshold, 7) * 3 * 255);

    // Place the image
    img = new Image();
    img.onload = imageReady;
    img.src = src;
  }

  // Adds controls
  function addDatGui() {
    gui = new dat.GUI();
    gui.close();

    gui.add(config, 'scale', 1, 4).step(1).onFinishChange(reload);
    gui.add(config, 'strength', 0, 1).onFinishChange(reload);
    gui.add(config, 'threshold', -1, 1).onFinishChange(reload);
    gui.add(config, 'vertical').onFinishChange(reload);

    $('#controls').on('click', function () {
      gui.open();
      return false;
    });
  }

  // Dropping occured
  function fileDropped (e) {
    e.originalEvent.stopPropagation();
    e.originalEvent.preventDefault();

    var files = e.originalEvent.dataTransfer.files; // FileList object
    if (!(files && files.length)) {
      return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      src = e.target.result;
      reload();
    };
    reader.readAsDataURL(files[0]);
  }

  // Prepare to allow droppings
  function initFileDrop ($dropZone) {
    $dropZone
      .bind('dragover', false)
      .bind('dragenter', false)
      .bind('drop', fileDropped);
  }

  // Open canvas as img
  function clicked() {
    open().document.write('<img src="'+$canvas[0].toDataURL()+'"/>');
  }

  function init() {
    // Create the canvas
    $canvas = $('<canvas />');
    $canvas.click(clicked);
    $container = $(container);
    $container.append($canvas);
    ctx = $canvas[0].getContext('2d');

    // Allow dropping files
    initFileDrop($('html'));

    // Controls
    addDatGui();

    // On resize: reload(). Now: reload()
    $(window).resize(reload).resize();
  }

  // Leggo!
  $(init);
}(jQuery, '#photo'));
