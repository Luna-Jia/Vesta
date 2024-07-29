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
let mapHighlightWeight = 2;
let mapSelectionStyle = 'outline'; // 'fill' or 'outline'
let dataOpacity = 0.7;

//-------------------------------------------------------------------------------------------------------------------------

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'block';
    document.getElementById('highlightColor').value = highlightColor;
    document.getElementById('mapHighlightColor').value = mapHighlightColor;
    document.getElementById('mapHighlightWeight').value = mapHighlightWeight;
    document.getElementById('mapSelectionStyle').value = mapSelectionStyle;
    document.getElementById('dataOpacity').value = dataOpacity;

    // Position the modal near the settings button
    const settingsButton = document.getElementById('settingsIcon1');
    const buttonRect = settingsButton.getBoundingClientRect();
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.position = 'absolute';
    modalContent.style.top = `${buttonRect.bottom + 10}px`;
    modalContent.style.right = `${window.innerWidth - buttonRect.right}px`;
}

//-------------------------------------------------------------------------------------------------------------------------

function closeSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

//-------------------------------------------------------------------------------------------------------------------------

function updateHighlightedRowStyle() {
    const style = document.querySelector('style#highlightedRowStyle');
    if (style) {
        style.textContent = `
            .highlighted-row {
                background-color: ${highlightColor} !important;
                font-weight: bold;
            }
        `;
    } else {
        const newStyle = document.createElement('style');
        newStyle.id = 'highlightedRowStyle';
        newStyle.textContent = `
            .highlighted-row {
                background-color: ${highlightColor} !important;
                font-weight: bold;
            }
        `;
        document.head.appendChild(newStyle);
    }
}

//-------------------------------------------------------------------------------------------------------------------------

function saveSettings() {
    const newHighlightColor = document.getElementById('highlightColor').value;
    const newMapHighlightColor = document.getElementById('mapHighlightColor').value;
    const newMapHighlightWeight = parseInt(document.getElementById('mapHighlightWeight').value);
    const newMapSelectionStyle = document.getElementById('mapSelectionStyle').value;
    const newDataOpacity = parseFloat(document.getElementById('dataOpacity').value);

    // Check which settings have changed
    const colorChanged = newMapHighlightColor !== mapHighlightColor;
    const styleChanged = newMapSelectionStyle !== mapSelectionStyle || newMapHighlightWeight !== mapHighlightWeight;
    const opacityChanged = newDataOpacity !== dataOpacity;

    // Update global variables
    highlightColor = newHighlightColor;
    mapHighlightColor = newMapHighlightColor;
    mapHighlightWeight = newMapHighlightWeight;
    mapSelectionStyle = newMapSelectionStyle;
    dataOpacity = newDataOpacity;

    // Update the highlighted row style
    updateHighlightedRowStyle();

    // Update map highlights based on what changed
    if (colorChanged) {
        updateHighlightedPolygonsFillColor();
    } else if (styleChanged || opacityChanged) {
        updateMapHighlights(colorChanged, styleChanged, opacityChanged);
    }

    // Update the data layer opacity if it changed
    if (opacityChanged) {
        updateDataLayerOpacity();
    }

    // Close the modal
    closeSettingsModal();
}

//-------------------------------------------------------------------------------------------------------------------------

function updateHighlightedPolygonsFillColor() {
    const highlightedFeatures = workspaceData[currentWorkspace].highlightedFeatures;
    highlightedFeatures.forEach(index => {
        const layer = workspaceData[currentWorkspace].geoJsonLayer.getLayers()[index];
        if (layer) {
            layer.setStyle({
                fillColor: mapHighlightColor,
                // Maintain other styles
                weight: 2,
                color: 'white',
                opacity: 1,
                fillOpacity: dataOpacity
            });
        }
    });
}

//-------------------------------------------------------------------------------------------------------------------------

function updateMapHighlights(colorChanged, styleChanged, opacityChanged) {
    const highlightedFeatures = workspaceData[currentWorkspace].highlightedFeatures;
    highlightedFeatures.forEach(index => {
        const layer = workspaceData[currentWorkspace].geoJsonLayer.getLayers()[index];
        if (layer) {
            const originalStyle = layer.feature.properties.originalStyle || {};
            const newStyle = {};

            if (mapSelectionStyle === 'fill') {
                newStyle.fillColor = mapHighlightColor;
                newStyle.weight = 2;
                newStyle.color = 'white';
            } else { // 'outline'
                newStyle.fillColor = originalStyle.fillColor || layer.options.fillColor;
                newStyle.weight = mapHighlightWeight;
                newStyle.color = mapHighlightColor;
            }

            if (opacityChanged) {
                newStyle.fillOpacity = dataOpacity;
            }

            // Apply the new style
            layer.setStyle(newStyle);
        }
    });
}

