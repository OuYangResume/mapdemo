var map;
var center = getParam('center') ? [getParam('center').split(',')[0], getParam('center').split(',')[1]] : [113.923,22.546];
var zoom = getParam('zoom') || 13;
var bearing = getParam('bearing') || 0;
var pitch = getParam('pitch') || 0;
$(document).ready(function () {
    map = new GeoGlobe.Map({
    	mapCRS: {
             //topTileExtent:[-5123300, -30027875.616278134,34906875.616278134,10002300],//内网地图wmts的顶层瓦片范围
             topTileExtent: [-400,-399.9999999999998,400,399.9999999999998],//wms export 临时的顶层瓦片范围
             coordtransform: "none"
         },
         style: {
             "version": 8,
             "sources": {
                 "bd": {
                     "type": "raster",
                     "tiles": ["http://10.200.66.17:6080/arcgis/rest/services/NSKSJ/DLG_ZQ_NS/MapServer/export?BBOX={bbox-epsg-3857}&format=image/png&transparent=true&f=image&size=256,256"],
                     "zoomOffset": 0,
                     "tileSize": 256
                 }
             },
             "layers": [{
                 "id": "1",
                 "type": "raster",
                 "source": "bd"
             }]
         },
    	/*style:{
			"version": 8,
			"sources": {
				"bd": {
					"type": "raster",
					"tiles": ["http://10.200.66.17:6080/arcgis/rest/services/NSKSJ/DLG_ZQ_NS/MapServer/export?BBOX={bbox-epsg-4490}&format=png&transparent=true&f=image&size=2048,2048"],
					"zoomOffset": 1,//wmts Capabilities信息中TileMatrix第一个对应的实际多少级
					"tileSize": 2048
				}
			},
			"layers": [
				{
					"id": "1",
					"type": "raster",
					"source": "bd",
					"raster-opacity":1
				}
			]
		},*/
        container: 'map',
        units: "degrees",
        minZoom: 12,
        center: [113.923,22.546],
        zoom: 13,
        pitch: pitch,
        bearing: bearing,
        doubleClickZoom: true,
        isIntScrollZoom: true,//缩放级别是否为整数处理模式
        renderWorldCopies: false,
        isAttributionControl: false,
        is3Dpitching: !!window.build, //房屋专题页面到指定层级自动倾斜
        pitch3Dzoom: 17//自动倾斜的层级
    });

    map.on('load', function () {
        getAreaInfoByCode(areacode, function (data) {
            strokeArea(data);
            map.flyTo({center: [data.hits.hits[0]._source.center_x, data.hits.hits[0]._source.center_y]});
        });
    });

    map.on('moveend', function () {
        center = [map.getCenter().lng, map.getCenter().lat];
        zoom = map.getZoom();
        bearing = map.getBearing();
        pitch = map.getPitch();
        console.log(map.getCenter());
        changeMapLocationEvent(center[0], center[1], zoom);
    });

    //房屋专题页面
    if (window.build) {
        map.on('moveend', function (e) {
            //当处于网格层级时需要绘制楼栋图层
            if (map.getZoom() >= 17) {
                getFwLdList(JSON.stringify(getBounds()), function (data) {
                    drawLdLayer(data);
                });
            } else {
                hideLdLayer();
            }
        });

        //点击楼栋显示楼栋详情
        map.on("click", "ldLayer_fill", function (e) {
            highlightLd(e.features[0].properties.JZWTYDZBM);
            getFwLdInfo(e.features[0].properties.JZWTYDZBM, function (data) {
                $(".house-down").css('display', 'block');
                build.houseDetails(data);
            });
        });

        //楼栋信息悬浮提示框
        document.styleSheets[0].addRule('.mapboxgl-popup-content', 'padding: 15px !important;');
        document.styleSheets[0].addRule('.mapboxgl-popup-content', 'box-shadow: 0 10px 10px rgba(0, 0, 0, 0.2) !important;');
        var popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        });
        map.on("mousemove", "ldLayer_fill", function (e) {
            map.getCanvas().style.cursor = 'pointer';
            popup.setLngLat([e.lngLat.lng, e.lngLat.lat])
                .setHTML('<img src="img/icon/icon_location.png" style="margin: -2px 5px 0 0;" /><b>' + e.features[0].properties.BZDZ + '</b>')
                .addTo(map);
        });
        map.on("mouseleave", "ldLayer_fill", function () {
            map.getCanvas().style.cursor = '-webkit-grab';
            popup.remove();
        });
    }
});

/**
 * 行政区划描边
 * @param data
 */
