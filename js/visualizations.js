function renderColorfulMap(geojson) {
    const propertyName = document.getElementById(`propertySelect${currentWorkspace}`).value;
    const map = workspaceData[currentWorkspace].map;

    if (!map) {
        console.error('Map not initialized for workspace', currentWorkspace);
        return;
    }

    // Check if we need to create point features from coordinate columns
    if (geojson.features[0].geometry && geojson.features[0].geometry.type === 'Point') {
        // No need for conversion, points are already correctly formatted
    } else if (geojson.features[0].geometry === null) {
        let latField = 'Lat', lonField = 'Long';
        if (geojson.features[0].properties.hasOwnProperty('Y') && 
            geojson.features[0].properties.hasOwnProperty('X')) {
            latField = 'Y';
            lonField = 'X';
        }

        if (geojson.features[0].properties.hasOwnProperty(latField) && 
            geojson.features[0].properties.hasOwnProperty(lonField)) {

            geojson.features.forEach(feature => {
                const lat = parseFloat(feature.properties[latField]);
                const lon = parseFloat(feature.properties[lonField]);

                // Debugging: Log the coordinates
                console.log(`Lat: ${lat}, Lon: ${lon}`);

                // Validate coordinates
                if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
                    console.error(`Invalid coordinates for feature: ${feature.properties}`);
                    return;
                }

                feature.geometry = {
                    type: "Point",
                    coordinates: [lon, lat]
                };
            });
        } else {
            console.error('Cannot find latitude and longitude fields');
            alert('Error: Cannot find latitude and longitude fields in the data');
            return;
        }
    }

    const values = geojson.features.map(f => f.properties[propertyName]);
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Store min and max values in workspaceData
    workspaceData[currentWorkspace].min = min;
    workspaceData[currentWorkspace].max = max;

    if (workspaceData[currentWorkspace].geoJsonLayer) {
        map.removeLayer(workspaceData[currentWorkspace].geoJsonLayer);
    }

    workspaceData[currentWorkspace].geoJsonLayer = L.geoJSON(geojson, {
        pointToLayer: function(feature, latlng) {
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: getColor(feature.properties[propertyName], min, max),
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: dataOpacity
            });
        },
        style: function(feature) {
            const style = {
                fillColor: getColor(feature.properties[propertyName], min, max),
                weight: 2,
                opacity: 1,
                color: 'white',
                fillOpacity: dataOpacity
            };
            // Store the original style
            feature.properties.originalStyle = {...style};
            return style;
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties) {
                layer.bindPopup(Object.keys(feature.properties)
                    .filter(key => key !== 'originalStyle') // Filter out originalStyle
                    .map(key => 
                        `<strong>${key}:</strong> ${feature.properties[key]}`
                    ).join('<br>'));
            }
            layer.on('click', function() {
                const index = geojson.features.indexOf(feature);
                toggleHighlight(index);
            });
        }
    }).addTo(map);
    
    map.fitBounds(workspaceData[currentWorkspace].geoJsonLayer.getBounds());
    
    // Add or update legend
    if (workspaceData[currentWorkspace].legend) {
        map.removeControl(workspaceData[currentWorkspace].legend);
    }
    workspaceData[currentWorkspace].legend = L.control({position: 'bottomright'});
    workspaceData[currentWorkspace].legend.onAdd = function (map) {
        const div = L.DomUtil.create('div', 'info legend');
        const grades = [min, min + (max-min)/4, min + (max-min)/2, min + 3*(max-min)/4, max];
        div.innerHTML += `<h4>${propertyName}</h4>`;
        for (let i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i], min, max) + '"></i> ' +
                grades[i].toFixed(2) + (grades[i + 1] ? '&ndash;' + grades[i + 1].toFixed(2) + '<br>' : '+');
        }
        return div;
    };
    workspaceData[currentWorkspace].legend.addTo(map);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showMap() {
    console.log("Showing Map");
    resetAllHighlights();
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    document.getElementById(`map${currentWorkspace}`).style.display = 'block';
    document.getElementById(`histogram${currentWorkspace}`).style.display = 'none';
    document.getElementById(`tableContainer${currentWorkspace}`).style.display = 'none';
    
    const propertySelectContainer = document.getElementById(`propertySelectContainer${currentWorkspace}`);
    propertySelectContainer.style.display = 'block';
    
    // Initialize map if it doesn't exist
    if (!workspaceData[currentWorkspace].map) {
        const mapContainer = document.getElementById(`map${currentWorkspace}`);
        if (mapContainer) {
            workspaceData[currentWorkspace].map = L.map(`map${currentWorkspace}`).setView([0, 0], 2);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(workspaceData[currentWorkspace].map);

            // Add settings button to the map
            // Add settings button to the map
            const settingsButton = L.control({position: 'topright'});
            settingsButton.onAdd = function(map) {
                const button = L.DomUtil.create('button', 'leaflet-bar leaflet-control');
                button.innerHTML = '<i class="fas fa-cog"></i>';
                button.setAttribute('id', 'settingsButton');
                button.setAttribute('title', 'Settings');
                button.style.backgroundColor = 'white';
                button.style.width = '30px';
                button.style.height = '30px';
                button.style.border = 'none';
                button.style.cursor = 'pointer';
                button.onclick = openSettingsModal;
                return button;
            };
            settingsButton.addTo(workspaceData[currentWorkspace].map);
        } else {
            console.error(`Map container not found for workspace ${currentWorkspace}`);
            return;
        }
    }

    // Populate property select if it hasn't been done yet
    if (propertySelectContainer.children.length === 0) {
        populatePropertySelect(workspaceData[currentWorkspace].geojson.features[0].properties);
    }

    // Render the map
    renderColorfulMap(workspaceData[currentWorkspace].geojson);

    // Invalidate map size to ensure proper rendering
    setTimeout(() => {
        workspaceData[currentWorkspace].map.invalidateSize();
    }, 100);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function renderTable() {
    console.log("Showing Table");
    resetAllHighlights(); 
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const tableContainer = document.getElementById(`tableContainer${currentWorkspace}`);
    const geojson = workspaceData[currentWorkspace].geojson;

    // Create table element
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const properties = geojson.features[0].properties;
    for (let prop in properties) {
        if (prop !== 'originalStyle') { // Skip originalStyle
            const th = document.createElement('th');
            th.textContent = prop;
            headerRow.appendChild(th);
        }
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    geojson.features.forEach((feature, index) => {
        const row = document.createElement('tr');
        row.id = `row-${index}`;
        for (let prop in feature.properties) {
            if (prop !== 'originalStyle') { // Skip originalStyle
                const td = document.createElement('td');
                td.textContent = feature.properties[prop];
                row.appendChild(td);
            }
        }
        row.addEventListener('click', function() {
            toggleHighlight(index);
        });
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // Clear the container and add the new table
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showTable() {
    console.log("Showing Table");
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const mapElement = document.getElementById(`map${currentWorkspace}`);
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    const tableContainer = document.getElementById(`tableContainer${currentWorkspace}`);
    const propertySelectContainer = document.getElementById(`propertySelectContainer${currentWorkspace}`);

    // Show the table container without hiding the map
    tableContainer.style.display = 'block';

    // Keep the map visible
    mapElement.style.display = 'block';

    // Hide histogram if it's visible
    histogramElement.style.display = 'none';

    // Keep property select visible for the map
    propertySelectContainer.style.display = 'block';

    // Render the table
    renderTable();
}

// ------------------------------------------------------------------------------------------------------------------------------------

function selectHistogramProperty() {
    console.log("Showing Histogram");
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const mapElement = document.getElementById(`map${currentWorkspace}`);
    const histogramElement = document.getElementById(`histogram${currentWorkspace}`);
    const tableContainer = document.getElementById(`tableContainer${currentWorkspace}`);
    const propertySelectContainer = document.getElementById(`propertySelectContainer${currentWorkspace}`);
    const histogramPropertySelectContainer = document.getElementById(`histogramPropertySelectContainer${currentWorkspace}`);

    // Show all elements
    mapElement.style.display = 'block';
    histogramElement.style.display = 'block';
    tableContainer.style.display = 'block';
    propertySelectContainer.style.display = 'block';
    histogramPropertySelectContainer.style.display = 'block';

    // Populate histogram property select if it hasn't been done yet
    if (histogramPropertySelectContainer.children.length === 0) {
        populateHistogramPropertySelect(workspaceData[currentWorkspace].geojson.features[0].properties);
    }

    // Render the histogram
    renderHistogram();
}

// ------------------------------------------------------------------------------------------------------------------------------------

function renderHistogram() {
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const geojson = workspaceData[currentWorkspace].geojson;
    const histogramPropertySelect = document.getElementById(`histogramPropertySelect${currentWorkspace}`);
    
    if (!histogramPropertySelect) {
        console.error('Histogram property select not found');
        return;
    }

    const property = histogramPropertySelect.value;
    const values = geojson.features.map(f => f.properties[property]).filter(v => !isNaN(v));

    // Calculate the number of bins (Sturges' formula)
    const binCount = Math.ceil(Math.log2(values.length)) + 1;

    // Create histogram data
    const trace = {
        x: values,
        type: 'histogram',
        nbinsx: binCount,
        marker: {
            color: 'rgba(100, 150, 200, 0.7)',
            line: {
                color: 'rgba(100, 150, 200, 1)',
                width: 1
            }
        }
    };

    const layout = {
        title: `Histogram of ${property}`,
        xaxis: { title: property },
        yaxis: { title: 'Count' },
        bargap: 0.05
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [trace], layout);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showScatterPlot() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length < 2) {
        alert('At least two numeric properties are required for a scatter plot.');
        return;
    }

    // Create property selection dropdowns
    const xProperty = prompt('Select X-axis property:', numericProperties.join(', '));
    const yProperty = prompt('Select Y-axis property:', numericProperties.join(', '));

    if (!xProperty || !yProperty) return;

    const data = geojson.features.map(feature => ({
        x: feature.properties[xProperty],
        y: feature.properties[yProperty]
    }));

    const layout = {
        title: `Scatter Plot: ${xProperty} vs ${yProperty}`,
        xaxis: { title: xProperty },
        yaxis: { title: yProperty }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        type: 'scatter',
        mode: 'markers',
        x: data.map(d => d.x),
        y: data.map(d => d.y)
    }], layout);

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        type: 'scatter',
        mode: 'markers',
        x: data.map(d => d.x),
        y: data.map(d => d.y)
    }], layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showCumulativeDistribution() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length === 0) {
        alert('No numeric properties found for cumulative distribution plot.');
        return;
    }

    const property = prompt('Select property for cumulative distribution:', numericProperties.join(', '));
    if (!property) return;

    const values = geojson.features.map(feature => feature.properties[property]).sort((a, b) => a - b);
    const cdf = values.map((_, index) => (index + 1) / values.length);

    const layout = {
        title: `Cumulative Distribution: ${property}`,
        xaxis: { title: property },
        yaxis: { title: 'Cumulative Probability' }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        x: values,
        y: cdf,
        type: 'scatter',
        mode: 'lines',
        name: 'CDF'
    }], layout);

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        x: values,
        y: cdf,
        type: 'scatter',
        mode: 'lines',
        name: 'CDF'
    }], layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showHeatmap() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length < 2) {
        alert('At least two numeric properties are required for a heatmap.');
        return;
    }

    const data = numericProperties.map(prop => 
        geojson.features.map(feature => feature.properties[prop])
    );

    const layout = {
        title: 'Heatmap of Numeric Properties',
        xaxis: { title: 'Properties' },
        yaxis: { title: 'Features' }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        z: data,
        type: 'heatmap',
        x: numericProperties,
        y: geojson.features.map((_, index) => `Feature ${index + 1}`)
    }], layout);

    Plotly.newPlot(`histogram${currentWorkspace}`, [{
        z: data,
        type: 'heatmap',
        x: numericProperties,
        y: geojson.features.map((_, index) => `Feature ${index + 1}`)
    }], layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function showBoxPlot() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length === 0) {
        alert('No numeric properties found for box plot.');
        return;
    }

    const data = numericProperties.map(prop => ({
        y: geojson.features.map(feature => feature.properties[prop]),
        type: 'box',
        name: prop
    }));

    const layout = {
        title: 'Box Plot of Numeric Properties',
        yaxis: { title: 'Values' }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, data, layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function show3DScatter() {
    const geojson = workspaceData[currentWorkspace].geojson;
    if (!geojson) {
        alert('Please import data first.');
        return;
    }

    const properties = geojson.features[0].properties;
    const numericProperties = Object.keys(properties).filter(prop => typeof properties[prop] === 'number');

    if (numericProperties.length < 3) {
        alert('At least three numeric properties are required for a 3D scatter plot.');
        return;
    }

    const xProperty = prompt('Select X-axis property:', numericProperties.join(', '));
    const yProperty = prompt('Select Y-axis property:', numericProperties.join(', '));
    const zProperty = prompt('Select Z-axis property:', numericProperties.join(', '));

    if (!xProperty || !yProperty || !zProperty) return;

    const data = [{
        x: geojson.features.map(feature => feature.properties[xProperty]),
        y: geojson.features.map(feature => feature.properties[yProperty]),
        z: geojson.features.map(feature => feature.properties[zProperty]),
        mode: 'markers',
        type: 'scatter3d',
        marker: { size: 5 }
    }];

    const layout = {
        title: '3D Scatter Plot',
        scene: {
            xaxis: { title: xProperty },
            yaxis: { title: yProperty },
            zaxis: { title: zProperty }
        }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, data, layout).then(optimizePlotlyCanvases);
}

// ------------------------------------------------------------------------------------------------------------------------------------

function optimizePlotlyCanvases() {
    // Select all canvas elements within Plotly containers
    const canvases = document.querySelectorAll('.plotly-graph-div canvas');
    
    // Set willReadFrequently attribute to true for each canvas
    canvases.forEach(canvas => {
        canvas.willReadFrequently = true;
    });
}