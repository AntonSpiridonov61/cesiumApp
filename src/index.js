import {
    Ion,
    Viewer,
    Rectangle,
    Color,
    ScreenSpaceEventHandler,
    defined,
    ScreenSpaceEventType,
    ColorMaterialProperty,
    CallbackProperty,
    exportKml,
    EntityCollection,
    Cartographic,
    PolygonHierarchy,
    Math
} from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";
import "./toolbar.js";
// import toGeoJSON from "togeojson";


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
});
viewer.scene.globe.depthTestAgainstTerrain = true;

const scene = viewer.scene;
import json from "./data.json";

const data = json.ionData;
let dataEntityCollection = new EntityCollection(); 
let shapeEntityCollection = new EntityCollection();

function drawData(data) {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    for (let i = 4000; i < 4003; i++) {
        if (data[i][2] < min) min = data[i][2]; 
        if (data[i][2] > max) max = data[i][2]; 
    }

    for (let i = 4000; i < 4003; i++) {
        data[i][2] = (data[i][2] - min) / (max - min);
        dataEntityCollection.add(viewer.entities.add({
            rectangle: {
                coordinates: 
                    new Rectangle.fromDegrees(
                        data[i][1], data[i][0], data[i][1] + 0.8, data[i][0] + 0.8
                    ),
                material: Color.fromHsl(0.6 - data[i][2], 1.0, 0.6 , 0.9)
            }
        }));
    }
}

drawData(data);

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
    if (drawingMode === "rect") {
        shapeEntityCollection.add(viewer.entities.add({
            rectangle: {
                coordinates: new Rectangle.fromCartesianArray(activeShapePoints),
                material: new ColorMaterialProperty(
                    Color.AQUA.withAlpha(0.4)
                ),
            },
        }));
    } else if (drawingMode === "lasso") {
        shapeEntityCollection.add(viewer.entities.add({
            polygon: {
                hierarchy: new PolygonHierarchy(activeShapePoints),
                material: new ColorMaterialProperty(
                    Color.AQUA.withAlpha(0.4)
                ),
            }
        }));
    }

    viewer.entities.remove(activeShape);
    activeShape = undefined;
    activeShapePoints = [];
}

function clearView() {
    for (let indexEntity in shapeEntityCollection.values) {
        viewer.entities.remove(shapeEntityCollection.values[indexEntity]);
    }
    shapeEntityCollection = new EntityCollection();
}

function pointInPolygon(lon, lat, polygon) {
    let odd = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
        console.log(polygon[i]);
        let lonI = Math.toDegrees(polygon[i].longitude);
        let latI = Math.toDegrees(polygon[i].latitude);
        let lonJ = Math.toDegrees(polygon[j].longitude);
        let latJ = Math.toDegrees(polygon[j].latitude);

        if (((latI > lat) !== (latJ > lat)) && (lon < ((lonJ - lonI) * (lat - latI) / (latJ - latI) + lonI))) {
            odd = !odd;
        }
        j = i;
    }
    return odd;
}

function isPointInPath(lon, lat, polygon) {
    let num = polygon.length;
    let j = num - 1;
    let c = false;

    for (let i = 0; i < num; i++) {
        let lonI = Math.toDegrees(polygon[i].longitude);
        let latI = Math.toDegrees(polygon[i].latitude);
        let lonJ = Math.toDegrees(polygon[j].longitude);
        let latJ = Math.toDegrees(polygon[j].latitude);

        if ((lon == lonI) && (lat == latI)) {
            return true;
        }
        if ((latI > lat) != (latJ > lat)) {
            let slope = (lon-lonI)*(latJ-latI)-(lonJ-lonI)*(lat-latI);
            if (slope === 0) {
                return true;
            }
            if ((slope < 0) != (latJ < latI)) {
                c = !c;
            }
        }
        j = i;
    }
    return c;
}

function getCoordinates() {

    let lengthData = dataEntityCollection.values.length

    for (let indexEntity in shapeEntityCollection.values) {
        let cartographicPos = [];
        if (shapeEntityCollection.values[indexEntity].polygon !== undefined) {
            let entityPos = shapeEntityCollection.values[indexEntity].polygon.hierarchy._value.positions;
            for (let i = 0; i < entityPos.length; i++) {
                cartographicPos.push(new Cartographic.fromCartesian(entityPos[i]));
            }
        } else {
            let entityPos = shapeEntityCollection.values[indexEntity].rectangle.coordinates._value;
            cartographicPos.push(new Cartographic.fromRadians(entityPos.north, entityPos.west));
            cartographicPos.push(new Cartographic.fromRadians(entityPos.north, entityPos.east));
            cartographicPos.push(new Cartographic.fromRadians(entityPos.south, entityPos.east));
            cartographicPos.push(new Cartographic.fromRadians(entityPos.south, entityPos.west));
        }

        let countPoints = 0;

        for (let i = 0; i < lengthData; i++) {
            let rect = dataEntityCollection.values[i].rectangle.coordinates._value;
            let cart = new Cartographic.fromRadians(rect.south, rect.west);
            if(pointInPolygon(Math.toDegrees(cart.longitude), Math.toDegrees(cart.latitude), cartographicPos)) {
                countPoints++;
            }
        }
        console.log(countPoints);
        
        
    }
    // exportKml({
    //     entities: shapeEntityCollection
    // }).then(function(result) {
    //     console.log(result);
    //     //   let jsonGEO = toGeoJSON.kml(result)
    //     //   console.log(jsonGEO);
    //  });
    
}