function strokeArea(data) {
    var featureCollection = convertData(data);
    if (!map.getSource('strokeSource')) {
        var strokeSource = new GeoGlobe.Source.GeoJSONSource('strokeSource', {
            'type': 'geojson',
            'data': featureCollection
        });
        var strokeLayer = new GeoGlobe.Layer.LineLayer({
            'id': 'strokeLayer',
            'type': 'line',
            'source': 'strokeSource',
            'layout': {},
            'paint': {
                'line-color': '#237af5',
                'line-width': 5
            }
        });
        map.addSource(strokeSource.id, strokeSource.source);
        map.addLayer(strokeLayer);
    } else {
        map.getSource('strokeSource').setData(featureCollection);
    }
}

/**
 * 绘制楼栋图层
 * @param data
 */
function drawLdLayer(data) {
    var featureCollection = convertData2(data);
    if (!map.getSource('ldSource')) {
        var ldSource = new GeoGlobe.Source.GeoJSONSource('ldSource', {
            'type': 'geojson',
            'data': featureCollection
        });
        /*var ldLayer_stroke = new GeoGlobe.Layer.LineLayer({
            'id': 'ldLayer_stroke',
            'type': 'line',
            'source': 'ldSource',
            'layout': {},
            'paint': {
                'line-color': '#4169e1',
                'line-width': 2
            },
            "filter": ["!=", "JZWTYDZBM", ""]
        });*/
        var ldLayer_fill = new GeoGlobe.Layer.FillExtrusionLayer({
            'id': 'ldLayer_fill',
            'type': 'fill-extrusion',
            'source': 'ldSource',
            'layout': {},
            'paint': {
                'fill-extrusion-color': '#4169e1',//'transparent',
                'fill-extrusion-opacity': 0.7,
                'fill-extrusion-height': {
                    'property': 'HEIGHT',
                    'type': 'identity'
                }
            },
            "filter": ["!=", "JZWTYDZBM", ""]
        });
        /*var ldLayer_stroke_hover = new GeoGlobe.Layer.LineLayer({
            'id': 'ldLayer_stroke_hover',
            'type': 'line',
            'source': 'ldSource',
            'layout': {},
            'paint': {
                'line-color': '#ff941a',
                'line-width': 4
            },
            "filter": ["==", "JZWTYDZBM", ""]
        });*/
        var ldLayer_fill_hover = new GeoGlobe.Layer.FillExtrusionLayer({
            'id': 'ldLayer_fill_hover',
            'type': 'fill-extrusion',
            'source': 'ldSource',
            'layout': {},
            'paint': {
                'fill-extrusion-color': '#ff941a',//'rgba(255, 148, 26, 0.3)',
                'fill-extrusion-opacity': 0.7,
                'fill-extrusion-height': {
                    'property': 'HEIGHT',
                    'type': 'identity'
                }
            },
            "filter": ["==", "JZWTYDZBM", ""]
        });
        map.addSource(ldSource.id, ldSource.source);
        // map.addLayer(ldLayer_stroke);
        map.addLayer(ldLayer_fill);
        // map.addLayer(ldLayer_stroke_hover);
        map.addLayer(ldLayer_fill_hover);
    } else {
        map.getSource('ldSource').setData(featureCollection);

        // map.setLayoutProperty('ldLayer_stroke', 'visibility', 'visible');
        map.setLayoutProperty('ldLayer_fill', 'visibility', 'visible');
        // map.setLayoutProperty('ldLayer_stroke_hover', 'visibility', 'visible');
        map.setLayoutProperty('ldLayer_fill_hover', 'visibility', 'visible');
    }
}

/**
 * 隐藏楼栋图层
 */
function hideLdLayer() {
    if (map.getLayer('ldLayer_fill')) {
        // map.setLayoutProperty('ldLayer_stroke', 'visibility', 'none');
        map.setLayoutProperty('ldLayer_fill', 'visibility', 'none');
        // map.setLayoutProperty('ldLayer_stroke_hover', 'visibility', 'none');
        map.setLayoutProperty('ldLayer_fill_hover', 'visibility', 'none');
    }
}

/**
 * 高亮显示当前楼栋
 * @param JZWTYDZBM
 */
function highlightLd(JZWTYDZBM) {
    // map.setFilter("ldLayer_stroke", ["!=", "JZWTYDZBM", JZWTYDZBM]);
    // map.setFilter("ldLayer_stroke_hover", ["==", "JZWTYDZBM", JZWTYDZBM]);
    map.setFilter("ldLayer_fill_hover", ["==", "JZWTYDZBM", JZWTYDZBM]);
}

/**
 * 数据格式处理转换
 * @param data
 * @returns {{features: Array, type: string}}
 */
