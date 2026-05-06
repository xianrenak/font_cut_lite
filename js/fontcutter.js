/* The bitmap being loaded */

var fontcutterApp = angular.module('fontcutterApp', []);
var image = new Image();
var fileName = "";
var storageKey = "fontcutter-edit-state";
var imagePath = "";
var kerningConfig = getDefaultKerningConfig();

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
  $scope.previewText = getDefaultPreviewText();
  $scope.textPreviewVisible = true;
  $scope.selectedGlyph = null;

  loadSavedState($scope);

  $scope.onGlyphTextChange = function() {
    $scope.lineData = glyphTextToLineData($scope.glyphText, $scope.lineData);
    $scope.lineNumber = $scope.lineData.length;
    clearInvalidSelection($scope);
    canvasManager.refresh();
    saveState($scope);
  }

  $scope.onPreviewTextChange = function() {
    renderTextPreview($scope);
    saveState($scope);
  }

  $scope.toggleTextPreview = function() {
    $scope.textPreviewVisible = !$scope.textPreviewVisible;
    if ($scope.textPreviewVisible) {
      setTimeout(function() {
        renderTextPreview($scope);
      }, 0);
    }
    saveState($scope);
  }

  $scope.selectGlyph = function(lineIndex, charIndex) {
    var metric = getGlyphMetric($scope, lineIndex, charIndex);
    var glyphs = getLineGlyphs($scope.lineData[lineIndex]);
    $scope.selectedGlyph = {
      lineIndex: lineIndex,
      charIndex: charIndex,
      character: glyphs[charIndex],
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

function loadKerningConfig() {
  $.getJSON("config/kerning.json")
    .done(function(config) {
      kerningConfig = normalizeKerningConfig(config);
      generateOutput();
      renderTextPreview(angular.element($("#body")).scope());
    })
    .fail(function() {
      kerningConfig = getDefaultKerningConfig();
    });
}

function normalizeKerningConfig(config) {
  var defaults = getDefaultKerningConfig();
  config = config || {};
  config.levels = config.levels || {};
  config.pairs = config.pairs || {};

  return {
    levels: {
      strong: parseFloat(config.levels.strong) || defaults.levels.strong,
      medium: parseFloat(config.levels.medium) || defaults.levels.medium,
      light: parseFloat(config.levels.light) || defaults.levels.light
    },
    pairs: {
      strong: config.pairs.strong || defaults.pairs.strong,
      medium: config.pairs.medium || defaults.pairs.medium,
      light: config.pairs.light || defaults.pairs.light
    }
  };
}

function getDefaultKerningConfig() {
  return {
    levels: {
      strong: 0.14,
      medium: 0.10,
      light: 0.06
    },
    pairs: {
      strong: ["AV", "AW", "AY", "VA", "YA"],
      medium: ["Ta", "Te", "To", "Tu", "Ty", "Ya", "Ye", "Yo", "Yu", "Va", "Ve", "Vo", "WA"],
      light: ["AT", "TA", "Wa", "We", "Wo", "FA", "Fa", "Fe", "Fo", "LT", "LV", "LW", "LY", "PA"]
    }
  };
}

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

    if (state.previewText !== undefined) {
      $scope.previewText = state.previewText;
    }

    if (state.textPreviewVisible !== undefined) {
      $scope.textPreviewVisible = state.textPreviewVisible;
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
    previewText: $scope.previewText,
    textPreviewVisible: $scope.textPreviewVisible,
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

function getDefaultPreviewText() {
  return [
    "ABCDEFGHIJKLM",
    "NOPQRSTUVWXYZ",
    "abcdefghijklm",
    "nopqrstuvwxyz",
    "0123456789",
    "!@#$%^&*()?",
    "+-=_|/\\<>~",
    "[]{};::'\"`,.",
    "------------",
    "AV AW AY AT TA Ta Te",
    "To Tu Ty VA Va Ve Vo",
    "WA Wa We Wo YA Ya",
    "Ye Yo Yu FA Fa Fe Fo",
    "LA LT LV LW LY PA",
    "------------",
    "The quick brown fox",
    "jumps over the lazy dog",
    "------------",
    "⚔️🗡️🏹🛡️🪄🎯💥💀▲▼◀▶↑↓←→",
    "🔥⚡❄️💧🌿☀️🌙⭐⏰🎵⏻👍👎🔧⚙️🔔",
    "💎🪙📦⛏️🧪❤️🩹💔🏠🚪👤💾🗑️💬🔍📞",
    "🔒🔓🔑❗❓🕹️🏆👑🔊🔇✔️❌↩️↪️🔄🚫",
    "⚓🚢🚗✈️🚀🏃🧭🗺️⏸️▶️⏹️⏩⏪👻👽🦖",
    "🍎🍞🍖☕🍺💊"
  ].join("\n");
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
  if (!line || $scope.selectedGlyph.charIndex >= getLineGlyphs(line).length) {
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

  image.src = appendCacheBuster(imageUrl);
  imagePath = imageUrl;
  fileName = {name: imageUrl.split('/').pop()};
};

function appendCacheBuster(url) {
  var separator = url.indexOf("?") === -1 ? "?" : "&";
  return url + separator + "_=" + new Date().getTime();
}

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
    glyphsNumber = getLineGlyphs(lineData).length;

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
  renderTextPreview($scope);

  var table = $('#previewTable');
  table.empty();
  var content = "";
  for (var i = 0; i < $scope.lineData.length; i++) {
    content += "<tr>";
    var lineDataEntry = $scope.lineData[i];
    var glyphs = getLineGlyphs(lineDataEntry);
    for (var j = 0; j < glyphs.length; j++) {
      var canvasId = "canvas_"+i+"_"+j;
      var selectedClass = isSelectedGlyph($scope, i, j) ? " selected-glyph" : "";
      content += "<td class='preview-cell"+selectedClass+"' data-line='"+i+"' data-char='"+j+"'><div>"+getGlyphLabel(glyphs[j])+"</div><canvas class='preview-canvas' id='"+canvasId+"'></canvas>";
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
  $('#xadvance-preview').on('click mousedown mouseup input change', function(e) {
    e.stopPropagation();
  });
  $('#xadvance-preview').on('input change', function(e) {
    e.stopPropagation();
    var value = parseMetricValue($(this).val(), $scope.charWidth);
    updateSelectedGlyphMetric($scope, value);
  });

  for (var i = 0; i < $scope.lineData.length; i++) {
    var lineDataEntry = $scope.lineData[i];
    var glyphs = getLineGlyphs(lineDataEntry);
    for (var j = 0; j < glyphs.length; j++) {
      var canvasId = "canvas_"+i+"_"+j;
      var canvas = document.getElementById(canvasId);
      drawPreviewGlyph(canvas, $scope, i, j);
    }
  }
}

function updateSelectedGlyphMetric($scope, xadvance) {
  if (!$scope.selectedGlyph) {
    return;
  }

  $scope.selectedGlyph.xadvance = xadvance;
  setGlyphMetric($scope, $scope.selectedGlyph.lineIndex, $scope.selectedGlyph.charIndex, {
    xadvance: xadvance
  });

  $('#xadvance-preview').siblings('label').text("X Advance: " + xadvance);

  var canvas = document.getElementById("canvas_"+$scope.selectedGlyph.lineIndex+"_"+$scope.selectedGlyph.charIndex);
  if (canvas) {
    drawPreviewGlyph(canvas, $scope, $scope.selectedGlyph.lineIndex, $scope.selectedGlyph.charIndex);
  }

  renderTextPreview($scope);
  generateOutput();
  saveState($scope);
}

function drawPreviewGlyph(canvas, $scope, lineIndex, charIndex) {
  var ctx = canvas.getContext('2d');
  var metric = getGlyphMetric($scope, lineIndex, charIndex);
  var xoffset = metric.xoffset;
  var xadvance = metric.xadvance;
  var advanceStart = -xoffset;
  var advanceEnd = -xoffset + xadvance;
  var minX = Math.min(0, advanceStart, advanceEnd);
  var maxX = Math.max($scope.charWidth, advanceStart, advanceEnd, 1);
  var originX = -minX + 1;
  canvas.width = maxX - minX + 2;
  canvas.height = $scope.charHeight + 2;
  setPreviewCanvasDisplaySize(canvas, $scope);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  var sx = charIndex*$scope.charWidth;
  var sy = lineIndex*$scope.charHeight;

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

function renderTextPreview($scope) {
  var canvas = document.getElementById("textPreviewCanvas");
  if (!canvas || !image.width) {
    return;
  }

  var glyphMap = buildGlyphMap($scope);
  var lines = splitPreviewLines($scope.previewText || "");
  var scale = 48 / $scope.charWidth;
  var padding = 14;
  var lineHeight = Math.ceil($scope.charHeight * scale);
  var width = 1;
  var kernings = buildKerningMap(generateAutoKernings($scope));

  for (var lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    width = Math.max(width, measurePreviewLine(lines[lineIndex], glyphMap, kernings, $scope, scale));
  }

  canvas.width = Math.max(1, Math.ceil(width + padding * 2));
  canvas.height = Math.max(1, Math.ceil(lines.length * lineHeight + padding * 2));

  var ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#1b2026";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (var i = 0; i < lines.length; i++) {
    drawPreviewTextLine(ctx, lines[i], glyphMap, kernings, $scope, scale, padding, padding + i * lineHeight);
  }
}

function splitPreviewLines(text) {
  return String(text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
}

function measurePreviewLine(text, glyphMap, kernings, $scope, scale) {
  var glyphs = splitGlyphText(text);
  var width = 0;
  var previousGlyph = null;

  for (var i = 0; i < glyphs.length; i++) {
    var glyphInfo = glyphMap[getGlyphKey(glyphs[i])];
    if (!glyphInfo) {
      width += getMissingGlyphAdvance($scope, scale);
      previousGlyph = null;
      continue;
    }

    width += getKerningAmount(kernings, previousGlyph, glyphs[i]) * scale;
    width += glyphInfo.metric.xadvance * scale;
    previousGlyph = glyphs[i];
  }

  return width;
}

function drawPreviewTextLine(ctx, text, glyphMap, kernings, $scope, scale, x, y) {
  var glyphs = splitGlyphText(text);
  var penX = x;
  var previousGlyph = null;

  for (var i = 0; i < glyphs.length; i++) {
    var currentGlyph = glyphs[i];
    var info = glyphMap[getGlyphKey(currentGlyph)];
    if (!info) {
      penX += getMissingGlyphAdvance($scope, scale);
      previousGlyph = null;
      continue;
    }

    penX += getKerningAmount(kernings, previousGlyph, currentGlyph) * scale;
    ctx.drawImage(
      image,
      info.charIndex * $scope.charWidth,
      info.lineIndex * $scope.charHeight,
      $scope.charWidth,
      $scope.charHeight,
      Math.round(penX + info.metric.xoffset * scale),
      y,
      Math.round($scope.charWidth * scale),
      Math.round($scope.charHeight * scale)
    );
    penX += info.metric.xadvance * scale;
    previousGlyph = currentGlyph;
  }
}

function getMissingGlyphAdvance($scope, scale) {
  return Math.round($scope.charWidth * 0.5 * scale);
}

function buildGlyphMap($scope) {
  var result = {};
  for (var line = 0; line < $scope.lineData.length; line++) {
    var glyphs = getLineGlyphs($scope.lineData[line]);
    for (var i = 0; i < glyphs.length; i++) {
      var key = getGlyphKey(glyphs[i]);
      if (!result[key]) {
        result[key] = {
          lineIndex: line,
          charIndex: i,
          metric: getGlyphMetric($scope, line, i)
        };
      }
    }
  }

  return result;
}

function splitGlyphText(text) {
  return getLineGlyphs({glyphs: text});
}

function getGlyphKey(glyph) {
  return glyph.codePointAt(0);
}

function buildKerningMap(kernings) {
  var result = {};
  for (var i = 0; i < kernings.length; i++) {
    result[kernings[i].first + ":" + kernings[i].second] = kernings[i].amount;
  }

  return result;
}

function getKerningAmount(kernings, firstGlyph, secondGlyph) {
  if (!firstGlyph || !secondGlyph) {
    return 0;
  }

  return kernings[getGlyphKey(firstGlyph) + ":" + getGlyphKey(secondGlyph)] || 0;
}

function parseMetricValue(value, fallback) {
  var parsed = parseInt(value, 10);
  return isNaN(parsed) ? fallback : parsed;
}

function getLineGlyphs(lineData) {
  var text = lineData.glyphs || "";
  if (window.Intl && Intl.Segmenter) {
    var segmenter = new Intl.Segmenter(undefined, {granularity: "grapheme"});
    var glyphs = [];
    var segments = segmenter.segment(text);
    for (var segment of segments) {
      glyphs.push(segment.segment);
    }
    return glyphs;
  }

  return splitGraphemesFallback(text);
}

function splitGraphemesFallback(text) {
  var codePoints = Array.from(text);
  var glyphs = [];

  for (var i = 0; i < codePoints.length; i++) {
    var glyph = codePoints[i];

    while (i + 1 < codePoints.length && isCombiningEmojiPart(codePoints[i + 1])) {
      glyph += codePoints[i + 1];
      i++;

      if (codePoints[i] === "\u200d" && i + 1 < codePoints.length) {
        glyph += codePoints[i + 1];
        i++;
      }
    }

    glyphs.push(glyph);
  }

  return glyphs;
}

function isCombiningEmojiPart(character) {
  var codePoint = character.codePointAt(0);
  return codePoint === 0xfe0e ||
    codePoint === 0xfe0f ||
    codePoint === 0x200d ||
    (codePoint >= 0x1f3fb && codePoint <= 0x1f3ff) ||
    (codePoint >= 0xe0100 && codePoint <= 0xe01ef);
}

function getXAdvanceSliderMax($scope) {
  return $scope.charWidth;
}

function setPreviewCanvasDisplaySize(canvas, $scope) {
  var scale = 96 / $scope.charWidth;
  canvas.style.width = Math.round(canvas.width * scale) + "px";
  canvas.style.height = Math.round(canvas.height * scale) + "px";
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
    count += getLineGlyphs($scope.lineData[i]).length;
  };

  output += '<font>'+EOL;
  output += TAB + '<info face="'+fileName.name+'" size="'+$scope.charWidth+'" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="1" aa="1" padding="'+padding+'" spacing="1,1" outline="0" />'+EOL;
  output += TAB + '<common lineHeight="'+$scope.charHeight+'" base="'+$scope.charHeight+'" scaleW="'+image.width+'" scaleH="'+image.height+'" pages="1" packed="0" alphaChnl="1" redChnl="0" greenChnl="0" blueChnl="0" />'+EOL;
  output += TAB + '<pages>'+EOL;
  output += TAB + TAB + '<page id="0" file="'+fileName.name+'" />'+EOL;
  output += TAB + '</pages>'+EOL;
  output += TAB + '<chars count="'+count+'">'+EOL;

  for(var line=0; line < $scope.lineData.length; line++) {
    var glyphs = getLineGlyphs($scope.lineData[line]);
    for (var i = 0; i < glyphs.length; i++) {
      var character = glyphs[i];
      var width = $scope.charWidth;
      var height = $scope.charHeight;
      var x = i*width;
      var y = line*height;
      var metric = getGlyphMetric($scope, line, i);
      output += TAB + TAB + '<char id="'+character.codePointAt(0)+'"   x="'+x+'"    y="'+y+'"     width="'+width+'"    height="'+height+'" xoffset="'+metric.xoffset+'"     yoffset="0"     xadvance="'+metric.xadvance+'"    page="0"  chnl="0" />'+EOL;
    }   
  }

  output += TAB + '</chars>'+EOL;
  var kernings = generateAutoKernings($scope);
  output += TAB + '<kernings count="'+kernings.length+'">'+EOL;
  for (var k = 0; k < kernings.length; k++) {
    output += TAB + TAB + '<kerning first="'+kernings[k].first+'" second="'+kernings[k].second+'" amount="'+kernings[k].amount+'" />'+EOL;
  }
  output += TAB + '</kernings>'+EOL;
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
    count += getLineGlyphs($scope.lineData[i]).length;
  };
    

  output += "info face=\""+fileName.name+"\" size="+$scope.charWidth+" bold=0 italic=0 charset=\"\" unicode=1 stretchH=100 smooth=1 aa=1 padding="+padding+" spacing=1,1 outline=0"+EOL;
  output += "common lineHeight="+$scope.charHeight+" base="+$scope.charHeight+" scaleW="+image.width+" scaleH="+image.height+" pages=1 packed=0 alphaChnl=1 redChnl=0 greenChnl=0 blueChnl=0"+EOL;
  output += "page id=0 file=\""+fileName.name+"\""+EOL;
  output += "chars count="+count+EOL;

  for(var line=0; line < $scope.lineData.length; line++) {
    var glyphs = getLineGlyphs($scope.lineData[line]);
    for (var i = 0; i < glyphs.length; i++) {
      var character = glyphs[i];
      var width = $scope.charWidth;
      var height = $scope.charHeight;
      var x = i*width;
      var y = line*height;
      var metric = getGlyphMetric($scope, line, i);
      output += "char id="+character.codePointAt(0)+"   x="+x+"    y="+y+"     width="+width+"    height="+height+" xoffset="+metric.xoffset+"     yoffset=0     xadvance="+metric.xadvance+"    page=0  chnl=0"+EOL;
    }   
  }

  var kernings = generateAutoKernings($scope);
  output += "kernings count="+kernings.length+EOL;
  for (var k = 0; k < kernings.length; k++) {
    output += "kerning first="+kernings[k].first+" second="+kernings[k].second+" amount="+kernings[k].amount+EOL;
  }

  $('#output').val(output);
}

function generateAutoKernings($scope) {
  var levels = getKerningLevels($scope);
  var pairs = [];

  addKerningPairs(pairs, getKerningPairRules().strong, levels.strong);
  addKerningPairs(pairs, getKerningPairRules().medium, levels.medium);
  addKerningPairs(pairs, getKerningPairRules().light, levels.light);

  return filterAvailableKerningPairs(pairs, getAvailableCharacterCodes($scope));
}

function getKerningLevels($scope) {
  var avgXAdvance = getAverageXAdvance($scope);
  return {
    strong: -Math.round(avgXAdvance * kerningConfig.levels.strong),
    medium: -Math.round(avgXAdvance * kerningConfig.levels.medium),
    light: -Math.round(avgXAdvance * kerningConfig.levels.light)
  };
}

function getAverageXAdvance($scope) {
  var total = 0;
  var count = 0;

  for (var line = 0; line < $scope.lineData.length; line++) {
    var glyphs = getLineGlyphs($scope.lineData[line]);
    for (var i = 0; i < glyphs.length; i++) {
      total += getGlyphMetric($scope, line, i).xadvance;
      count++;
    }
  }

  return count ? total / count : $scope.charWidth;
}

function getKerningPairRules() {
  return kerningConfig.pairs;
}

function addKerningPairs(pairs, pairRules, amount) {
  for (var i = 0; i < pairRules.length; i++) {
    pairs.push({
      first: pairRules[i].charCodeAt(0),
      second: pairRules[i].charCodeAt(1),
      amount: amount
    });
  }
}

function getAvailableCharacterCodes($scope) {
  var result = {};
  for (var line = 0; line < $scope.lineData.length; line++) {
    var glyphs = getLineGlyphs($scope.lineData[line]);
    for (var i = 0; i < glyphs.length; i++) {
      result[glyphs[i].codePointAt(0)] = true;
    }
  }

  return result;
}

function filterAvailableKerningPairs(pairs, availableCodes) {
  var result = [];
  var seen = {};

  for (var i = 0; i < pairs.length; i++) {
    var pair = pairs[i];
    var key = pair.first + ":" + pair.second;
    if (availableCodes[pair.first] && availableCodes[pair.second] && !seen[key]) {
      result.push(pair);
      seen[key] = true;
    }
  }

  return result;
}


var canvasManager = new CanvasManager();



$(document).ready(function() {
    loadKerningConfig();
    /*disable non active tabs*/
    $('.nav li').not('.active').addClass('disabled');
/*to actually disable clicking the bootstrap tab, as noticed in comments by user3067524*/
    $('.nav li').not('.active').find('a').removeAttr("data-toggle");    
});
