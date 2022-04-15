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
        PolygonHierarchy,
        Camera,
        CameraEventAggregator,
        CameraEventType,
        Cartesian3
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
viewer.scene.globe.depthTestAgainstTerrain = true;

let instances = [];
for (let i = 0; i < data.length - 1; i++) {
    // console.log(Color.lerp(Color.BLACK, Color.WHITE, data[i][2], Color.BLUE).toString())
    instances.push(new GeometryInstance({
        geometry : new RectangleGeometry({
            rectangle : Rectangle.fromDegrees(data[i][1], data[i][0], data[i][1] + 1.0, data[i][0] + 1.0),
            vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT,
            zIndex: 100
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
    viewer.scene.screenSpaceCameraController.enableInputs = false;
});

Sandcastle.addToolbarButton("Line", function () {
    terminateShape();
    drawingMode = 'line';
    viewer.scene.screenSpaceCameraController.enableInputs = false;
});
Sandcastle.addToolbarButton("Clear", function () { clearView() });
Sandcastle.addToolbarButton("GetCoord", function () { 
    drawingMode = "none";
    getCoordinates()
    viewer.scene.screenSpaceCameraController.enableInputs = true;
});

///////////////////

function createPoint(worldPosition) {
    const point = viewer.entities.add({
        position: worldPosition,
        point: {
            color: Color.WHITE,
            pixelSize: 5,
            heightReference: HeightReference.CLAMP_TO_GROUND,
        },
    });
    return point;
  }

function drawShape(positionData) {
    let shape;
    if (drawingMode === "line") {
        shape = viewer.entities.add({
            polyline: {
                positions: positionData,
                clampToGround: true,
                width: 3,
            },
        });
    } else if (drawingMode === "polygon") {
        shape = viewer.entities.add({
            rectangle: {
                coordinates: positionData,
                material: new ColorMaterialProperty(
                    Color.WHITE.withAlpha(0.7)
                ),
            },
        });
    }
    return shape;
}

function drawLasso(event) {
    console.log("moved " + event.startPosition);
    const startPosition = viewer.scene.pickPosition(event.startPosition);
    const endPosition = viewer.scene.pickPosition(event.endPosition);
    if (defined(endPosition) && defined(startPosition)) {
        // createPoint(startPosition);
        drawShape([startPosition, endPosition]);
        createPoint(endPosition);
    }
}

function drawRectangle(event, startPosition) {
    if (activeShapePoints.length > 1) activeShapePoints.splice(1, 3)
    const endPosition = viewer.scene.pickPosition(event.endPosition);
    activeShapePoints.push(
        new Cartesian3(
            endPosition.x, startPosition.y, endPosition.z
        )
    );
    activeShapePoints.push(endPosition);
    activeShapePoints.push(
        new Cartesian3(
            startPosition.x, endPosition.y, endPosition.z
        )
    );
    
    // console.log(activeShapePoints);
    // floatingPoint.position.setValue(endPosition);
    // floatingPoint1.position.setValue(new Cartesian3(
    //     endPosition.x, startPosition.y, startPosition.z
    // ));
    // floatingPoint2.position.setValue(new Cartesian3(
    //     startPosition.x, endPosition.y, endPosition.z
    // ));
    const dynamicPositions = new CallbackProperty(function () {
        return new Rectangle.fromCartesianArray(activeShapePoints);
    }, false);
    drawShape(dynamicPositions);
}

function createNewPoint(startPosition, newPosition) {

}

let drawingMode = "none";
let activeShapePoints = [];
let activeShape;
let floatingPoint;
let floatingPoint1;
let floatingPoint2;
const handler = new ScreenSpaceEventHandler(viewer.canvas);

handler.setInputAction(function (event) {
    console.log("leftDown");
    const startPosition = viewer.scene.pickPosition(event.position);
    createPoint(startPosition);
    floatingPoint = createPoint(startPosition);
    floatingPoint1 = createPoint(startPosition);
    floatingPoint2 = createPoint(startPosition);
    activeShapePoints.push(startPosition);

    handler.setInputAction(function (event) {
        if (drawingMode === "line") drawLasso(event);
        if (drawingMode === "polygon") {
            const endPosition = viewer.scene.pickPosition(event.endPosition);
            
            drawRectangle(event, startPosition);
        }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // const earthPosition = viewer.scene.pickPosition(event.position);
    // if (defined(earthPosition)) {
    //     if (activeShapePoints.length === 0) {
    //         floatingPoint = createPoint(earthPosition);
    //         activeShapePoints.push(earthPosition);
    //         const dynamicPositions = new CallbackProperty(function () {
    //             if (drawingMode === "polygon") {
    //                 return new PolygonHierarchy(activeShapePoints);
    //             }
    //             return activeShapePoints;
    //         }, false);
    //         activeShape = drawShape(dynamicPositions);
    //     }
    //     activeShapePoints.push(earthPosition);
    //     createPoint(earthPosition);
    // }
}, ScreenSpaceEventType.LEFT_DOWN);

handler.setInputAction(function (event) {
    console.log("LeftUp");
    activeShapePoints = [];
    activeShape = undefined;
    handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
}, ScreenSpaceEventType.LEFT_UP);

// handler.setInputAction(function (event) {
// if (defined(floatingPoint)) {
//     const startPosition = viewer.scene.pickPosition(event.startPosition);
//     const newPosition = viewer.scene.pickPosition(event.endPosition);
//     if (defined(newPosition)) {
//         createPoint(startPosition);
//         drawShape([startPosition, newPosition]);
//         createPoint(newPosition);
//         // floatingPoint.position.setValue(newPosition);
//         // activeShapePoints.pop();
//         // activeShapePoints.push(newPosition);
//     }
// }
// }, ScreenSpaceEventType.MOUSE_MOVE);

function terminateShape() {
    activeShapePoints.pop();
    drawShape(activeShapePoints);
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
    floatingPoint = undefined;
    activeShape = undefined;
    activeShapePoints = [];
}
// handler.setInputAction(function (event) {
//     terminateShape();
// }, ScreenSpaceEventType.RIGHT_CLICK);


function clearView() {
    // viewer.entities.removeAll(shape);
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
}

function getCoordinates() {
    console.log("getCoordinates");
}