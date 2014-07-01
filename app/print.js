window.Print = function(templates, cwd, style) {

var map;
var tiles;
var grids;
var gridc;
var boundingBox;
var mtime = (+new Date).toString(36);
var limit = 20000;
var sm = new SphericalMercator();


var Printer = Backbone.View.extend({});
var Modal = new views.Modal({
  el: $('.modal-content'),
  templates: templates
});

var Style = Backbone.Model.extend({});
Style.prototype.url = function() { return '/style.json?id=' + this.get('id'); };

var Source = Backbone.Model.extend({});
Source.prototype.url = function() { return '/source.json?id=' + this.get('id'); };

Printer.prototype.events = {
  'click .js-browsestyle': 'browseStyle',
  'click .js-recache': 'recache',
  'click #history .js-ref-delete': 'delstyle',
  'click .js-modalsources': 'modalsources',
  'keydown': 'keys',
  'click .js-info': 'toggleInfo',
  'click .recenter': 'bboxRecenter',
  'change #resolution': 'calculateTotal',
  'change #format': 'updateformat',
  'change #bboxInput': 'modifyCoordinates',
  'change .dim': 'modifyDimensions',
  'change #centerInput': 'modifyCoordinates',
  'change #lock': 'lockDimensions'
};

Printer.prototype.keys = function(ev) {
  // Escape. Collapses windows, dialogs, modals, etc.
  if (ev.which === 27) {
    if (Modal.active) Modal.close();
    window.location.href = '#';
  }
  if ((!ev.ctrlKey && !ev.metaKey) || ev.shiftKey) return;
  var which = ev.which;
  switch (true) {
  case (which === 72): // h for help
    ev.preventDefault();
    this.togglePane('docs');
    break;
  case (which === 190): // . for fullscreen
    ev.preventDefault();
    this.togglePane('full');
    break;
  case (which === 220): // \ for settings
    ev.preventDefault();
    this.togglePane('settings');
    break;
  case (which === 66): // b for bookmarks
    ev.preventDefault();
    this.togglePane('bookmark');
    break;
  default:
    return true;
  }
  return false;
};

Printer.prototype.browseStyle = function() {
  Modal.show('browseropen', {type:'style', cwd:cwd});
  new views.Browser({
    el: $('.modal-content #browsestyle'),
    filter: function(file) { return file.type === 'dir' || /\.tm2$/.test(file.basename); },
    isFile: function(file) { return /\.tm2$/.test(file); },
    callback: function(err, filepath) {
      if (err) return false; // @TODO
      filepath = filepath.replace(/\.tm2/, '') + '.tm2';
      window.location = '/style?id=tmstyle://' + filepath;
      return false;
    }
  });
  return false;
};
Printer.prototype.scrollto = function(ev) {
    id = $(ev.currentTarget).attr('href').split('#').pop();
    document.getElementById(id).scrollIntoView();
    return false;
};
Printer.prototype.togglePane = function(name) {
  var loc = location.href;
  if (loc.indexOf('#'+name) === -1) {
    location.href = loc.substring(0, loc.indexOf('#'))+'#'+name;
  } else {
    location.href = loc.replace('#'+name, '#');
  }
};
Printer.prototype.toggleInfo = function(ev) {
  var $el = $(ev.currentTarget);
  if ($el.is('.fill-darken2')) {
    $el.removeClass('fill-darken2 dark').addClass('quiet');
    $($el.attr('href')).addClass('hidden');
  } else {
    $el.addClass('fill-darken2 dark').removeClass('quiet');
    $($el.attr('href')).removeClass('hidden');
  }
  return false;
};

Printer.prototype.delstyle = delStyle;

Printer.prototype.modalsources = function(ev) {
  var style = this.model.attributes;
  $.ajax({
    url: '/history.json',
    success: function(history) {
      Modal.show('sources', {
        style: style,
        history: history
      });
    }
  });
  return false;
};

Printer.prototype.recache = function(ev) {
  this.model.set({_recache:true});
  this.save(ev);
  return false;
};

Printer.prototype.toggleInfo = function(ev) {
  var $el = $(ev.currentTarget);
  if ($el.is('.fill-darken2')) {
    $el.removeClass('fill-darken2 dark').addClass('quiet');
    $($el.attr('href')).addClass('hidden');
  } else {
    $el.addClass('fill-darken2 dark').removeClass('quiet');
    $($el.attr('href')).removeClass('hidden');
  }
  return false;
};

Printer.prototype.bboxEnable = function(ev) {
  if (!boundingBox._enabled) {
    this.calculateBounds();

    // Enable the location filter
    boundingBox.enable();
    boundingBox.fire('enableClick');

    $('#export').removeClass('disabled');
  }
};

Printer.prototype.bboxRecenter = function() {
  if (!boundingBox._enabled) return;
  var coordinates = window.exporter.model.get('coordinates');
  var center = map.getCenter(),
    zoom = map.getZoom(),
    scale = coordinates.scale;

  if (coordinates.locked) {
    center = sm.px([center.lng, center.lat], zoom);
    var w = coordinates.dimensions[0],
      h = coordinates.dimensions[1],
      bounds = this.calculateCornersPx(center, w/scale, h/scale);
  } else {
    var bounds = this.calculateCornersLl([center.lat, center.lng], coordinates.bbox);
  }
  boundingBox.setBounds(bounds);

};

Printer.prototype.calculateBounds = function() {
  // when bounding box is reset to current viewport,
  // calculate the new dimensions of the bbox to the
  // visible viewport, not actual (covered by settings pane)
  var sidebar = $('#full').width();
  var bounds = map.getBounds(),
    zoom = map.getZoom(),
    ne = sm.px([bounds._northEast.lng, bounds._northEast.lat], zoom),
    sw = sm.px([bounds._southWest.lng, bounds._southWest.lat], zoom),
    center = [(ne[0] - sw[0])/2 + sw[0], (ne[1] - sw[1])/2 + sw[1]];

  bounds = this.calculateCornersPx(center, sidebar, Math.abs(ne[1] - sw[1]));
  boundingBox.setBounds(bounds);
};

Printer.prototype.calculateCoordinates = function(ev) {
  // calculate bounding box dimensions and center point in lat,lng.
  // update model with new coordinates.
  var bounds = boundingBox.getBounds(),
    center = [(bounds._northEast.lat - bounds._southWest.lat)/2 + bounds._southWest.lat, (bounds._northEast.lng - bounds._southWest.lng)/2 + bounds._southWest.lng],
    decimals = 4,
    format = $('input[name=format]:checked').prop('value');

  var dimensions = window.exporter.model.get('coordinates') ?  window.exporter.model.get('coordinates').dimensions : [0, 0];
  var locked = window.exporter.model.get('coordinates') ?  window.exporter.model.get('coordinates').locked : false;

  window.exporter.model.set({
    coordinates: {
      scale: $('input[name=resolution]:checked').prop('value'),
      format: format,
      quality: (format === 'png') ? 256 : 100,
      bbox: [
        parseFloat(bounds._southWest.lng.toFixed(decimals)),
        parseFloat(bounds._southWest.lat.toFixed(decimals)),
        parseFloat(bounds._northEast.lng.toFixed(decimals)),
        parseFloat(bounds._northEast.lat.toFixed(decimals))
      ],
      center: [
        center[0].toFixed(decimals),
        center[1].toFixed(decimals)
      ],
      dimensions: dimensions,
      locked: locked
    }
  });
  var coordinates = window.exporter.model.get('coordinates');
  $('#bboxInput').prop('value', coordinates.bbox.toString());
  $('#centerInput').prop('value', coordinates.center[0]+','+coordinates.center[1]);

  this.calculateTotal();
};

Printer.prototype.calculateTotal = function(ev) {
  // Calculate bounding box dimensions in pixel and inch values and update field values.
  if (!boundingBox.isEnabled()) return;
  var scale = $('input[name=resolution]:checked').prop('value'),
    zoom = map.getZoom(),
    bbox = this.model.get('coordinates').bbox,
    center;
  sm.size = scale * 256;

  this.model.get('coordinates').scale = scale;

  var ne = sm.px([bbox[2], bbox[3]], zoom),
    sw = sm.px([bbox[0], bbox[1]], zoom),
    w = parseInt((ne[0] - sw[0]) * scale),
    h = parseInt((sw[1] - ne[1]) * scale),
    percentage = ( w > h ) ? Math.ceil((w / limit) * 100) : Math.ceil((h / limit) * 100);

  if (w > limit) {
    $('#pixelX').addClass('warning');
  } else {
    $('#pixelX').removeClass('warning');
  }
  if (h > limit) {
    $('#pixelY').addClass('warning');
  } else {
    $('#pixelY').removeClass('warning');
  }
  if (percentage > 100 ) $('#export').addClass('disabled').removeAttr('href');
  if (percentage <= 100 ) {
    $('#export').removeClass('disabled');
    this.updateurl();
  }

  // if the dimensions are locked, don't update dimension values.
  if (this.model.get('coordinates').locked) {
    if (ev && ev.target.name === 'resolution') {
      $('#pixelX').prop('value', w + ' px');
      $('#pixelY').prop('value', h + ' px');
      this.model.get('coordinates').dimensions = [w, h];
    }
    this.imageSizeStats();
    return;
  }

  this.model.get('coordinates').dimensions = [w, h];

  $('#pixelX').prop('value', w + ' px');
  $('#pixelY').prop('value', h + ' px');

  $('#inchX').prop('value', (w / (scale * 72)).toFixed(2) + ' in');
  $('#inchY').prop('value', (h / (scale * 72)).toFixed(2) + ' in');

  this.imageSizeStats();
};

Printer.prototype.modifyCoordinates = function(ev) {
  // if the coordinates in 'bounds' or 'center' are modified,
  // compare and recalculate bounding box values.
  var bounds = $('#bboxInput').prop('value').split(',').map(parseFloat),
    center = $('#centerInput').prop('value').split(',').map(parseFloat),
    bSum = bounds.reduce(function(a, b){ return a + b; }),
    bboxSum = window.exporter.model.get('coordinates').bbox.reduce(function(a, b){ return a + b; });

  if (bSum != bboxSum) {
    boundingBox.setBounds(L.latLngBounds(L.latLng(bounds[1], bounds[0]), L.latLng(bounds[3], bounds[2])));
    center = [ (bounds[3] - bounds[1])/2 + bounds[1], (bounds[2] - bounds[0])/2 + bounds[0]];
    map.setView(center, map.getZoom());
    return;
  }
  var cSum = center.reduce(function(a, b){ return a + b; });
  var centerSum = window.exporter.model.get('coordinates').center.reduce(function(a, b){ return a + b; });
  if (cSum != centerSum) {
    boundingBox.setBounds(this.calculateCornersLl(center, bounds));
    map.setView([center[0], center[1]], map.getZoom());
    return;
  }
};

Printer.prototype.modifyDimensions = function(ev) {
  // if pixel or inch dimensions are modified,
  // recalculate bounding box values in lat, lng for leaflet
  var pixelX = /\d+/.exec($('#pixelX').prop('value'))[0] | 0,
    pixelY = /\d+/.exec($('#pixelY').prop('value'))[0] | 0,
    inchX = parseFloat(/\d+\.?\d*/.exec($('#inchX').prop('value'))[0]).toFixed(2),
    inchY = parseFloat(/\d+\.?\d*/.exec($('#inchY').prop('value'))[0]).toFixed(2),
    bounds;

  var scale = window.exporter.model.get('coordinates').scale,
    zoom = map.getZoom(),
    dimensions = window.exporter.model.get('coordinates').dimensions,
    inchdim = [ (dimensions[0] / (scale * 72)).toFixed(2), (dimensions[1] / (scale * 72)).toFixed(2)];

  var center = $('#centerInput').prop('value').split(',').map(parseFloat);
  center = sm.px([center[1], center[0]], zoom);

  if (pixelX != dimensions[0] || pixelY != dimensions[1] || window.exporter.model.get('coordinates').locked) {
    bounds = this.calculateCornersPx(center, pixelX/scale, pixelY/scale);
  } else if (inchX != inchdim[0] || inchY != inchdim[1]) {
    bounds = this.calculateCornersPx(center, inchX * 72, inchY * 72);
  }

  boundingBox.setBounds(bounds);
};

Printer.prototype.calculateCornersPx = function(center, w, h) {
  // calculate the ne and sw corners from pixel values
  var zoom = map.getZoom(),
    ne = sm.ll([center[0] + w/2, center[1] - h/2], zoom),
    sw = sm.ll([center[0] - w/2, center[1] + h/2], zoom);

  return L.latLngBounds(L.latLng(ne[1], ne[0]), L.latLng(sw[1], sw[0]));
};

Printer.prototype.calculateCornersLl = function(center, bounds) {
  // calculate new ne and sw corners from new center and prev latlng values
  var w = bounds[0] - bounds[2],
    h = bounds[3] - bounds[1];

  bounds = [center[1] - (w/2), center[0] - (h/2), center[1] + (w/2), center[0] + (h/2)];
  return L.latLngBounds(L.latLng(bounds[1], bounds[0]), L.latLng(bounds[3], bounds[2]));
};

Printer.prototype.lockDimensions = function (){
  var markers = ['_eastMarker', '_southMarker', '_westMarker', '_northMarker', '_neMarker', '_seMarker', '_swMarker', '_nwMarker'];
  var locked = $('input[id=lock]:checked')[0] ? true : false;
  if (locked) {
    markers.forEach(function(marker){
      boundingBox[marker].dragging.disable();
      L.DomUtil.addClass(boundingBox[marker]._icon, 'locked');
    });
    $('.dim').prop('disabled', true);
    $('#bboxInput').prop('disabled', true);
    $('.reselect').prop('disabled', true);
    window.exporter.model.get('coordinates').locked = true;
    this.imageSizeStats();
  } else {
    markers.forEach(function(marker){
      boundingBox[marker].dragging.enable();
      L.DomUtil.removeClass(boundingBox[marker]._icon, 'locked');
    });
    $('.dim').prop('disabled', false);
    $('#bboxInput').prop('disabled', false);
    $('.reselect').prop('disabled', false);
    window.exporter.model.get('coordinates').locked = false;
    this.calculateTotal();
  }
};

Printer.prototype.updateformat = function() {
  var format = $('input[name=format]:checked').prop('value');

  if (!boundingBox.isEnabled()) return;
  window.exporter.model.get('coordinates').format = format;
  window.exporter.model.get('coordinates').quality = (format === 'png') ? 256 : 100;
  this.updateurl();
};

Printer.prototype.updateurl = function() {
  // update the link for 'download static map'
  if (!boundingBox.isEnabled()) return;
  var coordinates = window.exporter.model.get('coordinates');
  var url = 'http://localhost:3000/static/' +
    map.getZoom() + '/' +
    coordinates.bbox.toString() +
    '@' + coordinates.scale + 'x' +
    '.' + coordinates.format +
    '?id='+window.exporter.model.get('id');

  $('#export').attr('href', url);
};

Printer.prototype.imageSizeStats = function() {
  /*
  Add percentage of image size limit based on
  current dimensions to chart in bottom corner of map.
  */
  var html = "<a href='#' class='inline pad1 quiet pin-bottomright icon close'></a>";

  var minZoom = window.exporter.model.get('minzoom'),
    maxZoom = window.exporter.model.get('maxzoom'),
    dimensions = window.exporter.model.get('coordinates').dimensions,
    w = dimensions[0],
    h = dimensions[1],
    zoom = map.getZoom(),
    perc;

  for (var z = 0; z < 23; z++) {
    if (z >= minZoom && z <= maxZoom && boundingBox.isEnabled()) {
      var zoomDiff = Math.abs(z - zoom);
      var greatest = ( w > h ) ? w : h;
      if (window.exporter.model.get('coordinates').locked) {
        perc = Math.ceil((greatest / limit) * 100);
      } else {
        if (z > zoom) perc = Math.ceil((greatest * 100 * Math.pow(2, zoomDiff)) / limit);
        if (z < zoom) perc = Math.ceil((greatest  * 100 * (1/Math.pow(2, zoomDiff))) / limit);
        if (z === zoom ) perc = Math.ceil((greatest / limit) * 100);
      }
    }
    html += [
      "<span class='clip strong micro col12 quiet z z",z,"'>",
      "<a href='#zoomedto' class='col3 center strong quiet keyline-right'>z",z,"</a>",
      perc ? "<span class='truncate col9 strong perc pad0x " : '',
      perc > 100 ? "warning'" : '',
      perc > 1000 ? "'> >1000%</span>" : perc ? "'>"+perc+"%</span>" : '',
      "</span>"
    ].join('');
  }
  html += [
      "<span class='clip strong micro col12 quiet z z23'>",
      "<p class='truncate col12 pad1x'>% of image size limit</p>",
      "</span>"
    ].join('');
  $('#zoomedto').html(html);
};

Printer.prototype.refresh = function(ev) {
  var calcTotal = this.calculateTotal.bind(this);
  var modifyDimensions = this.modifyDimensions.bind(this);

  if (!map) {
    map = L.mapbox.map('map');

    boundingBox = new L.LocationFilter().addTo(map);
    boundingBox.on('enabled', this.calculateCoordinates.bind(this));
    boundingBox.on('change', this.calculateCoordinates.bind(this));

    map.setView([this.model.get('center')[1], this.model.get('center')[0]], this.model.get('center')[2]);
    map.on('zoomend', function() {
      var zoom = map.getZoom()|0;
      $('#zoomedto').attr('class', 'fill-white contain z' + zoom);
      if (window.exporter.model.get('coordinates')) {
        $('#zoom').html(zoom);
        calcTotal();
        if (window.exporter.model.get('coordinates').locked) modifyDimensions();
      }
    });
    map.on('click', inspectFeature({
      id: this.model.id,
      type: 'style',
      map: map
    }));
    new views.Maputils({
      el: $('#view'),
      map: map,
      model: this.model
    });
  }
  map.options.minZoom = this.model.get('minzoom');
  map.options.maxZoom = this.model.get('maxzoom');

  // Refresh map layer.
  var scale = (window.devicePixelRatio > 1) ? '@2x': '';

  if (tiles) map.removeLayer(tiles);
  tiles = L.mapbox.tileLayer({
    tiles: ['/style/{z}/{x}/{y}'+scale+'.png?id=' + this.model.id + '&' + mtime ],
    minzoom: this.model.get('minzoom'),
    maxzoom: this.model.get('maxzoom')
  })
  .addOneTimeEventListener('load', this.bboxEnable.bind(this))
  .on('load', errorHandler);
  tiles.addTo(map);

  // Refresh map title.tm.db.rm('user');
  $('title').text(this.model.get('name'));
  $('.js-name').text(this.model.get('name') || 'Untitled');
  $('.proj-active .style-name').text(this.model.get('name') || 'Untitled');

  // Set canvas background color.
  if (this.model.get('background')) {
    $('#map').css({'background-color':this.model.get('background')});
  }

  return false;
};

window.exporter = new Printer({
  el: document.body,
  model: new Style(style)
});
window.exporter.refresh();

// A few :target events need supplemental JS action. Handled here.
window.onhashchange = function(ev) {
  switch (ev.newURL.split('#').pop()) {
  case 'start':
    window.exporter.refresh();
    setTimeout(map.invalidateSize, 200);
    break;
  case 'home':
    break;
  }
};

window.onhashchange({
  oldURL:window.location.toString(),
  newURL:window.location.toString()
});

};
