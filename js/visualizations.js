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
                fillOpacity: 0.8
            });
        },
        style: function(feature) {
            return {
                fillColor: getColor(feature.properties[propertyName], min, max),
                weight: 2,
                opacity: 1,
                color: 'white',
                fillOpacity: 0.7
            };
        },
        onEachFeature: function(feature, layer) {
            if (feature.properties) {
                layer.bindPopup(Object.keys(feature.properties).map(key => 
                    `<strong>${key}:</strong> ${feature.properties[key]}`
                ).join('<br>'));
            }
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

function renderTable() {
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
        const th = document.createElement('th');
        th.textContent = prop;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    geojson.features.forEach(feature => {
        const row = document.createElement('tr');
        for (let prop in feature.properties) {
            const td = document.createElement('td');
            td.textContent = feature.properties[prop];
            row.appendChild(td);
        }
        tbody.appendChild(row);
    });
    table.appendChild(tbody);

    // Clear the container and add the new table
    tableContainer.innerHTML = '';
    tableContainer.appendChild(table);
}

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

function showMap() {
    console.log("Showing Map");
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

    // Show all elements
    mapElement.style.display = 'block';
    histogramElement.style.display = 'block';
    tableContainer.style.display = 'block';
    propertySelectContainer.style.display = 'block';

    // Render the histogram
    renderHistogram();
}

function renderHistogram() {
    if (!workspaceData[currentWorkspace].geojson) {
        alert('Please upload and process a shapefile first.');
        return;
    }

    const geojson = workspaceData[currentWorkspace].geojson;
    const propertySelect = document.getElementById(`propertySelect${currentWorkspace}`);
    
    if (!propertySelect) {
        console.error('Property select not found');
        return;
    }

    const yProperty = propertySelect.value;
    const xProperty = geojson.features[0].properties.hasOwnProperty('ID') ? 'ID' : 
                    geojson.features[0].properties.hasOwnProperty('Object Id') ? 'Object Id' : 
                    Object.keys(geojson.features[0].properties)[0];

    const xValues = geojson.features.map(f => f.properties[xProperty]);
    const yValues = geojson.features.map(f => f.properties[yProperty]);

    const trace = {
        x: xValues,
        y: yValues,
        type: 'bar'
    };

    const layout = {
        title: `Histogram of ${yProperty}`,
        xaxis: { title: xProperty },
        yaxis: { title: yProperty }
    };

    Plotly.newPlot(`histogram${currentWorkspace}`, [trace], layout);
}

function showScatterPlot() {
    console.log("Showing Scatter Plot");
    // Implement scatter plot visualization
}

function showCumulativeDistribution() {
    console.log("Showing Cumulative Distribution Plot");
    // Implement cumulative distribution plot
}

function showHeatmap() {
    console.log("Showing Heatmap");
    // Implement heatmap visualization
}

function showBoxPlot() {
    console.log("Showing Box Plot");
    // Implement box plot visualization
}

function show3DScatter() {
    console.log("Showing 3D Scatter");
    // Implement 3D scatter plot visualization
}