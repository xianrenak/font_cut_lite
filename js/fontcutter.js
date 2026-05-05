/* The bitmap being loaded */

var fontcutterApp = angular.module('fontcutterApp', []);
var image = new Image();
var fileName = "";
var storageKey = "fontcutter-edit-state";
var imagePath = "";

fontcutterApp.controller('fontcutterCtrl', function ($scope) { 
  $scope.outputXML = false;
  $scope.charWidth = 32;
  $scope.charHeight = 32;
  $scope.topPadding = 0;
  $scope.leftPadding = 0;
  $scope.bottomPadding = 0;
  $scope.rightPadding = 0;

  $scope.lineData = [
    {'line': 1, 'glyphs' : "ABCDEFGHIJKLMNOPQRSTUVWXYZ", 'metrics' : {} },
    {'line': 2, 'glyphs' : "abcdefghijklmnopqrstuvwxyz", 'metrics' : {} },
    {'line': 3, 'glyphs' : "0123456789", 'metrics' : {} },
  ];
  $scope.lineNumber = $scope.lineData.length;
  $scope.glyphText = lineDataToGlyphText($scope.lineData);
  $scope.selectedGlyph = null;

  loadSavedState($scope);

  $scope.onGlyphTextChange = function() {
    $scope.lineData = glyphTextToLineData($scope.glyphText, $scope.lineData);
    $scope.lineNumber = $scope.lineData.length;
    clearInvalidSelection($scope);
    canvasManager.refresh();
    saveState($scope);
  }

  $scope.selectGlyph = function(lineIndex, charIndex) {
    var metric = getGlyphMetric($scope, lineIndex, charIndex);
    $scope.selectedGlyph = {
      lineIndex: lineIndex,
      charIndex: charIndex,
      character: $scope.lineData[lineIndex].glyphs[charIndex],
      xadvance: metric.xadvance
    };
    generatePreview();
  }

  $scope.onSelectedMetricChange = function() {
    if (!$scope.selectedGlyph) {
      return;
    }

    setGlyphMetric($scope, $scope.selectedGlyph.lineIndex, $scope.selectedGlyph.charIndex, {
      xadvance: parseMetricValue($scope.selectedGlyph.xadvance, $scope.charWidth)
    });

    generatePreview();
    generateOutput();
  }

  var properties = ["outputXML", "charWidth", "charHeight", "topPadding", "bottomPadding", "leftPadding", "rightPadding"];
  for (var i = properties.length - 1; i >= 0; i--) {
    $scope.$watch(properties[i], function() {
      canvasManager.refresh();
      saveState($scope);
    });
  }

  // watch deep change in array
  $scope.$watch(
    function() { 
      var result;
      for (var i = 0; i < $scope.lineData.length; i++) {
        result += $scope.lineData[i].glyphs + JSON.stringify($scope.lineData[i].metrics || {});
      }
      return result;    
    }, 
    function() {
      canvasManager.refresh();
      saveState($scope);
    });
   
});

function loadSavedState($scope) {
  if (getQueryParameter("reset") === "1") {
    localStorage.removeItem(storageKey);
    return;
  }

  var savedState = localStorage.getItem(storageKey);
  if (!savedState) {
    return;
  }

  try {
    var state = JSON.parse(savedState);
    var properties = ["outputXML", "lineNumber", "charWidth", "charHeight", "topPadding", "bottomPadding", "leftPadding", "rightPadding"];
    for (var i = 0; i < properties.length; i++) {
      if (state[properties[i]] !== undefined) {
        $scope[properties[i]] = state[properties[i]];
      }
    }

    if (state.lineData && state.lineData.length) {
      $scope.lineData = state.lineData;
      for (var j = 0; j < $scope.lineData.length; j++) {
        if (!$scope.lineData[j].metrics) {
          $scope.lineData[j].metrics = {};
        }
      }
      $scope.lineNumber = $scope.lineData.length;
      $scope.glyphText = state.glyphText || lineDataToGlyphText($scope.lineData);
    }

    if (state.fileName) {
      fileName = {name: state.fileName};
      imagePath = state.imagePath || "";
    }
  } catch (e) {
    localStorage.removeItem(storageKey);
  }
}

function saveState($scope) {
  var state = {
    outputXML: $scope.outputXML,
    lineNumber: $scope.lineNumber,
    charWidth: $scope.charWidth,
    charHeight: $scope.charHeight,
    topPadding: $scope.topPadding,
    bottomPadding: $scope.bottomPadding,
    leftPadding: $scope.leftPadding,
    rightPadding: $scope.rightPadding,
    glyphText: $scope.glyphText,
    lineData: $scope.lineData,
    fileName: fileName ? fileName.name : "",
    imagePath: imagePath
  };

  localStorage.setItem(storageKey, JSON.stringify(state));
}

