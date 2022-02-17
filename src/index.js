import {
        Ion,
        Viewer,
        GeometryInstance,
        RectangleGeometry,
        Rectangle,
        PerInstanceColorAppearance,
        ColorGeometryInstanceAttribute,
        Color,
        Primitive,
        ScreenSpaceEventHandler,
        defined,
        ScreenSpaceEventType,
        HeightReference,
        ColorMaterialProperty,
        CallbackProperty,
        PolygonHierarchy
    } from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";
import "../src/sandcastle.js"
import json from "./data.json";


Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNTdmYzYwYS02NzM0LTQ2ZDQtYTgyZC1kNDhjYjhlZjY0NGUiLCJpZCI6ODA5MjAsImlhdCI6MTY0MzI4MTc2OX0.PCZP9J3eaORX2LBuWZsX3LixCDGg8s5Pp4GFAHbkuZY';


const data = json.ionData

const viewer = new Viewer('cesiumContainer', {
    selectionIndicator : false,
    infoBox : false,
    timeline : false,
    animation : false,
    navigationHelpButton : false,
    navigationInstructionsInitiallyVisible : false
});

const scene = viewer.scene;

let instances = [];
for (let i = 0; i < data.length - 1; i++) {
    // console.log(Color.lerp(Color.BLACK, Color.WHITE, data[i][2], Color.BLUE).toString())
    instances.push(new GeometryInstance({
        geometry : new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(data[i][1], data[i][0], data[i][1] + 1.0, data[i][0] + 1.0),
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT
        }),
        id : data[i],
        attributes : {
            color : ColorGeometryInstanceAttribute.fromColor(Color.fromHsl(0.6, 1.0 - data[i][2], 0.3 , 0.95))
        }
    }));
}

scene.primitives.add(new Primitive({
  geometryInstances : instances,
  appearance : new PerInstanceColorAppearance()
}));

///////////////////////////////////

Sandcastle.addToolbarButton("Polygon", function () { 
    terminateShape();
    drawingMode = 'polygon';
});
Sandcastle.addToolbarButton("Line", function () {
    terminateShape();
    drawingMode = 'line';
});
Sandcastle.addToolbarButton("Clear", function () { clearView() });
Sandcastle.addToolbarButton("GetCoord", function () { getCoordinates() });

///////////////////

let drawingMode = '';
let activeShapePoints = [];
let activeShape;
let floatingPoint;
let shape;

function createPoint(worldPosition) {
    let point = viewer.entities.add({
        position : worldPosition,
        point : {
            color : Color.AQUA,
            pixelSize : 3,
            heightReference: HeightReference.CLAMP_TO_GROUND
        }
    });
    
    return point;
}

function drawShape(positionData) {
    if (drawingMode === 'line') {
        shape = viewer.entities.add({
            polyline : {
                positions : positionData,
                clampToGround : true,
                width : 3
            }
        });
    }
    else if (drawingMode === 'polygon') {
        shape = viewer.entities.add({
            polygon: {
                hierarchy: positionData,
                material: new ColorMaterialProperty(Color.AQUA.withAlpha(0.2))
            }
        });
    }
    
    return shape;
}


const handler = new ScreenSpaceEventHandler(viewer.canvas);

handler.setInputAction(function(event) {
    const earthPosition = viewer.scene.pickPosition(event.position);

    if (defined(earthPosition)) {
        if (activeShapePoints.length === 0) {
            floatingPoint = createPoint(earthPosition);
            activeShapePoints.push(earthPosition);
            const dynamicPositions = new CallbackProperty(function () {
                if (drawingMode === "polygon") {
                    return new PolygonHierarchy(activeShapePoints);
                }
                return activeShapePoints;
            }, false);
            activeShape = drawShape(dynamicPositions);
        }
        activeShapePoints.push(earthPosition);
        createPoint(earthPosition);
    }
}, ScreenSpaceEventType.LEFT_CLICK);

handler.setInputAction(function(event) {
    if (defined(floatingPoint)) {
        const newPosition = viewer.scene.pickPosition(event.endPosition);
        if (defined(newPosition)) {
            floatingPoint.position.setValue(newPosition);
            activeShapePoints.pop();
            activeShapePoints.push(newPosition);
        }
    }
}, ScreenSpaceEventType.MOUSE_MOVE);

function terminateShape() {
    activeShapePoints.pop();
    drawShape(activeShapePoints);
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
    floatingPoint = undefined;
    activeShape = undefined;
    activeShapePoints = [];
}

handler.setInputAction(function(event) {
    terminateShape();
}, ScreenSpaceEventType.RIGHT_CLICK);

function clearView() {
    viewer.entities.removeAll(shape);
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
}

function getCoordinates() {

}