function convertData(data) {
    var featureCollection = {
        features: [],
        type: "FeatureCollection"
    };
    data.hits.hits.forEach(function (hit) {
        if (hit._source.areainfo.type === 'multipolygon') {
            hit._source.areainfo.coordinates.forEach(function (polygon) {
                polygon[0].forEach(function (point) {
                    point[0] *= 1;
                    point[1] *= 1;
                });
            });
        } else {
            hit._source.areainfo.coordinates.forEach(function (polygon) {
                polygon.forEach(function (point) {
                    point[0] *= 1;
                    point[1] *= 1;
                });
            });
        }
        featureCollection.features.push({
            'type': 'Feature',
            'properties': {
                'areacode': hit._source.areacode,
                'areaname': hit._source.areaname,
                'center_x': hit._source.center_x,
                'center_y': hit._source.center_y,
                'isdelete': hit._source.isdelete,
                'parentcode': hit._source.parentcode,
                'parentname': hit._source.parentname
            },
            'geometry': {
                'type': hit._source.areainfo.type === 'multipolygon' ? 'MultiPolygon' : 'Polygon',
                'coordinates': hit._source.areainfo.coordinates
            }
        });
    });
    return featureCollection;
}

/**
 * 楼栋数据格式处理转换
 * @param data
 * @returns {{features: Array, type: string}}
 */
function convertData2(data) {
    var featureCollection = {
        features: [],
        type: "FeatureCollection"
    };
    data.hits.hits.forEach(function (hit) {
        if (hit._source.AREAINFO.type === 'multipolygon') {
            hit._source.AREAINFO.coordinates.forEach(function (polygon) {
                polygon[0].forEach(function (point) {
                    point[0] *= 1;
                    point[1] *= 1;
                });
            });
        } else {
            hit._source.AREAINFO.coordinates.forEach(function (polygon) {
                polygon.forEach(function (point) {
                    point[0] *= 1;
                    point[1] *= 1;
                });
            });
        }
        featureCollection.features.push({
            'type': 'Feature',
            'properties': {
                'JZWTYDZBM': hit._source.JZWTYDZBM,
                'BZDZ': hit._source.LDMC,
                'HEIGHT': hit._source.DSCS * 3
            },
            'geometry': {
                'type': hit._source.AREAINFO.type === 'multipolygon' ? 'MultiPolygon' : 'Polygon',
                'coordinates': hit._source.AREAINFO.coordinates
            }
        });
    });
    return featureCollection;
}

/**
 * 当地图发生移动或缩放后执行的方法
 * @param lon
 * @param lat
 * @param zoom
 */
function changeMapLocationEvent(lon, lat, zoom) {
    var areatype = "";
    if (zoom < 14) {//小地图展示全市地图，获取区的信息
        areatype = "1";
    } else if (zoom >= 14 && zoom < 16) {//小地图展示区级地图，获取街道的信息
        areatype = "2";
    } else if (zoom >= 16 && zoom < 18) {//小地图展示街道地图，获取社区的信息
        areatype = "3";
    } else if (zoom >= 18) {//小地图展示社区地图，获取网格的信息
        areatype = "4";
    }
    //请求es数据
    getAreaInfoByPoint(lon, lat, areatype, onAreaInfoReceived);
}

/**
 * 从es拿到改变后的区划信息的数据后执行的方法
 * @param data
 */
function onAreaInfoReceived(data) {
    var code = "";
    var name = "";

    //先判断是否获取到数据
    if (data.hits.length === 0) {
        return;
    } else {
        code = data.hits[0]._source.areacode;
        name = data.hits[0]._source.areaname;
        if (code.length === 9) {
            name += "街道";
        } else if (code.length === 12) {
            name += "社区";
        } else if (code.length === 15) {
            name += "网格";
        }
    }

    //行政区划发生改变
    if (code !== areacode) {

        //1.在大地图上描绘当前区域边界
        strokeArea({hits: {hits: [data.hits[0]]}});

        //2.TODO 更新页面信息，此方法由当前页面实现
        onAreaChanged(code, name);

        //3.给全局变量赋值
        areacode = code;
        areaname = name;
    }
}

/**
 * 获取地图边界，为匹配数据库，返回了除以1000后的左上角与右下角坐标值
 * @returns {[Array,Array]}
 */
function getBounds() {
    var _nw = map.unproject([0, 0]);
    var _ne = map.unproject([map.transform.width, 0]);
    var _sw = map.unproject([0, map.transform.height]);
    var _se = map.unproject([map.transform.width, map.transform.height]);

    return [
        [Math.min(_nw.lng, _ne.lng, _sw.lng, _se.lng) / 1, Math.max(_nw.lat, _ne.lat, _sw.lat, _se.lat) / 1],
        [Math.max(_nw.lng, _ne.lng, _sw.lng, _se.lng) / 1, Math.min(_nw.lat, _ne.lat, _sw.lat, _se.lat) / 1]
    ];
}