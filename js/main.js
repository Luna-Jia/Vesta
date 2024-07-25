// Global variables
let workspaceCount = 1;
let currentWorkspace = 1;
let workspaceData = {
    1: {
        geojson: null,
        map: null,
        histogram: null,
        geoJsonLayer: null,
        legend: null,
        min: null,
        max: null,
        highlightedFeatures: new Set()
    }
};

let highlightColor = '#e6e6fa'; // Light purple
let mapHighlightColor = '#9370db'; // Medium purple
let mapHighlightWeight = 5;
let mapSelectionStyle = 'fill'; // 'fill' or 'outline'
let dataOpacity = 0.7;

function openSettingsModal() {
    document.getElementById('settingsModal').style.display = 'block';
    document.getElementById('highlightColor').value = highlightColor;
    document.getElementById('mapHighlightColor').value = mapHighlightColor;
    document.getElementById('mapHighlightWeight').value = mapHighlightWeight;
    document.getElementById('mapSelectionStyle').value = mapSelectionStyle;
    document.getElementById('dataOpacity').value = dataOpacity;
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    highlightColor = document.getElementById('highlightColor').value;
    mapHighlightColor = document.getElementById('mapHighlightColor').value;
    mapHighlightWeight = parseInt(document.getElementById('mapHighlightWeight').value);
    mapSelectionStyle = document.getElementById('mapSelectionStyle').value;
    dataOpacity = parseFloat(document.getElementById('dataOpacity').value);

    // Update the highlighted row style
    updateHighlightedRowStyle();

    // Update any currently highlighted features on the map
    updateMapHighlights();

    // Update the data layer opacity
    updateDataLayerOpacity();

    closeSettingsModal();
}

function updateHighlightedRowStyle() {
    const style = document.querySelector('style');
    style.textContent = `
        .highlighted-row {
            background-color: ${highlightColor} !important;
            font-weight: bold;
        }
    `;
}

function updateMapHighlights() {
    const highlightedFeatures = workspaceData[currentWorkspace].highlightedFeatures;
    highlightedFeatures.forEach(index => {
        const layer = workspaceData[currentWorkspace].geoJsonLayer.getLayers()[index];
        if (layer) {
            if (mapSelectionStyle === 'fill') {
                layer.setStyle({
                    fillColor: mapHighlightColor,
                    fillOpacity: dataOpacity,
                    weight: 1,
                    color: '#000',
                    opacity: 1
                });
            } else { // 'outline'
                const originalStyle = layer.feature.properties.originalStyle || {};
                layer.setStyle({
                    fillColor: originalStyle.fillColor || layer.options.fillColor,
                    fillOpacity: dataOpacity,
                    weight: mapHighlightWeight,
                    color: mapHighlightColor,
                    opacity: 1
                });
            }
        }
    });
}

function updateDataLayerOpacity() {
    if (workspaceData[currentWorkspace].geoJsonLayer) {
        workspaceData[currentWorkspace].geoJsonLayer.setStyle({
            fillOpacity: dataOpacity
        });
    }
}

function toggleHighlight(index) {
    const highlightedFeatures = workspaceData[currentWorkspace].highlightedFeatures;
    const layer = workspaceData[currentWorkspace].geoJsonLayer.getLayers()[index];
    
    if (highlightedFeatures.has(index)) {
        highlightedFeatures.delete(index);
        if (layer) {
            workspaceData[currentWorkspace].geoJsonLayer.resetStyle(layer);
        }
        unhighlightTableRow(index);
    } else {
        highlightedFeatures.add(index);
        if (layer) {
            // Store the original style if not already stored
            if (!layer.feature.properties.originalStyle) {
                layer.feature.properties.originalStyle = {
                    fillColor: layer.options.fillColor,
                    fillOpacity: layer.options.fillOpacity,
                    weight: layer.options.weight,
                    color: layer.options.color,
                    opacity: layer.options.opacity
                };
            }

            if (mapSelectionStyle === 'fill') {
                layer.setStyle({
                    fillColor: mapHighlightColor,
                    fillOpacity: dataOpacity,
                    weight: 1,
                    color: '#000',
                    opacity: 1
                });
            } else { // 'outline'
                layer.setStyle({
                    fillColor: layer.feature.properties.originalStyle.fillColor,
                    fillOpacity: dataOpacity,
                    weight: mapHighlightWeight,
                    color: mapHighlightColor,
                    opacity: 1
                });
            }
            layer.bringToFront();
        }
        highlightTableRow(index);
    }
}


