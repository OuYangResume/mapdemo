/**
 * Created by Administrator on 2018/1/3.
 */
var realTimeTrance=function(options){
  this.options={
      map:null,
      markerStyle:new ol.style.Style({
          fill: new ol.style.Fill({
              color: 'rgba(255, 255, 255, 0.2)'
          }),
          stroke: new ol.style.Stroke({
              color: '#ffcc33',
              width: 3
          }),
          image: new ol.style.Circle({
              radius: 7,
              fill: new ol.style.Fill({
                  color: '#ffcc33'
              })
          })
      })
  };
    this.initialize(options);
};
realTimeTrance.prototype={
    initialize:function(options){
        this.setOptions(this,options);
        this._map=this.options.map;
        this._createLayer();
        this._LinePoints=[];
    },
    setOptions:function (obj, options) {
        for (var i in options) {
            obj.options[i] = options[i];
        }
        return obj.options;
    },
    setMarkerStyle:function(style){
        this.options.markerStyle = style
    },
    _createLayer:function(){
        this._vecSource = new ol.source.Vector({
            features: this._features,
            wrapX: false
        });
        this._vecLayer = new ol.layer.Vector({
            style: this.drawedStyle,
            source: this._vecSource
        });
        if(!this._map){
            alert("����δ������map������");
            return;
        }
        this._map.addLayer(this._vecLayer);
    },
    addPoint:function(point){
        this._LinePoints.push(point);
        if((!this.LineFeature)&&(this._LinePoints.length>=2)){
            this._createLine();
        }else if(this._LinePoints.length>=2){
            this.LineFeature.getGeometry().setCoordinates(this._LinePoints);
        }
        this._createMarker(point);
    },
    _createLine:function(){
        var self=this;
        var geom = new ol.geom.LineString(self._LinePoints);
        var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(250,0,0,1)',
                width:3
            })
        });
        this.LineFeature = new ol.Feature(
            {
                geometry: geom
            });
        this.LineFeature.setStyle(style);
        this._vecSource.addFeature(this.LineFeature);
    },
    addFeature:function(feature){
        this._vecSource.addFeature(feature);
    },
    _createMarker:function(point){
        if(!this.MarkerFeature){
            var geom = new ol.geom.Point(point);
            this.MarkerFeature = new ol.Feature(
                {
                    geometry: geom
                });
            this.MarkerFeature.setStyle(this.options.markerStyle);
            this._vecSource.addFeature(this.MarkerFeature);
            return;
        }else{
            this.MarkerFeature.getGeometry().setCoordinates(point);
        }
    },
    clear:function(){
        this._vecSource.clear();
        this._LinePoints=[];
        this.LineFeature=null;
        this.MarkerFeature=null;
    }
};
var Path_Animation=function(options){
    this.options={
        map:null,
        time:100
    };
    this.initialize(options);
};
Path_Animation.prototype= {
    initialize: function (options) {
        this.setOptions(this, options);
        this._map = this.options.map;
        this.time=this.options.time;
        this.linePoints=null;
        this.isOpen=false;
        this.speed=2;
        this.createTrance();
        this.index=0;
    },
    setOptions: function (obj, options) {
        for (var i in options) {
            obj.options[i] = options[i];
        }
        return obj.options;
    },
    setMarkerStyle:function(style){
        this.realTimeTrance.setMarkerStyle(style);
        this.Icon=style.getImage();
    },
    createTrance:function(){
        var self=this;
        var option={
            map:self._map
        };
        this.realTimeTrance=new realTimeTrance(option);
    },
    setData:function(lineData){
        this.lineData=lineData;
        this.linePoints=this.getNewData(lineData);
    },
    addLine:function(lineData){
        var style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgba(0,0,0,0.8)',
                width:6
            })
        });
        var geom = new ol.geom.LineString(lineData);
        var LineFeature = new ol.Feature(
            {
                geometry: geom
            });
        LineFeature.setStyle(style);
        this.realTimeTrance.addFeature(LineFeature);
    },
    setSpeed:function(speed){
        this.speed=speed;
    },
    getNewData:function(linePoints){
        var points=[];
        var line=linePoints;
        for(var i=0;i<line.length;i++){
            if(i+1<line.length){
                var lonlats=this.insertPoint(line[i],line[i+1],this.time);
                points=points.concat(lonlats);
            }
        }
        return points;
    },
    getDistance:function(startPoint, endPoint, isWGS84) {
        var webStartPoint, webEndPoint;
        if (isWGS84) {
            webStartPoint = ol.proj.transform(startPoint, 'EPSG:4326', 'EPSG:3857');
            webEndPoint = ol.proj.transform(endPoint, 'EPSG:4326', 'EPSG:3857');
        } else {
            webStartPoint = startPoint;
            webEndPoint = endPoint;
        }
        return Math.sqrt(Math.pow((webEndPoint[0] - webStartPoint[0]), 2) + Math.pow((webEndPoint[1] - webStartPoint[1]), 2));
    },
    insertPoint:function(startPoint, endPoint, speed) {
        var distance = this.getDistance(startPoint, endPoint, true);
        //var insertPointLength = Math.ceil(distance / (speed));
        var insertPointLength =speed;
        //�������㱻���ֺ��ֵ
        var Dx = (endPoint[0] - startPoint[0]) / insertPointLength;
        var Dy = (endPoint[1] - startPoint[1]) / insertPointLength;
        var points = [startPoint];
        for (var i = 0; i < insertPointLength; i++) {
            if (i != (insertPointLength - 1)) {
                var this_point = points[points.length - 1];
                points[points.length] = [this_point[0] + Dx, this_point[1] + Dy];
            }
        }
        return points;
    },
    open:function(){
        this.close();
        this.isOpen=true;
        this.linePoints=this.getNewData( this.lineData);
        this.addLine(this.lineData);
        this.createInterval();
    },
    createInterval:function(){
        var self=this;
        self.setInterval=setInterval(function(){
            if(self.isOpen){
                setTimeout(function(){
                    if(self.index<self.linePoints.length){
                        self.realTimeTrance.addPoint(self.linePoints[self.index]);
                        if(self.index>1){
                            var Angle=self.getAngle(self.linePoints[self.index-1],self.linePoints[self.index]);
                            self.IconRotation(Angle);
                        }
                        self.index++;
                    }else{
                        self.realTimeTrance.clear();
                        window.clearInterval(self.setInterval);
                        self.index=0;
                        self.isOpen=false;
                    }
                },parseInt(self.time/self.speed))
            }
        },parseInt(self.time/self.speed));
    },
    close:function(){
        this.suspended();
        if(this.setInterval)
            window.clearInterval(this.setInterval);
        this.realTimeTrance.clear();
        this.index=0;
        this.linePoints=[];
    },
    continued:function(){
        if(this.setInterval)
            window.clearInterval(this.setInterval);
        if(this.index==1){
            this.addLine(this.lineData);
        }
        this.isOpen=true;
        this.createInterval();
    },
    suspended:function(){
        this.isOpen=false;
    },
    //ͼ����ת
    IconRotation:function(Angle){
        if(this.Icon)
            this.Icon.setRotation(Angle)
    },
    getAngle:function(startPoint,endPoint){
        var dx=startPoint[0]-endPoint[0];
        var dy=startPoint[1]-endPoint[1];
       return  Math.atan2(dx,dy);
    }
};