function updateHistogramSelection() {
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    if (histogramElement && histogramElement.data) {
        const selectedProperty = document.getElementById(`histogramPropertySelect${currentWorkspace}`).value;
        const selectedPoints = workspaceData[currentWorkspace].geojson.features.map((feature, i) => 
            workspaceData[currentWorkspace].highlightedFeatures.has(i) ? i : null
        ).filter(i => i !== null);

        Plotly.restyle(histogramElement, {
            selectedpoints: [selectedPoints]
        });
    }
}

//-------------------------------------------------------------------------------------------------------------------------

function toggleHighlight(index) {
    const highlightedFeatures = workspaceData[currentWorkspace].highlightedFeatures;
    const layer = workspaceData[currentWorkspace].geoJsonLayer.getLayers()[index];
    
    if (highlightedFeatures.has(index)) {
        highlightedFeatures.delete(index);
        if (layer) {
            // Reset to original style
            const originalStyle = layer.feature.properties.originalStyle;
            layer.setStyle({
                fillColor: originalStyle.fillColor,
                fillOpacity: dataOpacity,
                weight: 2,
                color: 'white',
                opacity: 1
            });
        }
        unhighlightTableRow(index);
    } else {
        highlightedFeatures.add(index);
        if (layer) {
            if (mapSelectionStyle === 'fill') {
                layer.setStyle({
                    fillColor: mapHighlightColor,
                    fillOpacity: dataOpacity,
                    weight: 2,
                    color: 'white',
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

    // Update histogram selection
    updateHistogramSelection();
    // Update histogram highlight
    updateHistogramHighlight(workspaceData[currentWorkspace].highlightedFeatures);
}

function updateDataLayerOpacity() {
    if (workspaceData[currentWorkspace].geoJsonLayer) {
        workspaceData[currentWorkspace].geoJsonLayer.setStyle({
            fillOpacity: dataOpacity
        });
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

//-------------------------------------------------------------------------------------------------------------------------

function highlightTableRow(index) {
    const rowToHighlight = document.getElementById(`row-${index}`);
    if (rowToHighlight) {
        rowToHighlight.classList.add('highlighted-row');
    }
}

//-------------------------------------------------------------------------------------------------------------------------

function unhighlightTableRow(index) {
    const rowToUnhighlight = document.getElementById(`row-${index}`);
    if (rowToUnhighlight) {
        rowToUnhighlight.classList.remove('highlighted-row');
    }
}

//-------------------------------------------------------------------------------------------------------------------------

function resetAllHighlights() {
    const highlightedFeatures = workspaceData[currentWorkspace].highlightedFeatures;
    const allLayers = workspaceData[currentWorkspace].geoJsonLayer.getLayers();
    
    allLayers.forEach((layer, index) => {
        const originalStyle = layer.feature.properties.originalStyle;
        layer.setStyle({
            fillColor: originalStyle.fillColor,
            fillOpacity: dataOpacity,
            weight: 2,
            color: 'white',
            opacity: 1
        });
        unhighlightTableRow(index);
    });

    highlightedFeatures.clear();

    // Reset histogram colors
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    if (histogramElement && histogramElement.data) {
        Plotly.restyle(histogramElement, {
            'marker.color': 'rgba(31, 119, 180, 0.7)'
        });
    }
}

function updateHistogramHighlight(selectedIndices) {
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    if (histogramElement && histogramElement.data) {
        const colors = histogramElement.data[0].customdata.map(binData => {
            const binSelectedCount = binData.indices.filter(index => selectedIndices.has(index)).length;
            const binTotalCount = binData.count;
            const ratio = binSelectedCount / binTotalCount;
            return `rgba(31, 119, 180, ${0.7 + (0.3 * ratio)})`;
        });

        Plotly.restyle(histogramElement, {
            'marker.color': [colors]
        });
    }
}

function handleHistogramSelection(eventData) {
    if (!eventData || !eventData.points || eventData.points.length === 0) {
        resetAllHighlights();
        return;
    }

    const selectedIndices = new Set();

    eventData.points.forEach(point => {
        if (point.customdata) {
            const binData = point.customdata;
            binData.indices.forEach(index => selectedIndices.add(index));
        } else {
            console.warn('Customdata not found for histogram bar', point);
        }
    });

    highlightSelectedFeatures(selectedIndices);
}

function highlightSelectedFeatures(selectedIndices) {
    // Reset all highlights first
    resetAllHighlights();

    // Highlight selected features on map and table
    selectedIndices.forEach(index => {
        toggleHighlight(index);
    });

    // Update workspaceData to reflect new selections
    workspaceData[currentWorkspace].highlightedFeatures = selectedIndices;
}
// ------------------------------------------------------------------------------------------------------------------------------------

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    addHighlightedRowStyle();
    // Any other initialization code you might have
});

//-------------------------------------------------------------------------------------------------------------------------

window.addEventListener('resize', function() {
    const modal = document.getElementById('settingsModal');
    if (modal.style.display === 'block') {
        // The modal is open, so we need to recenter it
        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.left = '50%';
        modalContent.style.top = '50%';
        modalContent.style.transform = 'translate(-50%, -50%)';
    }
});