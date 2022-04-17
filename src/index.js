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
    PolylineMaterialAppearance,
    Material,
    PolygonHierarchy,
    Cartesian3,
    Packable, 
    Cartographic
} from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";
import "./toolbar.js";


Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNTdmYzYwYS02NzM0LTQ2ZDQtYTgyZC1kNDhjYjhlZjY0NGUiLCJpZCI6ODA5MjAsImlhdCI6MTY0MzI4MTc2OX0.PCZP9J3eaORX2LBuWZsX3LixCDGg8s5Pp4GFAHbkuZY';


const viewer = new Viewer('cesiumContainer', {
    selectionIndicator: false,
    infoBox: false,
    timeline: false,
    homeButton: false,
    animation: false,
    geocoder: false,
    navigationInstructionsInitiallyVisible: false,
    scene3DOnly: true,
    // requestRenderMode : true,
    // depthPlaneEllipsoidOffset: 100.0
});
viewer.scene.globe.depthTestAgainstTerrain = true;

const scene = viewer.scene;
import json from "./data.json";

const data = json.ionData;
function getData(data) {
    let instances = [];
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i][2] < min) min = data[i][2]; 
        if (data[i][2] > max) max = data[i][2]; 
    }

    for (let i = 0; i < data.length - 1; i++) {
        data[i][2] = (data[i][2] - min) / (max - min);

        instances.push(new GeometryInstance({
            geometry : new RectangleGeometry({
                rectangle : Rectangle.fromDegrees(data[i][1], data[i][0], data[i][1] + 1.0, data[i][0] + 1.0),
                vertexFormat: PerInstanceColorAppearance.VERTEX_FORMAT
            }),
            id : data[i],
            attributes : {
                color : ColorGeometryInstanceAttribute.fromColor(Color.fromHsl(0.6 - data[i][2], 1.0, 0.6 , 0.95))
            }
        }));
    }
    return instances;
}

let instances = getData(data);

scene.primitives.add(new Primitive({
    geometryInstances : instances,
    appearance : new PerInstanceColorAppearance()
}));

///////////////////////////////////
let drawingMode = "none";

toolbar.addToolbarButton("Lasso", function () {
    // terminateShape();
    drawingMode = "lasso";
    viewer.scene.screenSpaceCameraController.enableInputs = false;
});

toolbar.addToolbarButton("Rectangle", function () { 
    // terminateShape();
    drawingMode = "rect";
    viewer.scene.screenSpaceCameraController.enableInputs = false;
});

toolbar.addToolbarButton("Clear", function () {
    drawingMode = "none"; 
    clearView();
    viewer.scene.screenSpaceCameraController.enableInputs = true;
 });

toolbar.addToolbarButton("GetCoord", function () { 
    drawingMode = "none";
    getCoordinates();
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

let shape;

function drawShape(positionData) {
    let shapeT;
    if (drawingMode === "lasso") {
        shapeT = viewer.entities.add({
            polyline: {
                positions: new CallbackProperty(function () {
                    return positionData;
                }, false),
                clampToGround: true,
                width: 3,
            }
        });
    } else if (drawingMode === "rect") {
        shapeT = viewer.entities.add({
            rectangle: {
                coordinates: new CallbackProperty(function () {
                    return new Rectangle.fromCartesianArray(positionData);
                }, false),
                material: new ColorMaterialProperty(
                    Color.WHITE.withAlpha(0.2)
                ),
            },
        }
            // new Primitive({
            //     geometryInstances: new GeometryInstance({
            //         geometry: new RectangleGeometry({
            //             rectangle: new CallbackProperty(function () {
            //                 return new Rectangle.fromCartesianArray(positionData);
            //             }, false)
            //         })
            //     }),
            //     appearance: new PolylineMaterialAppearance({
            //         material: new ColorMaterialProperty(
            //            Color.WHITE.withAlpha(0.2)
            //         ),
            //         renderState: {
            //             depthTest: {
            //                 enabled: false  // shut off depth test
            //             }
            //         }
            //     }),
            //     asynchronous: false   // block or not
            //   })
        );
    }
    return shapeT;
}

function drawLasso(event) {
    console.log("moved " + event.startPosition);
    const startPosition = viewer.scene.pickPosition(event.startPosition);
    const endPosition = viewer.scene.pickPosition(event.endPosition);
    if (defined(endPosition) && defined(startPosition)) {
        activeShapePoints.push(endPosition);
        shape = drawShape([startPosition, endPosition]);
    }
}

function drawRectangle(event) {
    if (activeShapePoints.length > 1) activeShapePoints.splice(1, 3)
    const endPosition = viewer.scene.pickPosition(event.endPosition);
    if (defined(endPosition)) {
        activeShapePoints.push(endPosition);
        shape = drawShape(activeShapePoints);
    }
    console.log(activeShapePoints);

    // floatingPoint.position.setValue(endPosition);
    // floatingPoint1.position.setValue(new Cartesian3(
    //     endPosition.x, startPosition.y, startPosition.z
    // ));
    // floatingPoint2.position.setValue(new Cartesian3(
    //     startPosition.x, endPosition.y, endPosition.z
    // ));
}

let activeShapePoints = [];
let activeShape;
let floatingPoint;
let floatingPoint1;
let floatingPoint2;
const handler = new ScreenSpaceEventHandler(viewer.canvas);

handler.setInputAction(function (event) {
    activeShapePoints = [];
    const startPosition = viewer.scene.pickPosition(event.position);
    // floatingPoint = createPoint(startPosition);
    // floatingPoint1 = createPoint(startPosition);
    // floatingPoint2 = createPoint(startPosition);
    if (defined(startPosition)) {
        activeShapePoints.push(startPosition);
        handler.setInputAction(function (event) {
            if (drawingMode === "lasso") drawLasso(event);
            if (drawingMode === "rect") drawRectangle(event);
        }, ScreenSpaceEventType.MOUSE_MOVE);
    }

}, ScreenSpaceEventType.LEFT_DOWN);

handler.setInputAction(function (event) {
    handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
}, ScreenSpaceEventType.LEFT_UP);

function terminateShape() {
    activeShapePoints.pop();
    drawShape(activeShapePoints);
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
    floatingPoint = undefined;
    activeShape = undefined;
    activeShapePoints = [];
}

function clearView() {
    viewer.entities.removeAll(shape);
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
}

function getCoordinates() {
    console.log("getCoordinates");
}