function lineDataToGlyphText(lineData) {
  var lines = [];
  for (var i = 0; i < lineData.length; i++) {
    lines.push(lineData[i].glyphs);
  }

  return lines.join("\n");
}

function glyphTextToLineData(glyphText, oldLineData) {
  var lines = String(glyphText || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  var lineData = [];

  for (var i = 0; i < lines.length; i++) {
    var oldLine = oldLineData[i] || {};
    lineData.push({
      'line': i + 1,
      'glyphs': lines[i],
      'metrics': oldLine.metrics || {}
    });
  }

  return lineData;
}

function clearInvalidSelection($scope) {
  if (!$scope.selectedGlyph) {
    return;
  }

  var line = $scope.lineData[$scope.selectedGlyph.lineIndex];
  if (!line || $scope.selectedGlyph.charIndex >= line.glyphs.length) {
    $scope.selectedGlyph = null;
  }
}

function getQueryParameter(name) {
  var query = window.location.search.substring(1).split("&");
  for (var i = 0; i < query.length; i++) {
    var pair = query[i].split("=");
    if (decodeURIComponent(pair[0]) === name) {
      return decodeURIComponent(pair[1] || "");
    }
  }

  return "";
}

function CanvasManager() {
  this.canvasId = 'imageCanvas';
  this.canvasContainerId = 'canvas-container',
	this.canvas = document.getElementById(this.canvasId);
	this.ctx = this.canvas.getContext('2d');
  this.canvasContainer = document.getElementById(this.canvasContainerId);
    
	var imageLoader = document.getElementById('imageLoader');
	imageLoader.addEventListener('change', this.handleImage.bind(this), false);	

  this.loadImageFromUrl();
}

CanvasManager.prototype.loadImageFromUrl = function() {
  var imageUrl = getQueryParameter("image");
  if (!imageUrl) {
    return;
  }

  var me = this;
  image.onload = function() {
    $('#jumbotron').hide();
    $('#canvas-container').show();
    me.canvas.width = image.width;
    me.canvas.height = image.height;
    me.refreshCanvas();

    $('.nav li.disabled').find("a").attr("data-toggle", "tab");
    $('.nav li.disabled').removeClass('disabled');
  };

  image.src = imageUrl;
  imagePath = imageUrl;
  fileName = {name: imageUrl.split('/').pop()};
};

CanvasManager.prototype.refresh = function() {
  if (fileName != "") {    
    this.refreshCanvas();
    generatePreview();
    generateOutput();
  }
}

CanvasManager.prototype.handleImage = function(e) {
        var reader = new FileReader();
        var canvasContainerId = this.canvasContainerId;
        var me = this;

        reader.onload = function(event) {
            image.onload = function() {
                $('#jumbotron').hide();
                $('#canvas-container').show();
                me.canvas.width = image.width;
                me.canvas.height = image.height;
                me.refreshCanvas();

                $('.nav li.disabled').find("a").attr("data-toggle", "tab");
                $('.nav li.disabled').removeClass('disabled');

            };

            image.src = event.target.result;
            imagePath = $('#imageLoader').val();
            saveState(angular.element($("#body")).scope());
        };

        fileName = e.target.files[0];
        reader.readAsDataURL(fileName);
        $('#canvas-container').show();
    };


CanvasManager.prototype.refreshCanvas = function() {
  var angularScope = angular.element($("#body")).scope();

  this.ctx.beginPath();
  this.ctx.clearRect (0, 0, image.width, image.height);
  this.ctx.drawImage(image, 0, 0);
    
  var i = 0;
  var origX = 0;
  var origY = 0;
  var glyphsNumber = 0;
  for (i = 0; i < angularScope.lineData.length; i++) {
    var lineData = angularScope.lineData[i];
    origX = 0;    
    origY = i * angularScope.charHeight;
    glyphsNumber = lineData.glyphs.length;

    this.line(origX, origY, glyphsNumber * angularScope.charWidth, origY, "#aaa");

    for (var j = 0; j < glyphsNumber + 1; j++) {    
      this.line(origX + j * angularScope.charWidth, origY, origX + j * angularScope.charWidth, origY + angularScope.charHeight, "#aaa");
    };
  };
  
  origY = (i+1) * angularScope.charHeight;  
  this.line(0, origY, glyphsNumber * angularScope.charWidth, origY, "#aaa");

};

CanvasManager.prototype.line = function(sx, sy, ex, ey, style) {
    this.ctx.beginPath();
    this.ctx.strokeStyle = style;
    this.ctx.moveTo(sx + 0.5, sy + 0.5);
    this.ctx.lineTo(ex + 0.5, ey + 0.5);
    this.ctx.stroke();
}

function generatePreview() {
  var $scope = angular.element($("#body")).scope();
  
  var canvasArray = [];

  var table = $('#previewTable');
  table.empty();
  var content = "";
  for (var i = 0; i < $scope.lineData.length; i++) {
    content += "<tr>";
    var lineDataEntry = $scope.lineData[i];
    for (var j = 0; j < lineDataEntry.glyphs.length; j++) {
      var canvasId = "canvas_"+i+"_"+j;
      var selectedClass = isSelectedGlyph($scope, i, j) ? " selected-glyph" : "";
      content += "<td class='preview-cell"+selectedClass+"' data-line='"+i+"' data-char='"+j+"'><div>"+getGlyphLabel(lineDataEntry.glyphs[j])+"</div><canvas class='preview-canvas' id='"+canvasId+"'></canvas>";
      if (isSelectedGlyph($scope, i, j)) {
        content += "<div class='metric-control-cell'><label for='xadvance-preview'>X Advance: "+$scope.selectedGlyph.xadvance+"</label><input id='xadvance-preview' class='form-control preview-slider' type='range' min='0' max='"+getXAdvanceSliderMax($scope)+"' step='1' value='"+$scope.selectedGlyph.xadvance+"' /></div>";
      }
      content += "</td>";
    }
    content += "</tr>";
  }

  table.append(content);
  $('.preview-cell').on('click', function() {
    var lineIndex = parseInt($(this).attr('data-line'), 10);
    var charIndex = parseInt($(this).attr('data-char'), 10);
    $scope.$apply(function() {
      $scope.selectGlyph(lineIndex, charIndex);
    });
  });
  $('#xadvance-preview').on('click mousedown mouseup', function(e) {
    e.stopPropagation();
  });
  $('#xadvance-preview').on('change', function(e) {
    e.stopPropagation();
    var value = parseMetricValue($(this).val(), $scope.charWidth);
    $scope.$apply(function() {
      $scope.selectedGlyph.xadvance = value;
      $scope.onSelectedMetricChange();
    });
  });

  for (var i = 0; i < $scope.lineData.length; i++) {
    var lineDataEntry = $scope.lineData[i];
    for (var j = 0; j < lineDataEntry.glyphs.length; j++) {
      var canvasId = "canvas_"+i+"_"+j;
      var canvas = document.getElementById(canvasId);
      var ctx = canvas.getContext('2d');
      var metric = getGlyphMetric($scope, i, j);
      var xoffset = metric.xoffset;
      var xadvance = metric.xadvance;
      var advanceStart = -xoffset;
      var advanceEnd = -xoffset + xadvance;
      var minX = Math.min(0, advanceStart, advanceEnd);
      var maxX = Math.max($scope.charWidth, advanceStart, advanceEnd, 1);
      var originX = -minX + 1;
      canvas.width = maxX - minX + 2;
      canvas.height = $scope.charHeight + 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      //context.drawImage(image,sx,sy,swidth,sheight,x,y,width,height);
      var sx = j*$scope.charWidth;
      var sy = i*$scope.charHeight;

      ctx.drawImage(image,sx,sy,$scope.charWidth,$scope.charHeight,originX,1,$scope.charWidth,$scope.charHeight);
      ctx.strokeStyle = "#428bca";
      ctx.strokeRect(originX + 0.5, 1.5, $scope.charWidth, $scope.charHeight);
      ctx.beginPath();
      ctx.strokeStyle = "#d9534f";
      ctx.moveTo(originX + advanceStart + 0.5, 0);
      ctx.lineTo(originX + advanceStart + 0.5, canvas.height);
      ctx.moveTo(originX + advanceEnd + 0.5, 0);
      ctx.lineTo(originX + advanceEnd + 0.5, canvas.height);
      ctx.stroke();
    }
  }
}

function parseMetricValue(value, fallback) {
  var parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function getXAdvanceSliderMax($scope) {
  return $scope.charWidth;
}

function getGlyphLabel(character) {
  if (character === " ") {
    return "<span class='space-glyph-label'>Space</span>";
  }

  return escapeHtml(character);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getGlyphMetric($scope, lineIndex, charIndex) {
  var line = $scope.lineData[lineIndex];
  if (!line.metrics) {
    line.metrics = {};
  }

  var metric = line.metrics[charIndex] || {};
  var xadvance = parseMetricValue(metric.xadvance, $scope.charWidth);
  return {
    xoffset: Math.round((xadvance - $scope.charWidth) / 2),
    xadvance: xadvance
  };
}

function setGlyphMetric($scope, lineIndex, charIndex, metric) {
  var line = $scope.lineData[lineIndex];
  if (!line.metrics) {
    line.metrics = {};
  }

  var xadvance = parseMetricValue(metric.xadvance, $scope.charWidth);
  line.metrics[charIndex] = {
    xoffset: Math.round((xadvance - $scope.charWidth) / 2),
    xadvance: xadvance
  };
}

function isSelectedGlyph($scope, lineIndex, charIndex) {
  return $scope.selectedGlyph &&
    $scope.selectedGlyph.lineIndex === lineIndex &&
    $scope.selectedGlyph.charIndex === charIndex;
}

function  generateOutput() {
  var scope = angular.element($("#body")).scope();
  if (scope.outputXML) {
    generateXMLOutput(scope);
  } else {
    generateFNTOutput(scope);
  }
}

function generateXMLOutput($scope) {
  var EOL = "\n";
  var TAB = "\t";
  var output = '<?xml version="1.0"?>'+EOL;

  //padding for each character (up, right, down, left).
  var padding = [$scope.topPadding, $scope.rightPadding, $scope.bottomPadding, $scope.leftPadding].join();

  var count = 0;
  for (var i = 0; i <  $scope.lineData.length; i++) {
    count += $scope.lineData[i].glyphs.length;
  };

  output += '<font>'+EOL;
  output += TAB + '<info face="'+fileName.name+'" size="'+$scope.charWidth+'" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="1" aa="1" padding="'+padding+'" spacing="1,1" outline="0" />'+EOL;
  output += TAB + '<common lineHeight="'+$scope.charHeight+'" base="'+$scope.charHeight+'" scaleW="'+image.width+'" scaleH="'+image.height+'" pages="1" packed="0" alphaChnl="1" redChnl="0" greenChnl="0" blueChnl="0" />'+EOL;
  output += TAB + '<pages>'+EOL;
  output += TAB + TAB + '<page id="0" file="'+fileName.name+'" />'+EOL;
  output += TAB + '</pages>'+EOL;
  output += TAB + '<chars count="'+count+'">'+EOL;

  for(var line=0; line < $scope.lineData.length; line++) {
    for (var i = 0; i < $scope.lineData[line].glyphs.length; i++) {
      var character = $scope.lineData[line].glyphs[i];      
      var width = $scope.charWidth;
      var height = $scope.charHeight;
      var x = i*width;
      var y = line*height;
      var metric = getGlyphMetric($scope, line, i);
      output += TAB + TAB + '<char id="'+character.charCodeAt(0)+'"   x="'+x+'"    y="'+y+'"     width="'+width+'"    height="'+height+'" xoffset="'+metric.xoffset+'"     yoffset="0"     xadvance="'+metric.xadvance+'"    page="0"  chnl="0" />'+EOL;
    }   
  }

  output += TAB + '</chars>'+EOL;
  output += '</font>';

  $('#output').val(output);
}

function generateFNTOutput($scope) {
  var output = "";
  var EOL = "\n";

  //padding for each character (up, right, down, left).
  var padding = [$scope.topPadding, $scope.rightPadding, $scope.bottomPadding, $scope.leftPadding].join();

  var count = 0;
  for (var i = 0; i <  $scope.lineData.length; i++) {
    count += $scope.lineData[i].glyphs.length;
  };
    

  output += "info face=\""+fileName.name+"\" size="+$scope.charWidth+" bold=0 italic=0 charset=\"\" unicode=1 stretchH=100 smooth=1 aa=1 padding="+padding+" spacing=1,1 outline=0"+EOL;
  output += "common lineHeight="+$scope.charHeight+" base="+$scope.charHeight+" scaleW="+image.width+" scaleH="+image.height+" pages=1 packed=0 alphaChnl=1 redChnl=0 greenChnl=0 blueChnl=0"+EOL;
  output += "page id=0 file=\""+fileName.name+"\""+EOL;
  output += "chars count="+count+EOL;

  for(var line=0; line < $scope.lineData.length; line++) {
    for (var i = 0; i < $scope.lineData[line].glyphs.length; i++) {
      var character = $scope.lineData[line].glyphs[i];      
      var width = $scope.charWidth;
      var height = $scope.charHeight;
      var x = i*width;
      var y = line*height;
      var metric = getGlyphMetric($scope, line, i);
      output += "char id="+character.charCodeAt(0)+"   x="+x+"    y="+y+"     width="+width+"    height="+height+" xoffset="+metric.xoffset+"     yoffset=0     xadvance="+metric.xadvance+"    page=0  chnl=0"+EOL;
    }   
  }

  $('#output').val(output);
}


var canvasManager = new CanvasManager();



$(document).ready(function() {
    /*disable non active tabs*/
    $('.nav li').not('.active').addClass('disabled');
/*to actually disable clicking the bootstrap tab, as noticed in comments by user3067524*/
    $('.nav li').not('.active').find('a').removeAttr("data-toggle");    
});
