import {Ion,
        Viewer,
        GeometryInstance,
        RectangleGeometry,
        Rectangle,
        PerInstanceColorAppearance,
        ColorGeometryInstanceAttribute,
        Color,
        Primitive
    } from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";
import json from "./data.json";


Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNTdmYzYwYS02NzM0LTQ2ZDQtYTgyZC1kNDhjYjhlZjY0NGUiLCJpZCI6ODA5MjAsImlhdCI6MTY0MzI4MTc2OX0.PCZP9J3eaORX2LBuWZsX3LixCDGg8s5Pp4GFAHbkuZY';


const data = json.ionData

var viewer = new Viewer('cesiumContainer');
var scene = viewer.scene;

let instances = [];
for (let i = 0; i < data.length - 1; i++) {
    instances.push(new GeometryInstance({
        geometry : new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(data[i][1], data[i][0], data[i][1] + 1.0, data[i][0] + 1.0),
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT
        }),
        attributes : {
            color : ColorGeometryInstanceAttribute.fromColor(Color.fromHsl(1.0, 1.0, data[i][2], 0.9))
        }
    }));
}

scene.primitives.add(new Primitive({
  geometryInstances : instances,
  appearance : new PerInstanceColorAppearance()
}));