// ------------------------------------------------------------------------------------------------------------------------------------

function addHighlightedRowStyle() {
    const style = document.createElement('style');
    style.textContent = `
        .highlighted-row {
            background-color: #e6e6fa !important; /* Light purple */
            font-weight: bold;
        }
    `;
    document.head.appendChild(style);
}
// ------------------------------------------------------------------------------------------------------------------------------------

function getColor(value, min, max) {
    const ratio = (value - min) / (max - min);
    const hue = (1 - ratio) * 60; // 60 for yellow, 0 for red
    return `hsl(${hue}, 100%, 50%)`;
}
// ------------------------------------------------------------------------------------------------------------------------------------

function toggleSecondaryNav() {
    var secondarySidebar = document.getElementById("secondarySidebar");
    var importSection = document.getElementById("importSection");
    var main = document.getElementById("main");
    if (secondarySidebar.style.width === "12em") {
        secondarySidebar.style.width = "0";
        main.style.marginLeft = "3em"; // Just the width of the main sidebar
        importSection.style.display = "none";
    } else {
        secondarySidebar.style.width = "12em";
        main.style.marginLeft = "15em"; // 3em (main sidebar) + 12em (secondary sidebar)
    }
}
// ------------------------------------------------------------------------------------------------------------------------------------

function readFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}
// ------------------------------------------------------------------------------------------------------------------------------------

function processShapefile() {
    const shpFile = document.getElementById('shpFile').files[0];
    const dbfFile = document.getElementById('dbfFile').files[0];

    if (!shpFile || !dbfFile) {
        alert('Please select both .shp and .dbf files');
        return;
    }

    Promise.all([readFile(shpFile), readFile(dbfFile)])
        .then(([shpBuffer, dbfBuffer]) => {
            shapefile.read(shpBuffer, dbfBuffer)
                .then(geojson => {
                    console.log('GeoJSON created successfully:', geojson);
                    workspaceData[currentWorkspace].geojson = geojson;
                    populateFileVariablesList(shpFile.name, geojson.features[0].properties);
                    alert('Files processed successfully. Click on Visualizations button to view.');
                })
                .catch(error => {
                    console.error('Error processing shapefile:', error);
                    alert('Error processing shapefile. Please check the console for details.');
                });
        }).catch(error => {
            console.error('Error reading files:', error);
            alert('Error reading files. Please check the console for details.');
        });
}

// ------------------------------------------------------------------------------------------------------------------------------------

