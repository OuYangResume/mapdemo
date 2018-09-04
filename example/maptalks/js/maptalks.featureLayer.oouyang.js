function postDataFrom(url) {
    var _url = url;
    var filter = "/query?where=1%3D1&text=&objectIds=&time=&geometry=&geometryType=esriGeometryEnvelope&inSR=&spatialRel=esriSpatialRelIntersects&relationParam=&outFields=&returnGeometry=true&maxAllowableOffset=&geometryPrecision=&outSR=&returnIdsOnly=false&returnCountOnly=false&orderByFields=&groupByFieldsForStatistics=&outStatistics=&returnZ=false&returnM=false&gdbVersion=&returnDistinctValues=false&f=pjson";
    var requestUrl = _url + filter;
    $.ajax({
        url: requestUrl, async: true, dataType: 'jsonp',
        success: function (e) {
            var data = maptalks.Util.parseJSON(e);
            var filterUrl = _url + "?f=pjson"
            $.ajax({
                url: filterUrl,
                async: false, dataType: 'jsonp',
                success: function (res) {
                    var lInfo = maptalks.Util.parseJSON(res);
                    var layerData = { data: data, info: lInfo };
                    console.log(layerData);
                    var geometries = addData(layerData);
                    layer.addGeometry(geometries);
                },
                error: function (b) {

                }
            })
        },
        err: function (a) { }
    });
};
function addData(layerData) {
    var geodata = null;
    if (!(layerData instanceof Object))
        return;
    if (!layerData.info.geometryType) {
        throw new Error("The layer's geometry type is unknown");
        return;
    }
    switch (layerData.info.geometryType) {
        case "esriGeometryPoint":
            geodata = processMarkers(layerData);
            break;
        case "esriGeometryPolygon":
            geodata = processPolygons(layerData);
            break;
        case "esriGeometryPolyline":
            geodata = processPolylines(layerData);
            break;
        default:
            break;
    }
    return geodata;
}
//点
function processMarkers(layerData) {

}
//线
function processPolylines(layerData) {

}
//面
function processPolygons(layerData) {
    console.log(layerData);
    var features = layerData.data.features;
    var _symbol = parseEsriSymbol(layerData.info.drawingInfo.renderer.symbol || layerData.info.drawingInfo.renderer.defaultSymbol);
    var polygons = [];
    for (var i = 0, len = features.length; i < len; i++) {
        var feature = features[i];
        var polygon = new maptalks.Polygon(feature.geometry.rings, {
            symbol: _symbol
        });
        polygon.attributes = feature.attributes;
        //鼠标在要素上移动时改变polygon透明度
        var selected = true;
        if (selected == true) {
            var oldopacity = 0;
            polygon.on('mouseover', function (g) {
                var _target = g.target;
                var currentopacity = _target.getSymbol().polygonOpacity;
                oldopacity = (oldopacity < currentopacity && oldopacity != 0) ? oldopacity : currentopacity;
                var newopacity = (currentopacity + 0.2 <= 1) ? currentopacity + 0.2 : 1;
                var _symbol = _target.getSymbol();
                _target.updateSymbol({ polygonOpacity: newopacity });
                _target.on('mouseout', function (_g) {
                    var _target_ = _g.target;
                    _target_.updateSymbol({ polygonOpacity: oldopacity });
                });
            });
        };
        //信息框
        var query = true;
        if (query == true) {
            setInfoWindow(polygon);
        }
        polygon.setId(feature.attributes.OBJECTID);
        polygons.push(polygon);
    }
    return polygons;
}
//解析请求信息中所包含的符号信息
function parseEsriSymbol(symbol) {
    var sym;
    if (!symbol) return;
    if (symbol.type == "esriSMS") {
        sym = {
            'markerType': 'ellipse',
            'markerLineColor': 'rgb(' + symbol.outline.color[0] + ',' + symbol.outline.color[1] + ',' + symbol.outline.color[2] + ')',
            'lineWidth': symbol.outline.width,
            'markerLineOpacity': 1,
            'markerFill': 'rgb(' + symbol.color[0] + ',' + symbol.color[1] + ',' + symbol.color[2] + ')',
            'markerFillOpacity': 1,
            'markerWidth': symbol.size + 1,
            'markerHeight': symbol.size + 1
        }
        return sym;
    }
    else if (symbol.type == "esriSFS") {
        var pfill = symbol.color ? 'rgb(' + symbol.color[0] + ',' + symbol.color[1] + ',' + symbol.color[2] + ')' : "#ffffff";
        var pOpacity = symbol.color ? 0.8 : 0;
        sym = {
            'lineColor': 'rgb(' + symbol.outline.color[0] + ',' + symbol.outline.color[1] + ',' + symbol.outline.color[2] + ')',
            'lineWidth': symbol.outline.width,
            'lineOpacity': 1,
            'polygonFill': pfill,
            'polygonOpacity': pOpacity
        }
        return sym;
    }
}
//添加信息框
function setInfoWindow(geo) {
    var attri = geo.attributes;
    var content = '<table class="infoWin" cellspacing="5" id="infoWin">';
    for (var p in attri) {
        content += '<tr><td>' + p + '</td><td>：' + attri[p] + '</td></tr>';
    }
    content += '</table>';
    var options = {
        'title': '属性信息',
        'content': content
    };
    var infoWindow = new maptalks.ui.InfoWindow(options);
    var _infoWin = infoWindow.addTo(geo);
    geo.on('click', function (e) {
        !_infoWin.isVisible() ? _infoWin.show(e.target.getCenter()) : _infoWin.hide();
    });
}