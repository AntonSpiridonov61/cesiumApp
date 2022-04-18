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
    ColorMaterialProperty,
    CallbackProperty,
    exportKml,
    EntityCollection
} from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";
import "./toolbar.js";
import toGeoJSON from "togeojson";


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
    // depthPlaneEllipsoidOffset: 1000.0
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
    drawingMode = "lasso";
    viewer.scene.screenSpaceCameraController.enableInputs = false;
});

toolbar.addToolbarButton("Rectangle", function () { 
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

let activeShapePoints = [];
let activeShape;
let EntityColl= new EntityCollection();
const handler = new ScreenSpaceEventHandler(viewer.canvas);

handler.setInputAction(function (event) {
    const startPosition = viewer.scene.pickPosition(event.position);
    if (defined(startPosition)) {
        activeShapePoints.push(startPosition);

        const dynamicPositions = new CallbackProperty(function () {
            if (drawingMode === "rect") {
                return new Rectangle.fromCartesianArray(activeShapePoints)
            } else {
                return activeShapePoints
            }
        }, false);
        activeShape = drawShape(dynamicPositions);

        handler.setInputAction(function (event) {
            if (drawingMode === "lasso") drawLasso(event);
            if (drawingMode === "rect") drawRectangle(event);
        }, ScreenSpaceEventType.MOUSE_MOVE);
    }

}, ScreenSpaceEventType.LEFT_DOWN);

handler.setInputAction(function (event) {
    terminateShape();
    handler.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
}, ScreenSpaceEventType.LEFT_UP);

///////////////////////////

function drawShape(positionData) {
    let shape;
    if (drawingMode === "lasso") {
        shape = viewer.entities.add({
            polyline: {
                positions: positionData,
                clampToGround: true,
                width: 3,
            }
        });
    } else if (drawingMode === "rect") {
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
    const endPosition = viewer.scene.pickPosition(event.endPosition);
    if (defined(endPosition)) {
        activeShapePoints.push(endPosition);
    }
}

function drawRectangle(event) {
    if (activeShapePoints.length > 1) activeShapePoints.splice(1, 1);
    const endPosition = viewer.scene.pickPosition(event.endPosition);
    if (defined(endPosition)) {
        activeShapePoints.push(endPosition);
    }
}

function terminateShape() {
    if (drawingMode === "lasso") {
        activeShapePoints.push(activeShapePoints[0]);
        EntityColl.add(drawShape(activeShapePoints));
    }
    if (drawingMode === "rect") EntityColl.add(drawShape(new Rectangle.fromCartesianArray(activeShapePoints)));
    viewer.entities.remove(activeShape);
    activeShape = undefined;
    activeShapePoints = [];
}

function clearView() {
    viewer.entities.removeAll(EntityColl);
}

function getCoordinates() {
    console.log(EntityColl);
    // exportKml({
    //     entities: EntityColl
    // }).then(function(result) {
    //     console.log(result);
    //       let jsonGEO = toGeoJSON.kml(result)
    //       console.log(jsonGEO);
    //  });
    
}
