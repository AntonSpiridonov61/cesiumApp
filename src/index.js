import { Ion, Viewer, createWorldTerrain } from "cesium";
import "cesium/Widgets/widgets.css";
import "../src/css/main.css"


Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxNTdmYzYwYS02NzM0LTQ2ZDQtYTgyZC1kNDhjYjhlZjY0NGUiLCJpZCI6ODA5MjAsImlhdCI6MTY0MzI4MTc2OX0.PCZP9J3eaORX2LBuWZsX3LixCDGg8s5Pp4GFAHbkuZY';

const viewer = new Viewer('cesiumContainer', {
    terrainProvider: createWorldTerrain()
});