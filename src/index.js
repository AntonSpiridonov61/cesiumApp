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
    EntityCollection,
    Cartographic,
    PolygonHierarchy,
    Math,
    Cartesian3
} from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css";
import "./toolbar.js";
import "./simplify.js"


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

import json from "./data.json";
import simplify from "./simplify.js";

const data = json.ionData;
let dataEntityCollection = new EntityCollection(); 
let shapeEntityCollection = new EntityCollection();

function drawData(data) {
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    for (let i = 0; i < data.length; i++) {
        if (data[i][2] < min) min = data[i][2]; 
        if (data[i][2] > max) max = data[i][2]; 
    }

    for (let i = 0; i < data.length; i++) {
        data[i][2] = ((data[i][2] - min) / (max - min)) * 0.65;
        dataEntityCollection.add(viewer.entities.add({
            rectangle: {
                coordinates: 
                    new Rectangle.fromCartesianArray([
                        Cartesian3.fromDegrees(data[i][1] - 0.5, data[i][0] - 0.5),
                        Cartesian3.fromDegrees(data[i][1] + 0.5, data[i][0] + 0.5)
                    ]),
                material: Color.fromHsl(0.6 - data[i][2], 1.0, 0.6 , 0.7)
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

toolbar.addToolbarButton("flight mode", function () { 
    drawingMode = "none";
    viewer.scene.screenSpaceCameraController.enableInputs = true;
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
                return simplify(activeShapePoints, 10, true)
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
                width: 3
            }
        });
    } else if (drawingMode === "rect") {
        shape = viewer.entities.add({
            rectangle: {
                coordinates: positionData,
                material: new ColorMaterialProperty(
                    Color.WHITE.withAlpha(0.5)
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
    if (activeShapePoints.length > 1) {
        activeShapePoints.splice(1, 1);
    }
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

function isPointInPath(point, polygon) {
    let result = false;

    let lonPoint = point[0][0];
    let latPoint = point[0][1];

    for (let i = 0, j = polygon.length - 1; i < polygon.length; i++) {
        let lonI = polygon[i][0];
        let latI = polygon[i][1];
        let lonJ = polygon[j][0];
        let latJ = polygon[j][1];

        if ((lonPoint == lonI) && (latPoint == latI)) {
            return true;
        }
        if ((latI > latPoint) != (latJ > latPoint)) {
            let slope = (lonPoint - lonI) * (latJ - latI) - (lonJ - lonI) * (latPoint - latI);
            if (slope === 0) {
                return true;
            }
            if ((slope < 0) != (latJ < latI)) {
                result = !result;
            }
        }
        j = i;
    }
    return result;
}

function arrayRadiansToDegrees(arrayRadians) {
    let arrayDegrees = [];
    for (let i = 0; i < arrayRadians.length; i++) {
        arrayDegrees.push([
            Math.toDegrees(arrayRadians[i].longitude),
            Math.toDegrees(arrayRadians[i].latitude),
        ])
    }
    return arrayDegrees;
}

function getCountPoint(cartographicPos) {
    let countPoints = 0;

    for (let indexDataEntity in dataEntityCollection.values) {
        let entity = dataEntityCollection.values[indexDataEntity].rectangle.coordinates._value;
        let point = arrayRadiansToDegrees([new Cartographic.fromRadians(entity.west, entity.north)]);
        point[0][0] += 0.5;
        point[0][1] -= 0.5;
        if (isPointInPath(point, cartographicPos)) {
            countPoints++;
        }
    }
    return countPoints;
}

function getCoordinates() {
    let features = [];

    for (let indexShape in shapeEntityCollection.values) {
        let cartographicPos = [];

        if (shapeEntityCollection.values[indexShape].polygon !== undefined) {
            let entityPos = shapeEntityCollection.values[indexShape].polygon.hierarchy._value.positions;
            for (let i = 0; i < entityPos.length; i++) {
                cartographicPos.push(new Cartographic.fromCartesian(entityPos[i]));
            }
        } else {
            let entityPos = shapeEntityCollection.values[indexShape].rectangle.coordinates._value;
            cartographicPos.push(new Cartographic.fromRadians(entityPos.west, entityPos.north));
            cartographicPos.push(new Cartographic.fromRadians(entityPos.east, entityPos.north));
            cartographicPos.push(new Cartographic.fromRadians(entityPos.east, entityPos.south));
            cartographicPos.push(new Cartographic.fromRadians(entityPos.west, entityPos.south));
        }

        let degreesPos = arrayRadiansToDegrees(cartographicPos);

        let countPoints = getCountPoint(degreesPos);
        if (countPoints !== 0) {
            features.push({
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": degreesPos
                },
                "properties": {
                    "countPoints": countPoints
                }
            })
        }

        
    }
    if (features.length !== 0) {
        let geoJson = {
            "type": "FeatureCollection",
            "features": features
        };
        let date = new Date();
        let filename = 
        date.getFullYear() + "-" + date.getMonth() + "-" + date.getDate() + 
            "_" + date.getHours() + "-" + date.getMinutes() + "-" + date.getSeconds();
        
        downloadFiles(JSON.stringify(geoJson), filename + ".json");
    }
}

function downloadFiles(data, file_name) {
    var file = new Blob([data], {type: "text/json"});
    if (window.navigator.msSaveOrOpenBlob) 
        window.navigator.msSaveOrOpenBlob(file, file_name);
    else { 
        var a = document.createElement("a"),
                url = URL.createObjectURL(file);
        a.href = url;
        a.download = file_name;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);  
        }, 0); 
    }
}