function populateFileVariablesList(fileName, properties) {
    const fileNameElement = document.getElementById('fileName');
    const variableList = document.getElementById('variableList');
    const fileVariablesSection = document.getElementById('fileVariablesSection');
    const fileNameToggle = document.getElementById('fileNameToggle');

    fileNameElement.textContent = fileName;
    variableList.innerHTML = '';

    for (let prop in properties) {
        let li = document.createElement('li');
        li.textContent = prop;
        variableList.appendChild(li);
    }

    fileVariablesSection.style.display = 'block';

    // Add click event to toggle the list
    fileNameToggle.addEventListener('click', function() {
        variableList.style.display = variableList.style.display === 'none' ? 'block' : 'none';
        fileNameToggle.querySelector('i').classList.toggle('fa-chevron-down');
        fileNameToggle.querySelector('i').classList.toggle('fa-chevron-up');
    });
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showImportOptions() {
    var secondarySidebar = document.getElementById("secondarySidebar");
    var importSection = document.getElementById("importSection");
    var fileVariablesSection = document.getElementById("fileVariablesSection");
    var visualizationButtons = document.getElementById("visualizationButtons");
    var main = document.getElementById("main");

    // Show the secondary sidebar if it's not already visible
    if (secondarySidebar.style.width !== "12em") {
        secondarySidebar.style.width = "12em";
        main.style.marginLeft = "15em"; // Adjusted margin to account for both sidebars
    }

    // Show the import section and hide other sections
    importSection.style.display = "block";
    fileVariablesSection.style.display = "none";
    visualizationButtons.style.display = "none";
}
// ------------------------------------------------------------------------------------------------------------------------------------

function showVisualizationOptions() {
    var secondarySidebar = document.getElementById("secondarySidebar");
    var importSection = document.getElementById("importSection");
    var fileVariablesSection = document.getElementById("fileVariablesSection");
    var visualizationButtons = document.getElementById("visualizationButtons");
    var main = document.getElementById("main");

    // Show the secondary sidebar if it's not already visible
    if (secondarySidebar.style.width !== "12em") {
        secondarySidebar.style.width = "12em";
        main.style.marginLeft = "15em";
    }

    // Show the visualization buttons and hide other sections
    importSection.style.display = "none";
    fileVariablesSection.style.display = "none";
    visualizationButtons.style.display = "block";
}
// ------------------------------------------------------------------------------------------------------------------------------------

function handlePolygonClick(layer) {
    workspaceData[currentWorkspace].geoJsonLayer.resetStyle();
    layer.setStyle({
        weight: 5,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
    });
    layer.bringToFront();
    const index = workspaceData[currentWorkspace].geoJsonLayer.getLayers().indexOf(layer);
    highlightTableRow(index);
}
// ------------------------------------------------------------------------------------------------------------------------------------

function highlightTableRow(objectId) {
    const tableContainer = document.getElementById(`tableContainer${currentWorkspace}`);
    const table = tableContainer.querySelector('table');
    if (!table) {
        console.error("Table not found in container");
        return;
    }

    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');

    console.log("Number of rows in table:", rows.length);

    // Remove highlight from all rows
    rows.forEach(row => row.classList.remove('highlighted-row'));

    // Find the matching row and highlight it
    let matchFound = false;
    rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        const rowObjectId = cells[0].textContent; // Assuming ObjectId is in the first column
        if (rowObjectId === objectId.toString()) {
            console.log("Match found at row:", index);
            row.classList.add('highlighted-row');
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            matchFound = true;
        }
    });

    if (!matchFound) {
        console.error("No matching row found for ObjectId:", objectId);
    }
}
// ------------------------------------------------------------------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', function() {
    addHighlightedRowStyle();

    // Close the settings modal when clicking outside of it
    window.onclick = function(event) {
        if (event.target == document.getElementById('settingsModal')) {
            closeSettingsModal();
        }
    }
    
    // Close the settings modal when clicking the close button
    document.querySelector('.close').onclick = closeSettingsModal;
});

function highlightTableRow(index) {
    const rowToHighlight = document.getElementById(`row-${index}`);
    if (rowToHighlight) {
        rowToHighlight.classList.add('highlighted');
        rowToHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function unhighlightTableRow(index) {
    const rowToUnhighlight = document.getElementById(`row-${index}`);
    if (rowToUnhighlight) {
        rowToUnhighlight.classList.remove('highlighted');
    }
}

function resetAllHighlights() {
    const highlightedFeatures = workspaceData[currentWorkspace].highlightedFeatures;
    highlightedFeatures.forEach(index => {
        const layer = workspaceData[currentWorkspace].geoJsonLayer.getLayers()[index];
        if (layer) {
            workspaceData[currentWorkspace].geoJsonLayer.resetStyle(layer);
        }
        unhighlightTableRow(index);
    });
    highlightedFeatures.clear();
}

// ------------------------------------------------------------------------------------------------------------------------------------

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    addHighlightedRowStyle();
    // Any other initialization code you might have
});